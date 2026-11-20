import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cloud } from "lucide-react";
import type { InfraNode } from "../../types";

interface VpcNodeData {
  infraNode: InfraNode;
}

export const VpcNode = memo(function VpcNode({ data }: NodeProps) {
  const { infraNode } = data as unknown as VpcNodeData;
  const cidr = infraNode.properties.cidrBlock as string | undefined;

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 h-full w-full">
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-200 bg-blue-100/50 rounded-t-xl">
        <Cloud className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-blue-800">
          {infraNode.name}
        </span>
        {cidr && (
          <span className="text-[10px] text-blue-500 font-mono ml-auto">
            {cidr}
          </span>
        )}
      </div>
    </div>
  );
});
