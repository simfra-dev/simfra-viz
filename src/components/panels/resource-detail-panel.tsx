import { X } from "lucide-react";
import type { InfraNode } from "../../types";
import { getResourceMeta } from "../../resource-meta";

interface ResourceDetailPanelProps {
  node: InfraNode | null;
  onClose: () => void;
}

export function ResourceDetailPanel({ node, onClose }: ResourceDetailPanelProps) {
  if (!node) return null;

  const meta = getResourceMeta(node.resourceType);
  const Icon = meta.icon;

  return (
    <div className="w-80 border-l border-border bg-background overflow-y-auto flex-shrink-0">
      <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center gap-3 z-10">
        <div className={`rounded-md p-1.5 ${meta.bgColor}`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {meta.label}
          </div>
          <div className="text-sm font-semibold truncate">{node.name}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <Section title="Details">
          <DetailRow label="ID" value={node.id} mono />
          {node.arn && <DetailRow label="ARN" value={node.arn} mono />}
          <DetailRow label="Region" value={node.region} />
          <DetailRow label="Account" value={node.accountId} mono />
          {node.state && <DetailRow label="State" value={node.state} />}
        </Section>

        {/* Properties */}
        {Object.keys(node.properties).length > 0 && (
          <Section title="Properties">
            {Object.entries(node.properties).map(([key, value]) => {
              if (value == null) return null;
              const display =
                typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value);
              return (
                <DetailRow
                  key={key}
                  label={formatKey(key)}
                  value={display}
                  mono={typeof value !== "boolean"}
                />
              );
            })}
          </Section>
        )}

        {/* Tags */}
        {node.tags && Object.keys(node.tags).length > 0 && (
          <Section title="Tags">
            {Object.entries(node.tags).map(([key, value]) => (
              <DetailRow key={key} label={key} value={value} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const isMultiline = value.length > 60 || value.includes("\n");

  return (
    <div className={isMultiline ? "space-y-0.5" : "flex items-start gap-2"}>
      <span className="text-[11px] text-muted-foreground flex-shrink-0">
        {label}
      </span>
      <span
        className={`text-[11px] text-foreground break-all ${
          mono ? "font-mono" : ""
        } ${isMultiline ? "block whitespace-pre-wrap bg-gray-50 rounded p-1.5 text-[10px]" : "ml-auto text-right"}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
