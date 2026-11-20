import { ListBucketsCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import type { InfraNode, CollectorResult } from "../types";

export async function collectS3(
  client: S3Client,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const result = await client
    .send(new ListBucketsCommand({}))
    .catch(() => ({ Buckets: [] }));

  for (const bucket of result.Buckets ?? []) {
    nodes.push({
      id: `arn:aws:s3:::${bucket.Name}`,
      resourceType: "AWS::S3::Bucket",
      service: "s3",
      name: bucket.Name!,
      arn: `arn:aws:s3:::${bucket.Name}`,
      region,
      accountId,
      properties: {
        creationDate: bucket.CreationDate?.toISOString(),
      },
    });
  }

  return { nodes };
}
