import type { InfraNode, InfraEdge, EdgeRelationship } from "./types";

interface RelationshipRule {
  fromType: string;
  field: string;
  toType: string;
  relationship: EdgeRelationship;
  label?: string;
  /** If true, the field value is an ARN; otherwise it's an ID to match against node.id */
  isArn?: boolean;
  /** If true, the field is an array */
  isArray?: boolean;
}

const RULES: RelationshipRule[] = [
  // Containment (VPC → subnet already handled by parent field)

  // IAM role assumptions
  {
    fromType: "AWS::EC2::Instance",
    field: "iamInstanceProfile",
    toType: "AWS::IAM::Role",
    relationship: "assumes",
    label: "assumes role",
    isArn: true,
  },
  {
    fromType: "AWS::Lambda::Function",
    field: "role",
    toType: "AWS::IAM::Role",
    relationship: "assumes",
    label: "execution role",
    isArn: true,
  },

  // Security group references
  {
    fromType: "AWS::EC2::Instance",
    field: "securityGroupIds",
    toType: "AWS::EC2::SecurityGroup",
    relationship: "references",
    label: "security group",
    isArray: true,
  },
  {
    fromType: "AWS::Lambda::Function",
    field: "securityGroupIds",
    toType: "AWS::EC2::SecurityGroup",
    relationship: "references",
    label: "security group",
    isArray: true,
  },

  // Lambda VPC subnets (additional subnets beyond the primary parent)
  {
    fromType: "AWS::Lambda::Function",
    field: "subnetIds",
    toType: "AWS::EC2::Subnet",
    relationship: "references",
    label: "VPC subnet",
    isArray: true,
  },

  // RDS security group references
  {
    fromType: "AWS::RDS::DBInstance",
    field: "securityGroupIds",
    toType: "AWS::EC2::SecurityGroup",
    relationship: "references",
    label: "security group",
    isArray: true,
  },
  // RDS encryption
  {
    fromType: "AWS::RDS::DBInstance",
    field: "kmsKeyId",
    toType: "AWS::KMS::Key",
    relationship: "encrypts",
    label: "encryption key",
    isArn: true,
  },

  // ECS service security groups
  {
    fromType: "AWS::ECS::Service",
    field: "securityGroupIds",
    toType: "AWS::EC2::SecurityGroup",
    relationship: "references",
    label: "security group",
    isArray: true,
  },
  // ECS service role
  {
    fromType: "AWS::ECS::Service",
    field: "roleArn",
    toType: "AWS::IAM::Role",
    relationship: "assumes",
    label: "service role",
    isArn: true,
  },

  // EFS mount target ENI → file system
  {
    fromType: "AWS::EC2::NetworkInterface",
    field: "fileSystemArn",
    toType: "AWS::EFS::FileSystem",
    relationship: "attached",
    label: "mount target",
    isArn: true,
  },
  // EFS encryption
  {
    fromType: "AWS::EFS::FileSystem",
    field: "kmsKeyId",
    toType: "AWS::KMS::Key",
    relationship: "encrypts",
    label: "encryption key",
    isArn: true,
  },

  // Route table → gateway
  // (handled specially in applyRouteTableEdges)

  // NAT Gateway → subnet (already handled by parent)

  // Internet Gateway → VPC (already handled by parent)
];

export function inferEdges(nodes: InfraNode[]): InfraEdge[] {
  const edges: InfraEdge[] = [];
  const edgeSet = new Set<string>();

  // Build lookup maps
  const nodeById = new Map<string, InfraNode>();
  const nodesByType = new Map<string, InfraNode[]>();
  const arnToId = new Map<string, string>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.arn) arnToId.set(node.arn, node.id);

    const list = nodesByType.get(node.resourceType) ?? [];
    list.push(node);
    nodesByType.set(node.resourceType, list);
  }

  // Apply containment edges from parent field
  for (const node of nodes) {
    if (node.parent && nodeById.has(node.parent)) {
      addEdge(edges, edgeSet, {
        id: `contains:${node.parent}:${node.id}`,
        source: node.parent,
        target: node.id,
        relationship: "contains",
      });
    }
  }

  // Apply declarative rules
  for (const rule of RULES) {
    const sourceNodes = nodesByType.get(rule.fromType) ?? [];
    for (const source of sourceNodes) {
      const fieldValue = source.properties[rule.field];
      if (fieldValue == null) continue;

      const values = rule.isArray
        ? (fieldValue as string[])
        : [fieldValue as string];

      for (const value of values) {
        const targetId = rule.isArn
          ? resolveArnToNode(value, arnToId, nodesByType.get(rule.toType) ?? [])
          : value;

        if (targetId && nodeById.has(targetId) && targetId !== source.id) {
          // Skip edges to ancestors (parent, grandparent, etc.)
          if (isAncestor(source, targetId, nodeById)) {
            continue;
          }

          addEdge(edges, edgeSet, {
            id: `${rule.relationship}:${source.id}:${targetId}`,
            source: source.id,
            target: targetId,
            relationship: rule.relationship,
            label: rule.label,
          });
        }
      }
    }
  }

  // Route table edges
  applyRouteTableEdges(nodes, nodeById, edges, edgeSet);

  // CloudFront → S3 origin edges
  applyCloudFrontOriginEdges(nodes, nodeById, edges, edgeSet);

  return edges;
}

function resolveArnToNode(
  arnOrValue: string,
  arnToId: Map<string, string>,
  candidates: InfraNode[],
): string | undefined {
  // Direct ARN match
  const directId = arnToId.get(arnOrValue);
  if (directId) return directId;

  // For instance profiles, try to find the role by extracting the name
  // Instance profile ARN: arn:aws:iam::123:instance-profile/name
  // Role ARN: arn:aws:iam::123:role/name
  if (arnOrValue.includes(":instance-profile/")) {
    const profileName = arnOrValue.split("/").pop();
    // Look for a role with the same name (common convention)
    for (const candidate of candidates) {
      if (candidate.name === profileName) return candidate.id;
    }
  }

  // Try matching by the last segment of the ARN
  const arnSuffix = arnOrValue.split("/").pop() ?? arnOrValue.split(":").pop();
  if (arnSuffix) {
    for (const candidate of candidates) {
      if (candidate.name === arnSuffix) return candidate.id;
    }
  }

  return undefined;
}

function applyRouteTableEdges(
  nodes: InfraNode[],
  nodeById: Map<string, InfraNode>,
  edges: InfraEdge[],
  edgeSet: Set<string>,
) {
  const routeTables = nodes.filter(
    (n) => n.resourceType === "AWS::EC2::RouteTable",
  );
  for (const rt of routeTables) {
    const routes = rt.properties.routes as
      | Array<{ destination?: string; target?: string }>
      | undefined;
    if (!routes) continue;

    for (const route of routes) {
      if (
        route.target &&
        route.target !== "local" &&
        nodeById.has(route.target)
      ) {
        addEdge(edges, edgeSet, {
          id: `routes_to:${rt.id}:${route.target}`,
          source: rt.id,
          target: route.target,
          relationship: "routes_to",
          label: route.destination,
        });
      }
    }

    // Associate route table with subnets
    const associations = rt.properties.associations as string[] | undefined;
    if (associations) {
      for (const subnetId of associations) {
        if (nodeById.has(subnetId)) {
          addEdge(edges, edgeSet, {
            id: `attached:${rt.id}:${subnetId}`,
            source: rt.id,
            target: subnetId,
            relationship: "attached",
            label: "route table",
          });
        }
      }
    }
  }
}

function applyCloudFrontOriginEdges(
  nodes: InfraNode[],
  nodeById: Map<string, InfraNode>,
  edges: InfraEdge[],
  edgeSet: Set<string>,
) {
  const s3Buckets = nodes.filter((n) => n.resourceType === "AWS::S3::Bucket");
  const cfDistros = nodes.filter((n) => n.resourceType === "AWS::CloudFront::Distribution");

  for (const dist of cfDistros) {
    const origins = dist.properties.origins as
      | Array<{ id?: string; domainName?: string }>
      | undefined;
    if (!origins) continue;

    for (const origin of origins) {
      const domain = origin.domainName ?? "";
      // Match bucket by domain: "bucket-name.s3.amazonaws.com" or "bucket-name.s3.region.amazonaws.com"
      const bucketName = domain.replace(/\.s3(\.[^.]+)?\.amazonaws\.com$/, "")
        .replace(/\.s3\.amazonaws\.com$/, "");

      const bucket = s3Buckets.find(
        (b) => b.name === bucketName || b.name === domain,
      );

      if (bucket && nodeById.has(bucket.id)) {
        addEdge(edges, edgeSet, {
          id: `routes_to:${dist.id}:${bucket.id}`,
          source: dist.id,
          target: bucket.id,
          relationship: "routes_to",
          label: "origin",
        });
      }
    }
  }
}

function isAncestor(
  node: InfraNode,
  candidateId: string,
  nodeById: Map<string, InfraNode>,
): boolean {
  let current: InfraNode | undefined = node;
  while (current?.parent) {
    if (current.parent === candidateId) return true;
    current = nodeById.get(current.parent);
  }
  return false;
}

function addEdge(
  edges: InfraEdge[],
  edgeSet: Set<string>,
  edge: InfraEdge,
) {
  const key = `${edge.source}:${edge.target}:${edge.relationship}`;
  if (edgeSet.has(key)) return;
  edgeSet.add(key);
  edges.push(edge);
}
