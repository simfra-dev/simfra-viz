export interface InfraNode {
  id: string;
  resourceType: ResourceType;
  service: string;
  name: string;
  arn?: string;
  region: string;
  accountId: string;
  state?: string;
  properties: Record<string, unknown>;
  tags?: Record<string, string>;
  parent?: string;
  children?: string[];
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  relationship: EdgeRelationship;
  label?: string;
  metadata?: {
    requestCount?: number;
    errorRate?: number;
    latencyMs?: number;
  };
}

export interface ResourceMetricsSummary {
  resourceId: string;
  requests?: number;
  errors?: number;
  errorRate?: number;
}

export interface InfraGraph {
  nodes: InfraNode[];
  edges: InfraEdge[];
  trafficFlows: TrafficFlow[];
  errors: ErrorSummary[];
  metrics: ResourceMetricsSummary[];
  metadata: {
    accountId: string;
    region: string;
    generatedAt: string;
  };
}

export type EdgeRelationship =
  | "contains"
  | "attached"
  | "references"
  | "routes_to"
  | "encrypts"
  | "logs_to"
  | "triggers"
  | "assumes"
  | "policy_grants"
  | "traffic";

export type ResourceType =
  | "AWS::EC2::VPC"
  | "AWS::EC2::Subnet"
  | "AWS::EC2::Instance"
  | "AWS::EC2::SecurityGroup"
  | "AWS::EC2::NetworkInterface"
  | "AWS::EC2::InternetGateway"
  | "AWS::EC2::NatGateway"
  | "AWS::EC2::RouteTable"
  | "AWS::IAM::Role"
  | "AWS::IAM::User"
  | "AWS::IAM::Policy"
  | "AWS::Lambda::Function"
  | "AWS::S3::Bucket"
  | "AWS::RDS::DBInstance"
  | "AWS::RDS::DBCluster"
  | "AWS::ElasticLoadBalancingV2::LoadBalancer"
  | "AWS::ElasticLoadBalancingV2::TargetGroup"
  | "AWS::ECS::Cluster"
  | "AWS::ECS::Service"
  | "AWS::SNS::Topic"
  | "AWS::SQS::Queue"
  | "AWS::KMS::Key"
  | "AWS::DynamoDB::Table"
  | "AWS::CloudFront::Distribution"
  | "AWS::EFS::FileSystem";

export interface TrafficFlow {
  sourceArn: string;
  targetArn: string;
  eventSource: string;
  eventName: string;
  count: number;
  errorCount: number;
  lastSeen: string;
}

export interface ErrorSummary {
  resourceArn: string;
  errorType: ErrorType;
  count: number;
  lastSeen: string;
  details: ErrorDetail[];
}

export type ErrorType =
  | "access_denied"
  | "delivery_failure"
  | "unhealthy"
  | "broken_ref"
  | "throttled"
  | "config_error";

export interface ErrorDetail {
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  sourceArn?: string;
  targetArn?: string;
  action?: string;
}

export type SourceStatus = "pending" | "loading" | "done" | "error";

export interface SourceProgress {
  name: string;
  status: SourceStatus;
  detail?: string;
}

export type ProgressCallback = (sources: SourceProgress[]) => void;

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface ConnectionConfig {
  credentials: AWSCredentials;
  region: string;
  endpoint?: string;
}

export interface CollectorResult {
  nodes: InfraNode[];
}
