import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { InfraNode } from "../../types";
import { getResourceMeta } from "../../resource-meta";

interface ResourceNodeData {
  infraNode: InfraNode;
  hasError?: boolean;
  errorCount?: number;
}

export const ResourceNode = memo(function ResourceNode({
  data,
}: NodeProps) {
  const { infraNode, hasError, errorCount } = data as unknown as ResourceNodeData;
  const meta = getResourceMeta(infraNode.resourceType);
  const Icon = meta.icon;

  return (
    <div
      className={`
        relative flex items-center gap-2.5 rounded-lg border px-3 py-2
        bg-background shadow-sm transition-all
        hover:shadow-md hover:border-gray-300
        ${hasError ? "border-red-400 error-pulse" : meta.borderColor}
        cursor-pointer select-none
      `}
      style={{ width: 220 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2 !border-0" />

      <div className={`flex-shrink-0 rounded-md p-1.5 ${meta.bgColor}`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {meta.shortLabel}
        </div>
        <div className="text-xs font-semibold text-foreground truncate" title={infraNode.name}>
          {infraNode.name}
        </div>
      </div>

      {infraNode.state && (
        <StateBadge state={infraNode.state} />
      )}

      {hasError && errorCount != null && errorCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
          {errorCount > 99 ? "99+" : errorCount}
        </div>
      )}
    </div>
  );
});

function StateBadge({ state }: { state: string }) {
  const color = stateColor(state);
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[9px] text-muted-foreground">{state}</span>
    </div>
  );
}

function stateColor(state: string): string {
  switch (state.toLowerCase()) {
    case "running":
    case "available":
    case "active":
    case "in-use":
      return "bg-green-500";
    case "pending":
    case "creating":
    case "modifying":
      return "bg-yellow-500";
    case "stopping":
    case "shutting-down":
    case "deleting":
      return "bg-orange-500";
    case "stopped":
    case "deleted":
    case "terminated":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}
