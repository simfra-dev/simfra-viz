import type { ConnectionConfig, InfraGraph, TrafficFlow, ProgressCallback, SourceProgress } from "./types";
import {
  createEC2Client,
  createIAMClient,
  createLambdaClient,
  createS3Client,
  createCloudFrontClient,
  createCloudTrailClient,
  createCloudWatchClient,
  createRDSClient,
  createECSClient,
  createEFSClient,
} from "./lib/aws-clients";
import { collectEC2 } from "./collectors/ec2";
import { collectIAM } from "./collectors/iam";
import { collectLambda } from "./collectors/lambda";
import { collectS3 } from "./collectors/s3";
import { collectCloudFront } from "./collectors/cloudfront";
import { collectRDS } from "./collectors/rds";
import { collectECS } from "./collectors/ecs";
import { collectEFS } from "./collectors/efs";
import { collectCloudTrailEvents } from "./collectors/cloudtrail";
import { collectEdgeMetrics } from "./collectors/edge-metrics";
import { inferEdges } from "./relationship-rules";
import { aggregateTrafficFlows } from "./traffic";
import { detectErrors } from "./errors";

export async function buildInfraGraph(
  config: ConnectionConfig,
  accountId: string,
  timeRangeMs: number = 60 * 60 * 1000,
  onProgress?: ProgressCallback,
): Promise<InfraGraph> {
  const sources: SourceProgress[] = [
    { name: "EC2", status: "pending" },
    { name: "IAM", status: "pending" },
    { name: "Lambda", status: "pending" },
    { name: "S3", status: "pending" },
    { name: "CloudFront", status: "pending" },
    { name: "RDS", status: "pending" },
    { name: "ECS", status: "pending" },
    { name: "EFS", status: "pending" },
    { name: "CloudTrail", status: "pending" },
    { name: "Relationships", status: "pending" },
    { name: "Traffic Analysis", status: "pending" },
    { name: "Error Detection", status: "pending" },
    { name: "CloudWatch Metrics", status: "pending" },
  ];

  const emit = () => onProgress?.([...sources]);
  const update = (name: string, status: SourceProgress["status"], detail?: string) => {
    const s = sources.find((s) => s.name === name);
    if (s) {
      s.status = status;
      s.detail = detail;
    }
    emit();
  };

  emit();

  const ec2Client = createEC2Client(config);
  const iamClient = createIAMClient(config);
  const lambdaClient = createLambdaClient(config);
  const s3Client = createS3Client(config);
  const cloudFrontClient = createCloudFrontClient(config);
  const rdsClient = createRDSClient(config);
  const ecsClient = createECSClient(config);
  const efsClient = createEFSClient(config);
  const cloudTrailClient = createCloudTrailClient(config);
  const cloudWatchClient = createCloudWatchClient(config);

  const since = new Date(Date.now() - timeRangeMs);

  // Track each collector individually
  async function tracked<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    update(name, "loading");
    try {
      const result = await fn();
      update(name, "done");
      return result;
    } catch (e) {
      update(name, "error", e instanceof Error ? e.message : "Failed");
      return null;
    }
  }

  // Fetch all resources and events in parallel
  const [ec2, iam, lambda, s3, cloudfront, rds, ecs, efs, trailEvents] = await Promise.all([
    tracked("EC2", () => collectEC2(ec2Client, accountId, config.region)),
    tracked("IAM", () => collectIAM(iamClient, accountId, config.region)),
    tracked("Lambda", () => collectLambda(lambdaClient, accountId, config.region)),
    tracked("S3", () => collectS3(s3Client, accountId, config.region)),
    tracked("CloudFront", () => collectCloudFront(cloudFrontClient, accountId, config.region)),
    tracked("RDS", () => collectRDS(rdsClient, accountId, config.region)),
    tracked("ECS", () => collectECS(ecsClient, accountId, config.region)),
    tracked("EFS", () => collectEFS(efsClient, accountId, config.region)),
    tracked("CloudTrail", () => collectCloudTrailEvents(cloudTrailClient, since)),
  ]);

  const allNodes = [ec2, iam, lambda, s3, cloudfront, rds, ecs, efs]
    .filter((r) => r != null)
    .flatMap((r) => r.nodes);

  // Relationship inference
  update("Relationships", "loading");
  const edges = inferEdges(allNodes);
  update("Relationships", "done", `${edges.length} edges`);

  // Traffic analysis
  update("Traffic Analysis", "loading");
  const trailFlows = aggregateTrafficFlows(trailEvents ?? [], allNodes);
  update("Traffic Analysis", "done", `${trailFlows.length} flows`);

  // Error detection
  update("Error Detection", "loading");
  const errors = detectErrors(trailEvents ?? [], allNodes);
  update("Error Detection", "done", `${errors.length} errors`);

  // CloudWatch edge metrics
  update("CloudWatch Metrics", "loading");
  let metricFlows: TrafficFlow[] = [];
  try {
    metricFlows = await collectEdgeMetrics(cloudWatchClient, allNodes, edges, timeRangeMs);
    update("CloudWatch Metrics", "done", `${metricFlows.length} metric flows`);
  } catch {
    update("CloudWatch Metrics", "error", "Failed");
  }

  const trafficFlows = mergeFlows(trailFlows, metricFlows);

  return {
    nodes: allNodes,
    edges,
    trafficFlows,
    errors,
    metrics: [],
    metadata: {
      accountId,
      region: config.region,
      generatedAt: new Date().toISOString(),
    },
  };
}

function mergeFlows(a: TrafficFlow[], b: TrafficFlow[]): TrafficFlow[] {
  const map = new Map<string, TrafficFlow>();
  for (const f of a) {
    map.set(`${f.sourceArn}|${f.targetArn}|${f.eventName}`, f);
  }
  for (const f of b) {
    const key = `${f.sourceArn}|${f.targetArn}|${f.eventName}`;
    if (!map.has(key)) {
      map.set(key, f);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
