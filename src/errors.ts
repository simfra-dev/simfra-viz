import type { RawTrailEvent } from "./collectors/cloudtrail";
import type { ErrorSummary, ErrorDetail, ErrorType, InfraNode } from "./types";

/**
 * Detects errors from CloudTrail events and produces actionable summaries
 * with suggested fixes.
 */
export function detectErrors(
  events: RawTrailEvent[],
  nodes: InfraNode[],
): ErrorSummary[] {
  const arnToNode = new Map<string, InfraNode>();
  for (const node of nodes) {
    if (node.arn) arnToNode.set(node.arn, node);
    arnToNode.set(node.name, node);
    arnToNode.set(node.id, node);
  }

  // Group errors by (target resource, error type)
  const errorMap = new Map<string, ErrorSummary>();

  for (const event of events) {
    if (!event.errorCode) continue;

    const errorType = classifyError(event.errorCode);
    const targetResource = resolveErrorTarget(event, arnToNode);
    const sourceNode = resolveErrorSource(event, arnToNode);

    const key = `${targetResource ?? event.eventSource}:${errorType}`;
    const existing = errorMap.get(key);

    const detail: ErrorDetail = {
      timestamp: event.eventTime.toISOString(),
      errorCode: event.errorCode,
      errorMessage: event.errorMessage ?? "",
      sourceArn: sourceNode?.arn ?? event.principalArn,
      targetArn: targetResource ?? undefined,
      action: `${eventSourceToService(event.eventSource)}:${event.eventName}`,
    };

    if (existing) {
      existing.count++;
      existing.details.push(detail);
      if (event.eventTime.toISOString() > existing.lastSeen) {
        existing.lastSeen = event.eventTime.toISOString();
      }
    } else {
      errorMap.set(key, {
        resourceArn: targetResource ?? event.eventSource,
        errorType,
        count: 1,
        lastSeen: event.eventTime.toISOString(),
        details: [detail],
      });
    }
  }

  return Array.from(errorMap.values()).sort((a, b) => b.count - a.count);
}

function classifyError(errorCode: string): ErrorType {
  const code = errorCode.toLowerCase();
  if (
    code.includes("accessdenied") ||
    code.includes("unauthorized") ||
    code.includes("forbidden")
  ) {
    return "access_denied";
  }
  if (code.includes("throttl") || code.includes("toomanyrequests") || code.includes("ratelimit")) {
    return "throttled";
  }
  if (code.includes("notfound") || code.includes("nosuch") || code.includes("doesnotexist")) {
    return "broken_ref";
  }
  if (code.includes("validation") || code.includes("invalid") || code.includes("malformed")) {
    return "config_error";
  }
  return "delivery_failure";
}

function resolveErrorTarget(
  event: RawTrailEvent,
  arnToNode: Map<string, InfraNode>,
): string | undefined {
  for (const resource of event.resources) {
    if (arnToNode.has(resource.resourceName)) {
      return resource.resourceName;
    }
  }

  const params = event.cloudTrailEvent.requestParameters as
    | Record<string, unknown>
    | undefined;
  if (params) {
    for (const key of [
      "bucketName",
      "functionName",
      "queueUrl",
      "topicArn",
      "tableName",
      "keyId",
    ]) {
      const val = params[key];
      if (typeof val === "string" && arnToNode.has(val)) {
        return val;
      }
    }
  }
  return undefined;
}

function resolveErrorSource(
  event: RawTrailEvent,
  arnToNode: Map<string, InfraNode>,
): InfraNode | undefined {
  if (event.principalArn) {
    const node = arnToNode.get(event.principalArn);
    if (node) return node;

    // Resolve assumed role to IAM role
    const match = event.principalArn.match(
      /arn:aws:sts::(\d+):assumed-role\/([^/]+)/,
    );
    if (match) {
      const roleArn = `arn:aws:iam::${match[1]}:role/${match[2]}`;
      return arnToNode.get(roleArn);
    }
  }
  return undefined;
}

function eventSourceToService(eventSource: string): string {
  return eventSource.replace(".amazonaws.com", "");
}
