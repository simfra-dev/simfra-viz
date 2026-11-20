import { RefreshCw, AlertTriangle, Network, GitBranch, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export type ViewMode = "topology" | "traffic";

export type TimeRange = "1m" | "5m" | "30m" | "1h" | "6h" | "12h" | "24h";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; ms: number }[] = [
  { value: "1m", label: "Last 1 min", ms: 60 * 1000 },
  { value: "5m", label: "Last 5 min", ms: 5 * 60 * 1000 },
  { value: "30m", label: "Last 30 min", ms: 30 * 60 * 1000 },
  { value: "1h", label: "Last 1 hour", ms: 60 * 60 * 1000 },
  { value: "6h", label: "Last 6 hours", ms: 6 * 60 * 60 * 1000 },
  { value: "12h", label: "Last 12 hours", ms: 12 * 60 * 60 * 1000 },
  { value: "24h", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
];

export function timeRangeToMs(range: TimeRange): number {
  return TIME_RANGE_OPTIONS.find((o) => o.value === range)!.ms;
}

interface GraphToolbarProps {
  isLoading: boolean;
  nodeCount: number;
  edgeCount: number;
  trafficFlowCount: number;
  errorCount: number;
  onRefresh: () => void;
  region: string;
  accountId: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onErrorsClick: () => void;
}

export function GraphToolbar({
  isLoading,
  nodeCount,
  edgeCount,
  trafficFlowCount,
  errorCount,
  onRefresh,
  region,
  accountId,
  viewMode,
  onViewModeChange,
  timeRange,
  onTimeRangeChange,
  onErrorsClick,
}: GraphToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      {/* Info bar */}
      <div className="flex items-center gap-2 bg-background rounded-lg border border-border shadow-sm px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-foreground">
            {accountId}
          </span>
          <span className="text-xs text-muted-foreground">/ {region}</span>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <span className="text-[11px] text-muted-foreground">
          {nodeCount} resources
        </span>
        <span className="text-[11px] text-muted-foreground">
          {edgeCount} links
        </span>
        {trafficFlowCount > 0 && (
          <span className="text-[11px] text-green-600 font-medium">
            {trafficFlowCount} flows
          </span>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent active:bg-gray-200 transition-colors disabled:pointer-events-none"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Time range selector */}
      <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />

      {/* View mode toggle */}
      <div className="flex items-center bg-background rounded-lg border border-border shadow-sm p-0.5">
        <button
          onClick={() => onViewModeChange("topology")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            viewMode === "topology"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="Topology view — resource relationships"
        >
          <Network className="w-3 h-3" />
          Topology
        </button>
        <button
          onClick={() => onViewModeChange("traffic")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            viewMode === "traffic"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title="Traffic view — API calls and data flows"
        >
          <GitBranch className="w-3 h-3" />
          Traffic
        </button>
      </div>

      {/* Error indicator */}
      {errorCount > 0 && (
        <button
          onClick={onErrorsClick}
          className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg shadow-sm px-3 py-2 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[11px] font-semibold text-red-700">
            {errorCount} {errorCount === 1 ? "error" : "errors"}
          </span>
        </button>
      )}
    </div>
  );
}

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = TIME_RANGE_OPTIONS.find((o) => o.value === value)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-background rounded-lg border border-border shadow-sm px-3 py-2 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Clock className="w-3 h-3 text-muted-foreground" />
        {current.label}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-background rounded-lg border border-border shadow-lg py-1 z-20 min-w-[140px]">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                opt.value === value
                  ? "bg-foreground text-background font-semibold"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
