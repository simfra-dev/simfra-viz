import {
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { InfraNode } from "../types";

export interface ResourceMetrics {
  resourceId: string;
  requests?: number;
  errors?: number;
  errorRate?: number;
}

/**
 * Fetches key CloudWatch metrics for resources on the graph.
 * Returns per-resource request counts and error counts for the last hour.
 */
export async function collectResourceMetrics(
  client: CloudWatchClient,
  nodes: InfraNode[],
): Promise<ResourceMetrics[]> {
  const queries: MetricDataQuery[] = [];
  const queryToResource = new Map<string, { resourceId: string; type: "requests" | "errors" }>();

  let queryIdx = 0;

  for (const node of nodes) {
    const metrics = metricsForResource(node);
    if (!metrics) continue;

    for (const m of metrics) {
      const id = `q${queryIdx++}`;
      queryToResource.set(id, { resourceId: node.id, type: m.type });
      queries.push({
        Id: id,
        MetricStat: {
          Metric: {
            Namespace: m.namespace,
            MetricName: m.metricName,
            Dimensions: m.dimensions.map((d) => ({
              Name: d.name,
              Value: d.value,
            })),
          },
          Period: 3600,
          Stat: "Sum",
        },
      });
    }
  }

  if (queries.length === 0) return [];

  // CloudWatch GetMetricData supports max 500 queries
  const results = new Map<string, { requests: number; errors: number }>();

  // Process in batches of 100
  for (let i = 0; i < queries.length; i += 100) {
    const batch = queries.slice(i, i + 100);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const response = await client
      .send(
        new GetMetricDataCommand({
          MetricDataQueries: batch,
          StartTime: oneHourAgo,
          EndTime: now,
        }),
      )
      .catch(() => ({ MetricDataResults: [] }));

    for (const result of response.MetricDataResults ?? []) {
      const mapping = queryToResource.get(result.Id ?? "");
      if (!mapping) continue;

      const sum = (result.Values ?? []).reduce((a, b) => a + b, 0);
      const existing = results.get(mapping.resourceId) ?? { requests: 0, errors: 0 };

      if (mapping.type === "requests") {
        existing.requests += sum;
      } else {
        existing.errors += sum;
      }

      results.set(mapping.resourceId, existing);
    }
  }

  return Array.from(results.entries()).map(([resourceId, data]) => ({
    resourceId,
    requests: data.requests,
    errors: data.errors,
    errorRate: data.requests > 0 ? (data.errors / data.requests) * 100 : 0,
  }));
}

interface MetricDef {
  namespace: string;
  metricName: string;
  dimensions: Array<{ name: string; value: string }>;
  type: "requests" | "errors";
}

function metricsForResource(node: InfraNode): MetricDef[] | null {
  switch (node.resourceType) {
    case "AWS::S3::Bucket":
      return [
        {
          namespace: "AWS/S3",
          metricName: "NumberOfObjects",
          dimensions: [
            { name: "BucketName", value: node.name },
            { name: "StorageType", value: "AllStorageTypes" },
          ],
          type: "requests",
        },
      ];

    case "AWS::Lambda::Function":
      return [
        {
          namespace: "AWS/Lambda",
          metricName: "Invocations",
          dimensions: [{ name: "FunctionName", value: node.name }],
          type: "requests",
        },
        {
          namespace: "AWS/Lambda",
          metricName: "Errors",
          dimensions: [{ name: "FunctionName", value: node.name }],
          type: "errors",
        },
      ];

    case "AWS::SQS::Queue":
      return [
        {
          namespace: "AWS/SQS",
          metricName: "NumberOfMessagesSent",
          dimensions: [{ name: "QueueName", value: node.name }],
          type: "requests",
        },
      ];

    case "AWS::SNS::Topic":
      return [
        {
          namespace: "AWS/SNS",
          metricName: "NumberOfMessagesPublished",
          dimensions: [{ name: "TopicName", value: node.name }],
          type: "requests",
        },
        {
          namespace: "AWS/SNS",
          metricName: "NumberOfNotificationsFailed",
          dimensions: [{ name: "TopicName", value: node.name }],
          type: "errors",
        },
      ];

    case "AWS::CloudFront::Distribution": {
      const distId = node.arn?.split("/").pop();
      if (!distId) return null;
      return [
        {
          namespace: "AWS/CloudFront",
          metricName: "Requests",
          dimensions: [
            { name: "DistributionId", value: distId },
            { name: "Region", value: "Global" },
          ],
          type: "requests",
        },
        {
          namespace: "AWS/CloudFront",
          metricName: "4xxErrorRate",
          dimensions: [
            { name: "DistributionId", value: distId },
            { name: "Region", value: "Global" },
          ],
          type: "errors",
        },
      ];
    }

    case "AWS::DynamoDB::Table":
      return [
        {
          namespace: "AWS/DynamoDB",
          metricName: "ConsumedReadCapacityUnits",
          dimensions: [{ name: "TableName", value: node.name }],
          type: "requests",
        },
      ];

    default:
      return null;
  }
}
