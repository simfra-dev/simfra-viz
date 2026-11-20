import { ListDistributionsCommand } from "@aws-sdk/client-cloudfront";
import type { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import type { InfraNode, CollectorResult } from "../types";

export async function collectCloudFront(
  client: CloudFrontClient,
  accountId: string,
  _region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const result = await client
    .send(new ListDistributionsCommand({}))
    .catch(() => ({ DistributionList: { Items: [] } }));

  for (const dist of result.DistributionList?.Items ?? []) {
    const origins = dist.Origins?.Items ?? [];

    nodes.push({
      id: dist.ARN!,
      resourceType: "AWS::CloudFront::Distribution",
      service: "cloudfront",
      name: dist.DomainName ?? dist.Id!,
      arn: dist.ARN,
      region: "global",
      accountId,
      state: dist.Status,
      properties: {
        domainName: dist.DomainName,
        enabled: dist.Enabled,
        comment: dist.Comment,
        priceClass: dist.PriceClass,
        httpVersion: dist.HttpVersion,
        aliases: dist.Aliases?.Items,
        origins: origins.map((o) => ({
          id: o.Id,
          domainName: o.DomainName,
        })),
        defaultCacheBehavior: dist.DefaultCacheBehavior
          ? {
              targetOriginId: dist.DefaultCacheBehavior.TargetOriginId,
              viewerProtocolPolicy:
                dist.DefaultCacheBehavior.ViewerProtocolPolicy,
            }
          : undefined,
        webAclId: dist.WebACLId,
      },
    });
  }

  return { nodes };
}
