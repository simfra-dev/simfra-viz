import {
  Cloud,
  Server,
  Network,
  Shield,
  Globe,
  ArrowRightLeft,
  Route,
  UserCog,
  User,
  FileKey,
  Zap,
  Database,
  HardDrive,
  Container,
  Cog,
  Mail,
  MessageSquare,
  Key,
  Table,
} from "lucide-react";
import type { ResourceType } from "./types";
import type { LucideIcon } from "lucide-react";

interface ResourceMeta {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const META: Record<string, ResourceMeta> = {
  "AWS::EC2::VPC": {
    icon: Cloud,
    label: "VPC",
    shortLabel: "VPC",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  "AWS::EC2::Subnet": {
    icon: Network,
    label: "Subnet",
    shortLabel: "Subnet",
    color: "text-blue-600",
    bgColor: "bg-blue-50/50",
    borderColor: "border-blue-100",
  },
  "AWS::EC2::Instance": {
    icon: Server,
    label: "EC2 Instance",
    shortLabel: "EC2",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  "AWS::EC2::SecurityGroup": {
    icon: Shield,
    label: "Security Group",
    shortLabel: "SG",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  "AWS::EC2::InternetGateway": {
    icon: Globe,
    label: "Internet Gateway",
    shortLabel: "IGW",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  "AWS::EC2::NatGateway": {
    icon: ArrowRightLeft,
    label: "NAT Gateway",
    shortLabel: "NAT",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  "AWS::EC2::RouteTable": {
    icon: Route,
    label: "Route Table",
    shortLabel: "RT",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  "AWS::EC2::NetworkInterface": {
    icon: Network,
    label: "Network Interface",
    shortLabel: "ENI",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  "AWS::IAM::Role": {
    icon: UserCog,
    label: "IAM Role",
    shortLabel: "Role",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  "AWS::IAM::User": {
    icon: User,
    label: "IAM User",
    shortLabel: "User",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  "AWS::IAM::Policy": {
    icon: FileKey,
    label: "IAM Policy",
    shortLabel: "Policy",
    color: "text-pink-400",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  "AWS::Lambda::Function": {
    icon: Zap,
    label: "Lambda Function",
    shortLabel: "Lambda",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  "AWS::S3::Bucket": {
    icon: Database,
    label: "S3 Bucket",
    shortLabel: "S3",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  "AWS::RDS::DBInstance": {
    icon: HardDrive,
    label: "RDS Instance",
    shortLabel: "RDS",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  "AWS::RDS::DBCluster": {
    icon: HardDrive,
    label: "RDS Cluster",
    shortLabel: "RDS",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  "AWS::ElasticLoadBalancingV2::LoadBalancer": {
    icon: ArrowRightLeft,
    label: "Load Balancer",
    shortLabel: "ALB",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  "AWS::ElasticLoadBalancingV2::TargetGroup": {
    icon: Container,
    label: "Target Group",
    shortLabel: "TG",
    color: "text-violet-500",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  "AWS::ECS::Cluster": {
    icon: Container,
    label: "ECS Cluster",
    shortLabel: "ECS",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  "AWS::ECS::Service": {
    icon: Cog,
    label: "ECS Service",
    shortLabel: "Svc",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  "AWS::SNS::Topic": {
    icon: Mail,
    label: "SNS Topic",
    shortLabel: "SNS",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  "AWS::SQS::Queue": {
    icon: MessageSquare,
    label: "SQS Queue",
    shortLabel: "SQS",
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  "AWS::KMS::Key": {
    icon: Key,
    label: "KMS Key",
    shortLabel: "KMS",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  "AWS::DynamoDB::Table": {
    icon: Table,
    label: "DynamoDB Table",
    shortLabel: "DDB",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  "AWS::EFS::FileSystem": {
    icon: HardDrive,
    label: "EFS File System",
    shortLabel: "EFS",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  "AWS::CloudFront::Distribution": {
    icon: Globe,
    label: "CloudFront Distribution",
    shortLabel: "CF",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
};

const DEFAULT_META: ResourceMeta = {
  icon: Cog,
  label: "Resource",
  shortLabel: "Res",
  color: "text-gray-600",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
};

export function getResourceMeta(resourceType: ResourceType | string): ResourceMeta {
  return META[resourceType] ?? DEFAULT_META;
}

/** Returns true for resource types that act as containers (VPC, Subnet) */
export function isContainerType(resourceType: string): boolean {
  return (
    resourceType === "AWS::EC2::VPC" || resourceType === "AWS::EC2::Subnet"
  );
}

/** Returns true for resource types that are global (not region-scoped) */
export function isGlobalType(resourceType: string): boolean {
  return (
    resourceType.startsWith("AWS::IAM::") ||
    resourceType === "AWS::CloudFront::Distribution"
  );
}
