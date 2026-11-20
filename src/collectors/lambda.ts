import { ListFunctionsCommand } from "@aws-sdk/client-lambda";
import type { LambdaClient } from "@aws-sdk/client-lambda";
import type { InfraNode, CollectorResult } from "../types";

export async function collectLambda(
  client: LambdaClient,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const result = await client
    .send(new ListFunctionsCommand({}))
    .catch(() => ({ Functions: [] }));

  for (const fn of result.Functions ?? []) {
    const vpcConfig = fn.VpcConfig;
    const subnetId = vpcConfig?.SubnetIds?.[0];

    nodes.push({
      id: fn.FunctionArn!,
      resourceType: "AWS::Lambda::Function",
      service: "lambda",
      name: fn.FunctionName!,
      arn: fn.FunctionArn,
      region,
      accountId,
      state: fn.State,
      properties: {
        runtime: fn.Runtime,
        handler: fn.Handler,
        memorySize: fn.MemorySize,
        timeout: fn.Timeout,
        codeSize: fn.CodeSize,
        role: fn.Role,
        lastModified: fn.LastModified,
        vpcId: vpcConfig?.VpcId,
        subnetIds: vpcConfig?.SubnetIds,
        securityGroupIds: vpcConfig?.SecurityGroupIds,
        architectures: fn.Architectures,
        ephemeralStorageSize: fn.EphemeralStorage?.Size,
        layers: fn.Layers?.map((l) => l.Arn),
      },
      parent: subnetId,
    });
  }

  return { nodes };
}
