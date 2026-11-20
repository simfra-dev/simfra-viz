import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { InfraEdge } from "../../types";

interface RelationshipEdgeData {
  infraEdge: InfraEdge;
}

export const RelationshipEdge = memo(function RelationshipEdge(
  props: EdgeProps,
) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style } = props;
  const infraEdge = (data as unknown as RelationshipEdgeData)?.infraEdge;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const label = infraEdge?.label;

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all text-[9px] font-medium text-muted-foreground bg-background/90 px-1.5 py-0.5 rounded border border-gray-100 shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
