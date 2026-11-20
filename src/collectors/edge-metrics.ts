import {
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { InfraNode, InfraEdge, TrafficFlow } from "../types";

/**
 * Fetches CloudWatch metrics for known data-plane edges where CloudTrail
 * doesn't capture the traffic (e.g., CloudFront→S3 origin requests,
 * Lambda invocations, ALB→target requests).
 *
 * Returns synthetic TrafficFlow entries so they appear as traffic edges on the graph.
 */
export async function collectEdgeMetrics(
  client: CloudWatchClient,
  nodes: InfraNode[],
  edges: InfraEdge[],
  timeRangeMs: number = 60 * 60 * 1000,
): Promise<TrafficFlow[]> {
  const queries: MetricDataQuery[] = [];
  const queryToEdge = new Map<string, { sourceId: string; targetId: string; action: string; type: "requests" | "errors" }>();
  const periodSeconds = Math.max(60, Math.floor(timeRangeMs / 1000));
  let idx = 0;

  const nodeById = new Map<string, InfraNode>();
  for (const n of nodes) {
    nodeById.set(n.id, n);
  }

  // Find data-plane edges to enrich with metrics
  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;

    const metricDefs = getEdgeMetrics(source, target, edge);
    if (!metricDefs) continue;

    for (const def of metricDefs) {
      const id = `e${idx++}`;
      queryToEdge.set(id, {
        sourceId: edge.source,
        targetId: edge.target,
        action: def.action,
        type: def.type,
      });
      queries.push({
        Id: id,
        MetricStat: {
          Metric: {
            Namespace: def.namespace,
            MetricName: def.metricName,
            Dimensions: def.dimensions.map((d) => ({
              Name: d.name,
              Value: d.value,
            })),
          },
          Period: periodSeconds,
          Stat: "Sum",
        },
      });
    }
  }

  if (queries.length === 0) return [];

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - timeRangeMs);

  // Aggregate results per edge
  const edgeData = new Map<string, { requests: number; errors: number; action: string; sourceId: string; targetId: string }>();

  for (let i = 0; i < queries.length; i += 100) {
    const batch = queries.slice(i, i + 100);
    const response = await client
      .send(new GetMetricDataCommand({
        MetricDataQueries: batch,
        StartTime: oneHourAgo,
        EndTime: now,
      }))
      .catch(() => ({ MetricDataResults: [] }));

    for (const result of response.MetricDataResults ?? []) {
      const mapping = queryToEdge.get(result.Id ?? "");
      if (!mapping) continue;

      const sum = (result.Values ?? []).reduce((a, b) => a + b, 0);
      const key = `${mapping.sourceId}|${mapping.targetId}`;
      const existing = edgeData.get(key) ?? {
        requests: 0,
        errors: 0,
        action: mapping.action,
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      };

      if (mapping.type === "requests") {
        existing.requests += sum;
      } else {
        existing.errors += sum;
      }
      edgeData.set(key, existing);
    }
  }

  // Convert to TrafficFlow entries (only if there's actual traffic)
  const flows: TrafficFlow[] = [];
  for (const data of edgeData.values()) {
    if (data.requests === 0 && data.errors === 0) continue;
    flows.push({
      sourceArn: data.sourceId,
      targetArn: data.targetId,
      eventSource: "cloudwatch.amazonaws.com",
      eventName: data.action,
      count: Math.round(data.requests),
      errorCount: Math.round(data.errors),
      lastSeen: new Date().toISOString(),
    });
  }

  return flows;
}

interface MetricDef {
  namespace: string;
  metricName: string;
  dimensions: Array<{ name: string; value: string }>;
  action: string;
  type: "requests" | "errors";
}

function getEdgeMetrics(
  source: InfraNode,
  target: InfraNode,
  edge: InfraEdge,
): MetricDef[] | null {
  // CloudFront → S3 origin
  if (
    source.resourceType === "AWS::CloudFront::Distribution" &&
    target.resourceType === "AWS::S3::Bucket" &&
    edge.relationship === "routes_to"
  ) {
    const distId = source.arn?.split("/").pop();
    if (!distId) return null;
    return [
      {
        namespace: "AWS/CloudFront",
        metricName: "Requests",
        dimensions: [
          { name: "DistributionId", value: distId },
          { name: "Region", value: "Global" },
        ],
        action: "Requests",
        type: "requests",
      },
      {
        namespace: "AWS/CloudFront",
        metricName: "4xxErrorRate",
        dimensions: [
          { name: "DistributionId", value: distId },
          { name: "Region", value: "Global" },
        ],
        action: "Requests",
        type: "errors",
      },
    ];
  }

  // Lambda invocations (when Lambda has a role edge — shows invocation stats)
  if (
    source.resourceType === "AWS::Lambda::Function" &&
    target.resourceType === "AWS::IAM::Role" &&
    edge.relationship === "assumes"
  ) {
    return [
      {
        namespace: "AWS/Lambda",
        metricName: "Invocations",
        dimensions: [{ name: "FunctionName", value: source.name }],
        action: "Invoke",
        type: "requests",
      },
      {
        namespace: "AWS/Lambda",
        metricName: "Errors",
        dimensions: [{ name: "FunctionName", value: source.name }],
        action: "Invoke",
        type: "errors",
      },
    ];
  }

  return null;
}
