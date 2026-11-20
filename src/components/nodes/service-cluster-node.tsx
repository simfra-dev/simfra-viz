import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe } from "lucide-react";

interface ServiceClusterNodeData {
  label: string;
  service: string;
}

export const ServiceClusterNode = memo(function ServiceClusterNode({
  data,
}: NodeProps) {
  const { label } = data as unknown as ServiceClusterNodeData;

  return (
    <div className="rounded-xl border-2 border-gray-200 border-dashed bg-gray-50/40 h-full w-full">
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-100/50 rounded-t-xl">
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600">
          {label}
        </span>
      </div>
    </div>
  );
});
