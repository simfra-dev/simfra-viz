import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { InfraGraph, InfraNode, SourceProgress } from "../types";
import { LoadingOverlay } from "./loading-overlay";
import { layoutInfraGraph, type ViewMode } from "../layout";
import { ResourceNode } from "./nodes/resource-node";
import { VpcNode } from "./nodes/vpc-node";
import { SubnetNode } from "./nodes/subnet-node";
import { ServiceClusterNode } from "./nodes/service-cluster-node";
import { RelationshipEdge } from "./edges/relationship-edge";
import { TrafficEdge } from "./edges/traffic-edge";
import { ResourceDetailPanel } from "./panels/resource-detail-panel";
import { ErrorsPanel } from "./panels/errors-panel";
import { GraphToolbar, type TimeRange } from "./toolbar/graph-toolbar";

const nodeTypes = {
  resource: ResourceNode,
  vpc: VpcNode,
  subnet: SubnetNode,
  serviceCluster: ServiceClusterNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
  traffic: TrafficEdge,
};

interface InfraCanvasProps {
  graph: InfraGraph | null;
  isLoading: boolean;
  onRefresh: () => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  loadingProgress?: SourceProgress[];
}

export function InfraCanvas({ graph, isLoading, onRefresh, timeRange, onTimeRangeChange, loadingProgress }: InfraCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<InfraNode | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("traffic");

  // Memoize to prevent React Flow warning on HMR
  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const memoEdgeTypes = useMemo(() => edgeTypes, []);

  // Build error lookup: resource ID → error count
  const errorsByResource = useMemo(() => {
    const map = new Map<string, number>();
    if (!graph) return map;
    for (const err of graph.errors) {
      const current = map.get(err.resourceArn) ?? 0;
      map.set(err.resourceArn, current + err.count);
    }
    return map;
  }, [graph]);

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!graph || graph.nodes.length === 0) return { nodes: [], edges: [] };
    const result = layoutInfraGraph(graph, { viewMode });

    // Annotate nodes with error badges
    for (const node of result.nodes) {
      const infraNode = (node.data as { infraNode?: InfraNode })?.infraNode;
      if (!infraNode) continue;

      const errCount = errorsByResource.get(infraNode.arn ?? "") ??
        errorsByResource.get(infraNode.id) ??
        errorsByResource.get(infraNode.name) ?? 0;
      if (errCount > 0) {
        const d = node.data as Record<string, unknown>;
        d.hasError = true;
        d.errorCount = errCount;
      }
    }

    return result;
  }, [graph, viewMode, errorsByResource]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const infraNode = (node.data as { infraNode?: InfraNode }).infraNode;
      if (infraNode) {
        setSelectedNode(infraNode);
        setShowErrors(false);
      }
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!graph && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg font-medium text-muted-foreground">No data</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        {isLoading && loadingProgress && (
          <LoadingOverlay sources={loadingProgress} />
        )}
        <GraphToolbar
          isLoading={isLoading}
          nodeCount={graph?.nodes.length ?? 0}
          edgeCount={graph?.edges.length ?? 0}
          trafficFlowCount={graph?.trafficFlows.length ?? 0}
          errorCount={graph?.errors.length ?? 0}
          onRefresh={onRefresh}
          region={graph?.metadata.region ?? ""}
          accountId={graph?.metadata.accountId ?? ""}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          onErrorsClick={() => {
            setShowErrors(true);
            setSelectedNode(null);
          }}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={memoNodeTypes}
          edgeTypes={memoEdgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls
            showInteractive={false}
            className="!bg-background !border-border !shadow-sm !rounded-lg"
          />
          <MiniMap
            nodeStrokeColor="#d1d5db"
            nodeColor={(node) => {
              switch (node.type) {
                case "vpc":
                  return "#dbeafe";
                case "subnet":
                  return "#eff6ff";
                case "serviceCluster":
                  return "#f9fafb";
                default:
                  return "#fff";
              }
            }}
            maskColor="rgba(0, 0, 0, 0.08)"
            className="!bg-background"
          />
        </ReactFlow>
      </div>

      {showErrors && graph && (
        <ErrorsPanel
          errors={graph.errors}
          onClose={() => setShowErrors(false)}
          onErrorClick={(arn) => {
            const node = graph.nodes.find(
              (n) => n.arn === arn || n.id === arn || n.name === arn,
            );
            if (node) {
              setSelectedNode(node);
              setShowErrors(false);
            }
          }}
        />
      )}

      {selectedNode && !showErrors && (
        <ResourceDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
