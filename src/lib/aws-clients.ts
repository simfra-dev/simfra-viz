import { EC2Client } from "@aws-sdk/client-ec2";
import { IAMClient } from "@aws-sdk/client-iam";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudTrailClient } from "@aws-sdk/client-cloudtrail";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { RDSClient } from "@aws-sdk/client-rds";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { KMSClient } from "@aws-sdk/client-kms";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { EFSClient } from "@aws-sdk/client-efs";
import type { ConnectionConfig } from "../types";

function clientConfig(config: ConnectionConfig) {
  return {
    region: config.region,
    credentials: config.credentials,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
  };
}

export function createEC2Client(config: ConnectionConfig) {
  return new EC2Client(clientConfig(config));
}

export function createIAMClient(config: ConnectionConfig) {
  return new IAMClient({
    ...clientConfig(config),
    region: "us-east-1", // IAM is global
  });
}

export function createLambdaClient(config: ConnectionConfig) {
  return new LambdaClient(clientConfig(config));
}

export function createS3Client(config: ConnectionConfig) {
  return new S3Client({
    ...clientConfig(config),
    forcePathStyle: true,
  });
}

export function createCloudTrailClient(config: ConnectionConfig) {
  return new CloudTrailClient(clientConfig(config));
}

export function createCloudWatchClient(config: ConnectionConfig) {
  return new CloudWatchClient(clientConfig(config));
}

export function createRDSClient(config: ConnectionConfig) {
  return new RDSClient(clientConfig(config));
}

export function createELBv2Client(config: ConnectionConfig) {
  return new ElasticLoadBalancingV2Client(clientConfig(config));
}

export function createECSClient(config: ConnectionConfig) {
  return new ECSClient(clientConfig(config));
}

export function createSNSClient(config: ConnectionConfig) {
  return new SNSClient(clientConfig(config));
}

export function createSQSClient(config: ConnectionConfig) {
  return new SQSClient(clientConfig(config));
}

export function createKMSClient(config: ConnectionConfig) {
  return new KMSClient(clientConfig(config));
}

export function createDynamoDBClient(config: ConnectionConfig) {
  return new DynamoDBClient(clientConfig(config));
}

export function createCloudFrontClient(config: ConnectionConfig) {
  return new CloudFrontClient(clientConfig(config));
}

export function createEFSClient(config: ConnectionConfig) {
  return new EFSClient(clientConfig(config));
}
