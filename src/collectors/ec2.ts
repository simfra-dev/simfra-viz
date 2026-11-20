import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeInstancesCommand,
  DescribeSecurityGroupsCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
  DescribeRouteTablesCommand,
} from "@aws-sdk/client-ec2";
import type { EC2Client } from "@aws-sdk/client-ec2";
import type { InfraNode, CollectorResult } from "../types";

export async function collectEC2(
  client: EC2Client,
  accountId: string,
  region: string,
): Promise<CollectorResult> {
  const nodes: InfraNode[] = [];

  const [vpcs, subnets, instances, securityGroups, igws, natGateways, routeTables] =
    await Promise.all([
      client.send(new DescribeVpcsCommand({})).catch(() => ({ Vpcs: [] })),
      client.send(new DescribeSubnetsCommand({})).catch(() => ({ Subnets: [] })),
      client.send(new DescribeInstancesCommand({})).catch(() => ({ Reservations: [] })),
      client.send(new DescribeSecurityGroupsCommand({})).catch(() => ({ SecurityGroups: [] })),
      client.send(new DescribeInternetGatewaysCommand({})).catch(() => ({ InternetGateways: [] })),
      client.send(new DescribeNatGatewaysCommand({})).catch(() => ({ NatGateways: [] })),
      client.send(new DescribeRouteTablesCommand({})).catch(() => ({ RouteTables: [] })),
    ]);

  for (const vpc of vpcs.Vpcs ?? []) {
    const nameTag = vpc.Tags?.find((t) => t.Key === "Name")?.Value;
    nodes.push({
      id: vpc.VpcId!,
      resourceType: "AWS::EC2::VPC",
      service: "ec2",
      name: nameTag ?? vpc.VpcId!,
      arn: `arn:aws:ec2:${region}:${accountId}:vpc/${vpc.VpcId}`,
      region,
      accountId,
      state: vpc.State,
      properties: {
        cidrBlock: vpc.CidrBlock,
        isDefault: vpc.IsDefault,
        dhcpOptionsId: vpc.DhcpOptionsId,
      },
      tags: tagsToMap(vpc.Tags),
    });
  }

  for (const subnet of subnets.Subnets ?? []) {
    const nameTag = subnet.Tags?.find((t) => t.Key === "Name")?.Value;
    nodes.push({
      id: subnet.SubnetId!,
      resourceType: "AWS::EC2::Subnet",
      service: "ec2",
      name: nameTag ?? subnet.SubnetId!,
      arn: `arn:aws:ec2:${region}:${accountId}:subnet/${subnet.SubnetId}`,
      region,
      accountId,
      state: subnet.State,
      properties: {
        cidrBlock: subnet.CidrBlock,
        availabilityZone: subnet.AvailabilityZone,
        mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
        vpcId: subnet.VpcId,
      },
      tags: tagsToMap(subnet.Tags),
      parent: subnet.VpcId,
    });
  }

  for (const reservation of instances.Reservations ?? []) {
    for (const inst of reservation.Instances ?? []) {
      if (inst.State?.Name === "terminated") continue;
      const nameTag = inst.Tags?.find((t) => t.Key === "Name")?.Value;
      nodes.push({
        id: inst.InstanceId!,
        resourceType: "AWS::EC2::Instance",
        service: "ec2",
        name: nameTag ?? inst.InstanceId!,
        arn: `arn:aws:ec2:${region}:${accountId}:instance/${inst.InstanceId}`,
        region,
        accountId,
        state: inst.State?.Name,
        properties: {
          instanceType: inst.InstanceType,
          subnetId: inst.SubnetId,
          vpcId: inst.VpcId,
          privateIpAddress: inst.PrivateIpAddress,
          publicIpAddress: inst.PublicIpAddress,
          iamInstanceProfile: inst.IamInstanceProfile?.Arn,
          securityGroupIds: inst.SecurityGroups?.map((sg) => sg.GroupId),
          imageId: inst.ImageId,
          keyName: inst.KeyName,
          launchTime: inst.LaunchTime?.toISOString(),
        },
        tags: tagsToMap(inst.Tags),
        parent: inst.SubnetId,
      });
    }
  }

  for (const sg of securityGroups.SecurityGroups ?? []) {
    const nameTag = sg.Tags?.find((t) => t.Key === "Name")?.Value;
    nodes.push({
      id: sg.GroupId!,
      resourceType: "AWS::EC2::SecurityGroup",
      service: "ec2",
      name: nameTag ?? sg.GroupName ?? sg.GroupId!,
      arn: `arn:aws:ec2:${region}:${accountId}:security-group/${sg.GroupId}`,
      region,
      accountId,
      properties: {
        groupName: sg.GroupName,
        description: sg.Description,
        vpcId: sg.VpcId,
        ingressRuleCount: sg.IpPermissions?.length ?? 0,
        egressRuleCount: sg.IpPermissionsEgress?.length ?? 0,
      },
      tags: tagsToMap(sg.Tags),
      parent: sg.VpcId,
    });
  }

  for (const igw of igws.InternetGateways ?? []) {
    const nameTag = igw.Tags?.find((t) => t.Key === "Name")?.Value;
    const attachedVpc = igw.Attachments?.[0]?.VpcId;
    nodes.push({
      id: igw.InternetGatewayId!,
      resourceType: "AWS::EC2::InternetGateway",
      service: "ec2",
      name: nameTag ?? igw.InternetGatewayId!,
      arn: `arn:aws:ec2:${region}:${accountId}:internet-gateway/${igw.InternetGatewayId}`,
      region,
      accountId,
      properties: {
        attachedVpcId: attachedVpc,
      },
      tags: tagsToMap(igw.Tags),
      parent: attachedVpc,
    });
  }

  for (const nat of natGateways.NatGateways ?? []) {
    if (nat.State === "deleted") continue;
    const nameTag = nat.Tags?.find((t) => t.Key === "Name")?.Value;
    nodes.push({
      id: nat.NatGatewayId!,
      resourceType: "AWS::EC2::NatGateway",
      service: "ec2",
      name: nameTag ?? nat.NatGatewayId!,
      arn: `arn:aws:ec2:${region}:${accountId}:natgateway/${nat.NatGatewayId}`,
      region,
      accountId,
      state: nat.State,
      properties: {
        subnetId: nat.SubnetId,
        vpcId: nat.VpcId,
        connectivityType: nat.ConnectivityType,
      },
      tags: tagsToMap(nat.Tags),
      parent: nat.SubnetId,
    });
  }

  for (const rt of routeTables.RouteTables ?? []) {
    const nameTag = rt.Tags?.find((t) => t.Key === "Name")?.Value;
    nodes.push({
      id: rt.RouteTableId!,
      resourceType: "AWS::EC2::RouteTable",
      service: "ec2",
      name: nameTag ?? rt.RouteTableId!,
      arn: `arn:aws:ec2:${region}:${accountId}:route-table/${rt.RouteTableId}`,
      region,
      accountId,
      properties: {
        vpcId: rt.VpcId,
        routes: rt.Routes?.map((r) => ({
          destination: r.DestinationCidrBlock,
          target: r.GatewayId ?? r.NatGatewayId ?? r.InstanceId ?? "local",
        })),
        associations: rt.Associations?.map((a) => a.SubnetId).filter(Boolean),
      },
      tags: tagsToMap(rt.Tags),
      parent: rt.VpcId,
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
