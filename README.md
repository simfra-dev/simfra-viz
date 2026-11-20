# simfra-viz

An interactive infrastructure map for AWS-compatible endpoints. simfra-viz
queries an account through the AWS SDK, builds a graph of its resources and
their relationships, and renders it with [React Flow](https://reactflow.dev):
VPCs and subnets as containers, resources as nodes, inferred relationships and
observed traffic as edges, and error summaries from CloudWatch and CloudTrail.

It powers the infrastructure map in the [Simfra](https://github.com/simfra-dev/simfra)
console and also works on its own against Simfra or AWS.

## Coverage

Collectors query EC2 (VPCs, subnets, route tables, internet and NAT gateways,
security groups, instances), ECS, EFS, IAM, Lambda, RDS, S3 and CloudFront,
plus CloudWatch metrics and CloudTrail events for traffic and errors. Relationships between resources are inferred
from their configuration.

## Install

```bash
npm install @simfra-dev/simfra-viz
```

Peer dependencies: `react` and `react-dom` 19, `@tanstack/react-query` 5,
`@xyflow/react` 12.

## Usage

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  InfraCanvas,
  buildInfraGraph,
  timeRangeToMs,
  type ConnectionConfig,
  type SourceProgress,
  type TimeRange,
} from "@simfra-dev/simfra-viz";
import "@simfra-dev/simfra-viz/styles";

const config: ConnectionConfig = {
  region: "us-east-1",
  endpoint: "http://localhost:4599", // omit for AWS
  credentials: { accessKeyId: "...", secretAccessKey: "..." },
};

export function InfraMap({ accountId }: { accountId: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("5m");
  const [progress, setProgress] = useState<SourceProgress[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["infra-graph", accountId, timeRange],
    queryFn: () => buildInfraGraph(config, accountId, timeRangeToMs(timeRange), setProgress),
  });

  return (
    <InfraCanvas
      graph={data ?? null}
      isLoading={isLoading}
      onRefresh={() => refetch()}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      loadingProgress={isLoading ? progress : undefined}
    />
  );
}
```

The lower-level pieces (`collectEC2`, `collectIAM`, `collectLambda`,
`collectS3`, `collectCloudFront`, `collectResourceMetrics`, `inferEdges`,
`layoutInfraGraph`, `getResourceMeta`) are exported too.

## Development

```bash
npm install
npm run dev    # standalone viewer: enter an endpoint and credentials
npm run lint
npm run build  # library build into dist/
```

## Releasing

Releases go to npmjs.org through npm trusted publishing (no tokens). Pushing a
version tag runs the `Publish` workflow, which stages the version; a
maintainer then approves it with 2FA:

```bash
npm version patch          # or minor / major; commits and tags vX.Y.Z
git push --follow-tags     # workflow stages the release
npm stage list @simfra-dev/simfra-viz
npm stage approve <stage-id>   # publishes it (asks for the 2FA code)
```

## License

simfra-viz is part of Simfra and is licensed under the
[Business Source License 1.1](LICENSE). Each release converts to the Apache
License 2.0 four years after its first public distribution. See `LICENSE` for
the Additional Use Grant.

"Amazon Web Services", "AWS" and related marks are trademarks of Amazon.com,
Inc. or its affiliates. Simfra is not affiliated with or endorsed by Amazon.
