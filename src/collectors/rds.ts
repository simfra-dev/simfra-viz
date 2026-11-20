import {
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from "@aws-sdk/client-rds";
import type { RDSClient } from "@aws-sdk/client-rds";
import type { InfraNode, CollectorResult } from "../types";

export async function collectRDS(
  client: RDSClient,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const [instances, clusters] = await Promise.all([
    client.send(new DescribeDBInstancesCommand({})).catch(() => ({ DBInstances: [] })),
    client.send(new DescribeDBClustersCommand({})).catch(() => ({ DBClusters: [] })),
  ]);

  for (const db of instances.DBInstances ?? []) {
    const vpcId = db.DBSubnetGroup?.VpcId;
    const subnetIds = db.DBSubnetGroup?.Subnets?.map((s) => s.SubnetIdentifier) ?? [];

    nodes.push({
      id: db.DBInstanceArn!,
      resourceType: "AWS::RDS::DBInstance",
      service: "rds",
      name: db.DBInstanceIdentifier!,
      arn: db.DBInstanceArn,
      region,
      accountId,
      state: db.DBInstanceStatus,
      properties: {
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        instanceClass: db.DBInstanceClass,
        storageType: db.StorageType,
        allocatedStorage: db.AllocatedStorage,
        multiAZ: db.MultiAZ,
        publiclyAccessible: db.PubliclyAccessible,
        endpoint: db.Endpoint?.Address,
        port: db.Endpoint?.Port,
        vpcId,
        subnetIds,
        securityGroupIds: db.VpcSecurityGroups?.map((sg) => sg.VpcSecurityGroupId),
        kmsKeyId: db.KmsKeyId,
        storageEncrypted: db.StorageEncrypted,
        clusterIdentifier: db.DBClusterIdentifier,
      },
      tags: tagsToMap(db.TagList),
      parent: vpcId,
    });
  }

  for (const cluster of clusters.DBClusters ?? []) {
    nodes.push({
      id: cluster.DBClusterArn!,
      resourceType: "AWS::RDS::DBCluster",
      service: "rds",
      name: cluster.DBClusterIdentifier!,
      arn: cluster.DBClusterArn,
      region,
      accountId,
      state: cluster.Status,
      properties: {
        engine: cluster.Engine,
        engineVersion: cluster.EngineVersion,
        engineMode: cluster.EngineMode,
        endpoint: cluster.Endpoint,
        readerEndpoint: cluster.ReaderEndpoint,
        port: cluster.Port,
        members: cluster.DBClusterMembers?.map((m) => m.DBInstanceIdentifier),
        kmsKeyId: cluster.KmsKeyId,
        storageEncrypted: cluster.StorageEncrypted,
      },
      tags: tagsToMap(cluster.TagList),
    });
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
