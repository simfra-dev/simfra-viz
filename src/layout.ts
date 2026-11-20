import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { InfraGraph, InfraNode, InfraEdge } from "./types";
import { isContainerType, isGlobalType } from "./resource-meta";

const NODE_W = 220;
const NODE_H = 64;
const PAD = 30;
const HEADER = 40;
const GAP = 16;

export type ViewMode = "topology" | "traffic";

interface LayoutOptions {
  direction?: "TB" | "LR";
  viewMode?: ViewMode;
}

export function layoutInfraGraph(
  graph: InfraGraph,
  options: LayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const direction = options.direction ?? "TB";

  // Classify nodes
  const vpcNodes = graph.nodes.filter((n) => n.resourceType === "AWS::EC2::VPC");
  const subnetNodes = graph.nodes.filter((n) => n.resourceType === "AWS::EC2::Subnet");
  const globalNodes = graph.nodes.filter((n) => isGlobalType(n.resourceType));
  const leafNodes = graph.nodes.filter(
    (n) => !isContainerType(n.resourceType) && !isGlobalType(n.resourceType),
  );

  // Build parent → children maps
  const childrenOfSubnet = new Map<string, InfraNode[]>();
  const childrenOfVpc = new Map<string, InfraNode[]>();
  const regionalOrphans: InfraNode[] = []; // regional, no VPC parent

  const subnetIds = new Set(subnetNodes.map((s) => s.id));
  const vpcIds = new Set(vpcNodes.map((v) => v.id));

  for (const node of subnetNodes) {
    if (node.parent && vpcIds.has(node.parent)) {
      push(childrenOfVpc, node.parent, node);
    }
  }

  for (const node of leafNodes) {
    if (node.parent && subnetIds.has(node.parent)) {
      push(childrenOfSubnet, node.parent, node);
    } else if (node.parent && vpcIds.has(node.parent)) {
      push(childrenOfVpc, node.parent, node);
    } else {
      regionalOrphans.push(node);
    }
  }

  // --- Size calculation (bottom-up) ---

  const subnetSizes = new Map<string, Size>();
  for (const subnet of subnetNodes) {
    subnetSizes.set(subnet.id, gridSize(childrenOfSubnet.get(subnet.id) ?? [], 3, PAD, HEADER));
  }

  const vpcSizes = new Map<string, Size>();
  for (const vpc of vpcNodes) {
    const children = childrenOfVpc.get(vpc.id) ?? [];
    const subnets = children.filter((c) => c.resourceType === "AWS::EC2::Subnet");
    const direct = children.filter((c) => c.resourceType !== "AWS::EC2::Subnet");

    let contentW = 0;
    let contentH = 0;

    for (const s of subnets) {
      const sz = subnetSizes.get(s.id)!;
      contentW = Math.max(contentW, sz.width);
      contentH += sz.height + GAP;
    }

    if (direct.length > 0) {
      const g = gridSize(direct, 4, PAD, 0);
      contentW = Math.max(contentW, g.width);
      contentH += g.height + GAP;
    }

    vpcSizes.set(vpc.id, {
      width: Math.max(300, contentW + PAD * 2),
      height: HEADER + contentH + PAD * 2,
    });
  }

  // Region size: contains VPCs laid out vertically + orphan grid
  let regionContentW = 0;
  let regionContentH = 0;

  for (const vpc of vpcNodes) {
    const sz = vpcSizes.get(vpc.id)!;
    regionContentW = Math.max(regionContentW, sz.width);
    regionContentH += sz.height + GAP;
  }

  if (regionalOrphans.length > 0) {
    const og = gridSize(regionalOrphans, 4, PAD, 0);
    regionContentW = Math.max(regionContentW, og.width);
    regionContentH += og.height + GAP;
  }

  const regionW = Math.max(350, regionContentW + PAD * 2);
  const regionH = HEADER + regionContentH + PAD * 2;

  // Global size
  const globalSize = globalNodes.length > 0 ? gridSize(globalNodes, 3, 20, HEADER) : null;

  // --- Top-level Dagre: region + global ---
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  g.setNode("__region__", { width: regionW, height: regionH });
  if (globalSize) {
    g.setNode("__global__", { width: globalSize.width, height: globalSize.height });
    g.setEdge("__global__", "__region__");
  }

  dagre.layout(g);

  // --- Build React Flow nodes ---
  const rfNodes: Node[] = [];

  // Region container
  const regionPos = g.node("__region__");
  rfNodes.push({
    id: "__region__",
    type: "serviceCluster",
    position: { x: regionPos.x - regionW / 2, y: regionPos.y - regionH / 2 },
    data: { label: graph.metadata.region, service: "region" },
    style: { width: regionW, height: regionH },
  });

  // Place VPCs inside region
  let vpcY = HEADER;
  for (const vpc of vpcNodes) {
    const sz = vpcSizes.get(vpc.id)!;
    rfNodes.push({
      id: vpc.id,
      type: "vpc",
      position: { x: PAD, y: vpcY },
      parentId: "__region__",
      extent: "parent" as const,
      data: { infraNode: vpc },
      style: { width: sz.width, height: sz.height },
    });

    // Subnets inside VPC
    const vpcChildren = childrenOfVpc.get(vpc.id) ?? [];
    const subnetsInVpc = vpcChildren.filter((c) => c.resourceType === "AWS::EC2::Subnet");
    let subnetY = HEADER;
    for (const subnet of subnetsInVpc) {
      const ssz = subnetSizes.get(subnet.id)!;
      rfNodes.push({
        id: subnet.id,
        type: "subnet",
        position: { x: PAD, y: subnetY },
        parentId: vpc.id,
        extent: "parent" as const,
        data: { infraNode: subnet },
        style: { width: ssz.width, height: ssz.height },
      });

      placeGrid(rfNodes, childrenOfSubnet.get(subnet.id) ?? [], subnet.id, PAD, HEADER, 3);
      subnetY += ssz.height + GAP;
    }

    // Direct VPC children (SGs, route tables, etc.)
    const directVpc = vpcChildren.filter((c) => c.resourceType !== "AWS::EC2::Subnet");
    if (directVpc.length > 0) {
      placeGrid(rfNodes, directVpc, vpc.id, PAD, subnetY, 4);
    }

    vpcY += sz.height + GAP;
  }

  // Orphan regional resources inside region (S3, SQS, etc.)
  if (regionalOrphans.length > 0) {
    placeGrid(rfNodes, regionalOrphans, "__region__", PAD, vpcY, 4);
  }

  // Global services container
  if (globalSize && globalNodes.length > 0) {
    const gPos = g.node("__global__");
    rfNodes.push({
      id: "__global__",
      type: "serviceCluster",
      position: { x: gPos.x - globalSize.width / 2, y: gPos.y - globalSize.height / 2 },
      data: { label: "Global Services", service: "global" },
      style: { width: globalSize.width, height: globalSize.height },
    });
    placeGrid(rfNodes, globalNodes, "__global__", 20, HEADER, 3);
  }

  // --- Edges ---
  const viewMode = options.viewMode ?? "topology";
  const rfEdges: Edge[] = [];

  if (viewMode === "topology") {
    for (const e of graph.edges) {
      if (e.relationship === "contains") continue;
      rfEdges.push(infraEdgeToRFEdge(e));
    }
  }

  // Traffic flow edges
  const nodeIdSet = new Set(rfNodes.map((n) => n.id));
  for (const flow of graph.trafficFlows) {
    if (!nodeIdSet.has(flow.sourceArn) || !nodeIdSet.has(flow.targetArn)) continue;
    rfEdges.push({
      id: `traffic:${flow.sourceArn}:${flow.targetArn}:${flow.eventName}`,
      source: flow.sourceArn,
      target: flow.targetArn,
      animated: true,
      type: "traffic",
      data: {
        eventName: flow.eventName,
        count: flow.count,
        errorCount: flow.errorCount,
        isError: flow.errorCount > 0,
      },
    });
  }

  // In traffic mode, only keep role-assumption edges as dim reference
  if (viewMode === "traffic") {
    for (const e of graph.edges) {
      if (e.relationship !== "assumes") continue;
      rfEdges.push({
        ...infraEdgeToRFEdge(e),
        style: { stroke: "#d1d5db", strokeWidth: 1, strokeDasharray: "4 4" },
      });
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}

// --- Helpers ---

interface Size {
  width: number;
  height: number;
}

function gridSize(items: InfraNode[], maxCols: number, padX: number, headerH: number): Size {
  if (items.length === 0) return { width: Math.max(250, padX * 2), height: headerH + padX };
  const cols = Math.max(1, Math.min(maxCols, items.length));
  const rows = Math.ceil(items.length / cols);
  return {
    width: Math.max(250, cols * (NODE_W + GAP) + padX * 2),
    height: headerH + rows * (NODE_H + GAP) + padX,
  };
}

function placeGrid(
  rfNodes: Node[],
  children: InfraNode[],
  parentId: string,
  offsetX: number,
  offsetY: number,
  maxCols: number,
) {
  const cols = Math.max(1, Math.min(maxCols, children.length));
  for (let i = 0; i < children.length; i++) {
    rfNodes.push({
      id: children[i].id,
      type: "resource",
      position: {
        x: offsetX + (i % cols) * (NODE_W + GAP),
        y: offsetY + Math.floor(i / cols) * (NODE_H + GAP),
      },
      parentId,
      extent: "parent" as const,
      data: { infraNode: children[i] },
    });
  }
}

function push(map: Map<string, InfraNode[]>, key: string, node: InfraNode) {
  const list = map.get(key) ?? [];
  list.push(node);
  map.set(key, list);
}

function infraEdgeToRFEdge(edge: InfraEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.relationship === "traffic",
    style: getEdgeStyle(edge.relationship),
    type: "relationship",
    data: { infraEdge: edge },
  };
}

function getEdgeStyle(relationship: string): React.CSSProperties {
  switch (relationship) {
    case "assumes":
      return { stroke: "#db2777", strokeWidth: 1.5 };
    case "references":
      return { stroke: "#6b7280", strokeWidth: 1, strokeDasharray: "6 3" };
    case "routes_to":
      return { stroke: "#7c3aed", strokeWidth: 1.5 };
    case "encrypts":
      return { stroke: "#ca8a04", strokeWidth: 1.5 };
    case "triggers":
      return { stroke: "#ea580c", strokeWidth: 2 };
    case "attached":
      return { stroke: "#6b7280", strokeWidth: 1 };
    case "traffic":
      return { stroke: "#22c55e", strokeWidth: 2 };
    default:
      return { stroke: "#9ca3af", strokeWidth: 1 };
  }
}
