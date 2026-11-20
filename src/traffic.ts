import type { RawTrailEvent } from "./collectors/cloudtrail";
import type { TrafficFlow, InfraNode } from "./types";

/**
 * Aggregates CloudTrail events into traffic flows between resources.
 * A flow represents "principal X performed action Y on resource Z".
 */
export function aggregateTrafficFlows(
  events: RawTrailEvent[],
  nodes: InfraNode[],
): TrafficFlow[] {
  // Build lookup: ARN/name → node ID
  const arnToNodeId = new Map<string, string>();
  for (const node of nodes) {
    if (node.arn) arnToNodeId.set(node.arn, node.id);
    // Also map by name for resources where CloudTrail uses names not ARNs
    arnToNodeId.set(node.name, node.id);
  }

  // Map service event sources to service prefixes for role→service resolution
  const serviceToNodes = new Map<string, string[]>();
  for (const node of nodes) {
    const list = serviceToNodes.get(node.service) ?? [];
    list.push(node.id);
    serviceToNodes.set(node.service, list);
  }

  // Aggregate flows by (source, target, action, isError)
  const flowMap = new Map<string, TrafficFlow>();

  for (const event of events) {
    // Determine source: the principal (IAM role/user) that made the call
    const sourceId = resolveSource(event, arnToNodeId);

    // Determine target: the resource being acted upon
    const targetId = resolveTarget(event, arnToNodeId);

    if (!sourceId && !targetId) continue;

    // Use the event source service as target if no specific resource
    const effectiveSourceId = sourceId ?? `service:${eventSourceToService(event.eventSource)}`;
    const effectiveTargetId = targetId ?? `service:${eventSourceToService(event.eventSource)}`;

    if (effectiveSourceId === effectiveTargetId) continue;

    const key = `${effectiveSourceId}|${effectiveTargetId}|${event.eventName}`;
    const existing = flowMap.get(key);

    if (existing) {
      existing.count++;
      if (event.errorCode) existing.errorCount++;
      if (event.eventTime.toISOString() > existing.lastSeen) {
        existing.lastSeen = event.eventTime.toISOString();
      }
    } else {
      flowMap.set(key, {
        sourceArn: effectiveSourceId,
        targetArn: effectiveTargetId,
        eventSource: event.eventSource,
        eventName: event.eventName,
        count: 1,
        errorCount: event.errorCode ? 1 : 0,
        lastSeen: event.eventTime.toISOString(),
      });
    }
  }

  return Array.from(flowMap.values()).sort((a, b) => b.count - a.count);
}

function resolveSource(
  event: RawTrailEvent,
  arnToNodeId: Map<string, string>,
): string | undefined {
  // Try principal ARN (the IAM role or user that made the call)
  if (event.principalArn) {
    const id = arnToNodeId.get(event.principalArn);
    if (id) return id;

    // For assumed roles, extract the role ARN
    // arn:aws:sts::123:assumed-role/RoleName/session → arn:aws:iam::123:role/RoleName
    const assumedMatch = event.principalArn.match(
      /arn:aws:sts::(\d+):assumed-role\/([^/]+)/,
    );
    if (assumedMatch) {
      const roleArn = `arn:aws:iam::${assumedMatch[1]}:role/${assumedMatch[2]}`;
      const roleId = arnToNodeId.get(roleArn);
      if (roleId) return roleId;
    }
  }

  return undefined;
}

function resolveTarget(
  event: RawTrailEvent,
  arnToNodeId: Map<string, string>,
): string | undefined {
  // Try each resource in the event
  for (const resource of event.resources) {
    const id = arnToNodeId.get(resource.resourceName);
    if (id) return id;
  }

  // Try to extract target from request parameters
  const params = event.cloudTrailEvent.requestParameters as
    | Record<string, unknown>
    | undefined;
  if (params) {
    // Common parameter names that contain resource identifiers
    for (const key of [
      "bucketName",
      "functionName",
      "queueUrl",
      "topicArn",
      "tableName",
      "instanceId",
      "roleArn",
      "roleName",
      "keyId",
    ]) {
      const val = params[key];
      if (typeof val === "string") {
        const id = arnToNodeId.get(val);
        if (id) return id;
      }
    }
  }

  return undefined;
}

function eventSourceToService(eventSource: string): string {
  // s3.amazonaws.com → s3
  return eventSource.replace(".amazonaws.com", "");
}
