import {
  ListRolesCommand,
  ListUsersCommand,
  ListPoliciesCommand,
} from "@aws-sdk/client-iam";
import type { IAMClient } from "@aws-sdk/client-iam";
import type { InfraNode, CollectorResult } from "../types";

export async function collectIAM(
  client: IAMClient,
  accountId: string,
  _region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const [roles, users, policies] = await Promise.all([
    client.send(new ListRolesCommand({})).catch(() => ({ Roles: [] })),
    client.send(new ListUsersCommand({})).catch(() => ({ Users: [] })),
    client
      .send(new ListPoliciesCommand({ Scope: "Local" }))
      .catch(() => ({ Policies: [] })),
  ]);

  for (const role of roles.Roles ?? []) {
    let trustPolicy: unknown = undefined;
    if (role.AssumeRolePolicyDocument) {
      try {
        trustPolicy = JSON.parse(
          decodeURIComponent(role.AssumeRolePolicyDocument),
        );
      } catch {
        // ignore parse errors
      }
    }

    nodes.push({
      id: role.Arn!,
      resourceType: "AWS::IAM::Role",
      service: "iam",
      name: role.RoleName!,
      arn: role.Arn,
      region: "global",
      accountId,
      properties: {
        path: role.Path,
        createDate: role.CreateDate?.toISOString(),
        maxSessionDuration: role.MaxSessionDuration,
        trustPolicy,
        description: role.Description,
      },
    });
  }

  for (const user of users.Users ?? []) {
    nodes.push({
      id: user.Arn!,
      resourceType: "AWS::IAM::User",
      service: "iam",
      name: user.UserName!,
      arn: user.Arn,
      region: "global",
      accountId,
      properties: {
        path: user.Path,
        createDate: user.CreateDate?.toISOString(),
      },
    });
  }

  for (const policy of policies.Policies ?? []) {
    nodes.push({
      id: policy.Arn!,
      resourceType: "AWS::IAM::Policy",
      service: "iam",
      name: policy.PolicyName!,
      arn: policy.Arn,
      region: "global",
      accountId,
      properties: {
        path: policy.Path,
        attachmentCount: policy.AttachmentCount,
        createDate: policy.CreateDate?.toISOString(),
        isAttachable: policy.IsAttachable,
        defaultVersionId: policy.DefaultVersionId,
        description: policy.Description,
      },
    });
  }

  return { nodes };
}
