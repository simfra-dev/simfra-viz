import {
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
} from "@aws-sdk/client-ecs";
import type { ECSClient } from "@aws-sdk/client-ecs";
import type { InfraNode, CollectorResult } from "../types";

export async function collectECS(
  client: ECSClient,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const clusterList = await client
    .send(new ListClustersCommand({}))
    .catch(() => ({ clusterArns: [] }));

  const clusterArns = clusterList.clusterArns ?? [];
  if (clusterArns.length === 0) return { nodes };

  const clusterDetails = await client
    .send(new DescribeClustersCommand({ clusters: clusterArns }))
    .catch(() => ({ clusters: [] }));

  for (const cluster of clusterDetails.clusters ?? []) {
    nodes.push({
      id: cluster.clusterArn!,
      resourceType: "AWS::ECS::Cluster",
      service: "ecs",
      name: cluster.clusterName!,
      arn: cluster.clusterArn,
      region,
      accountId,
      state: cluster.status,
      properties: {
        runningTasksCount: cluster.runningTasksCount,
        activeServicesCount: cluster.activeServicesCount,
        registeredContainerInstancesCount: cluster.registeredContainerInstancesCount,
        capacityProviders: cluster.capacityProviders,
      },
      tags: tagsToMap(cluster.tags),
    });

    // Fetch services for this cluster
    const serviceList = await client
      .send(new ListServicesCommand({ cluster: cluster.clusterArn }))
      .catch(() => ({ serviceArns: [] }));

    const serviceArns = serviceList.serviceArns ?? [];
    if (serviceArns.length === 0) continue;

    const serviceDetails = await client
      .send(new DescribeServicesCommand({ cluster: cluster.clusterArn, services: serviceArns }))
      .catch(() => ({ services: [] }));

    for (const svc of serviceDetails.services ?? []) {
      const subnets = svc.networkConfiguration?.awsvpcConfiguration?.subnets ?? [];
      const securityGroups = svc.networkConfiguration?.awsvpcConfiguration?.securityGroups ?? [];

      nodes.push({
        id: svc.serviceArn!,
        resourceType: "AWS::ECS::Service",
        service: "ecs",
        name: svc.serviceName!,
        arn: svc.serviceArn,
        region,
        accountId,
        state: svc.status,
        properties: {
          clusterArn: cluster.clusterArn,
          desiredCount: svc.desiredCount,
          runningCount: svc.runningCount,
          pendingCount: svc.pendingCount,
          launchType: svc.launchType,
          taskDefinition: svc.taskDefinition,
          roleArn: svc.roleArn,
          subnetIds: subnets,
          securityGroupIds: securityGroups,
          loadBalancers: svc.loadBalancers?.map((lb) => ({
            targetGroupArn: lb.targetGroupArn,
            containerName: lb.containerName,
            containerPort: lb.containerPort,
          })),
        },
        tags: tagsToMap(svc.tags),
        parent: subnets[0], // Place in first subnet if VPC-attached
      });
    }
  }

  return { nodes };
}

function tagsToMap(
  tags?: Array<{ key?: string; value?: string }>,
): Record<string, string> | undefined {
  if (!tags || tags.length === 0) return undefined;
  const map: Record<string, string> = {};
  for (const tag of tags) {
    if (tag.key) map[tag.key] = tag.value ?? "";
  }
  return map;
}
