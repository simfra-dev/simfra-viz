import {
  DescribeFileSystemsCommand,
  DescribeMountTargetsCommand,
} from "@aws-sdk/client-efs";
import type { EFSClient } from "@aws-sdk/client-efs";
import type { InfraNode, CollectorResult } from "../types";

export async function collectEFS(
  client: EFSClient,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const result = await client
    .send(new DescribeFileSystemsCommand({}))
    .catch(() => ({ FileSystems: [] }));

  for (const fs of result.FileSystems ?? []) {
    const nameTag = fs.Tags?.find((t) => t.Key === "Name")?.Value;
    const fsArn = `arn:aws:elasticfilesystem:${region}:${accountId}:file-system/${fs.FileSystemId}`;

    const mountTargets = await client
      .send(new DescribeMountTargetsCommand({ FileSystemId: fs.FileSystemId }))
      .catch(() => ({ MountTargets: [] }));

    const mts = mountTargets.MountTargets ?? [];
    const vpcId = mts[0]?.VpcId;

    // EFS file system node — parent is VPC
    nodes.push({
      id: fsArn,
      resourceType: "AWS::EFS::FileSystem",
      service: "efs",
      name: nameTag ?? fs.FileSystemId!,
      arn: fsArn,
      region,
      accountId,
      state: fs.LifeCycleState,
      properties: {
        performanceMode: fs.PerformanceMode,
        throughputMode: fs.ThroughputMode,
        encrypted: fs.Encrypted,
        kmsKeyId: fs.KmsKeyId,
        sizeInBytes: fs.SizeInBytes?.Value,
        numberOfMountTargets: fs.NumberOfMountTargets,
        vpcId,
      },
      tags: tagsToMap(fs.Tags),
      parent: vpcId,
    });

    // Mount target ENI nodes — one per subnet
    for (const mt of mts) {
      nodes.push({
        id: mt.MountTargetId!,
        resourceType: "AWS::EC2::NetworkInterface",
        service: "efs",
        name: `${mt.MountTargetId} (EFS)`,
        region,
        accountId,
        state: mt.LifeCycleState,
        properties: {
          fileSystemId: fs.FileSystemId,
          fileSystemArn: fsArn,
          ipAddress: mt.IpAddress,
          networkInterfaceId: mt.NetworkInterfaceId,
          availabilityZoneId: mt.AvailabilityZoneId,
          availabilityZoneName: mt.AvailabilityZoneName,
          vpcId: mt.VpcId,
          subnetId: mt.SubnetId,
        },
        parent: mt.SubnetId,
      });
    }
  }

  return { nodes };
}

function tagsToMap(
  tags?: Array<{ Key?: string; Value?: string }>,
): Record<string, string> | undefined {
  if (!tags || tags.length === 0) return undefined;
  const map: Record<string, string> = {};
  for (const tag of tags) {
    if (tag.Key) map[tag.Key] = tag.Value ?? "";
  }
  return map;
}
