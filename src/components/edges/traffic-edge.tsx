import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

interface TrafficEdgeData {
  eventName: string;
  count: number;
  errorCount: number;
  isError: boolean;
}

export const TrafficEdge = memo(function TrafficEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style } = props;
  const { eventName, count, errorCount, isError } = (data ?? {}) as unknown as TrafficEdgeData;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeWidth = Math.min(6, 1.5 + Math.log2(Math.max(1, count)));
  const stroke = isError ? "#ef4444" : "#22c55e";
  const dasharray = isError ? "6 3" : undefined;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke,
          strokeWidth,
          strokeDasharray: dasharray,
          opacity: 0.8,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-all"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium shadow-md border
              ${isError
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-background text-foreground border-border"
              }
            `}
          >
            <span className="font-semibold">{eventName}</span>
            <span className="text-[9px] opacity-70">x{count}</span>
            {errorCount > 0 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-bold">
                {errorCount} failed
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
