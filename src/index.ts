// Public API for embedding simfra-viz in other apps
export { InfraCanvas } from "./components/infra-canvas";
export { buildInfraGraph } from "./graph-builder";
export { layoutInfraGraph, type ViewMode } from "./layout";
export { timeRangeToMs, TIME_RANGE_OPTIONS, type TimeRange } from "./components/toolbar/graph-toolbar";
export { inferEdges } from "./relationship-rules";
export { getResourceMeta, isContainerType, isGlobalType } from "./resource-meta";

// Collectors
export { collectEC2 } from "./collectors/ec2";
export { collectIAM } from "./collectors/iam";
export { collectLambda } from "./collectors/lambda";
export { collectS3 } from "./collectors/s3";
export { collectCloudFront } from "./collectors/cloudfront";
export { collectResourceMetrics } from "./collectors/metrics";

// Types
export type {
  InfraNode,
  InfraEdge,
  InfraGraph,
  EdgeRelationship,
  ResourceType,
  TrafficFlow,
  ErrorSummary,
  ErrorType,
  ErrorDetail,
  AWSCredentials,
  ConnectionConfig,
  CollectorResult,
  SourceProgress,
  SourceStatus,
  ProgressCallback,
} from "./types";
