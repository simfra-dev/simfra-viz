import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Network } from "lucide-react";
import type { InfraNode } from "../../types";

interface SubnetNodeData {
  infraNode: InfraNode;
}

export const SubnetNode = memo(function SubnetNode({ data }: NodeProps) {
  const { infraNode } = data as unknown as SubnetNodeData;
  const cidr = infraNode.properties.cidrBlock as string | undefined;
  const az = infraNode.properties.availabilityZone as string | undefined;
  const isPublic = infraNode.properties.mapPublicIpOnLaunch as boolean | undefined;

  return (
    <div className="rounded-lg border border-blue-200 border-dashed bg-blue-50/20 h-full w-full">
      <Handle type="target" position={Position.Top} className="!bg-blue-300 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-300 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-blue-100">
        <Network className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-[11px] font-medium text-blue-700">
          {infraNode.name}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {isPublic && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
              public
            </span>
          )}
          {az && (
            <span className="text-[9px] text-blue-400 font-mono">
              {az.slice(-2)}
            </span>
          )}
          {cidr && (
            <span className="text-[9px] text-blue-400 font-mono">
              {cidr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
