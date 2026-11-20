import { AlertTriangle, X, ChevronDown, ChevronRight, ShieldAlert, Zap, Link2Off, Settings, Ban } from "lucide-react";
import { useState } from "react";
import type { ErrorSummary, ErrorType } from "../../types";

interface ErrorsPanelProps {
  errors: ErrorSummary[];
  onClose: () => void;
  onErrorClick: (resourceArn: string) => void;
}

export function ErrorsPanel({ errors, onClose, onErrorClick }: ErrorsPanelProps) {
  return (
    <div className="w-80 border-l border-border bg-background overflow-y-auto flex-shrink-0">
      <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center gap-2 z-10">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold flex-1">
          Errors ({errors.length})
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {errors.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No errors detected in the last hour
        </div>
      ) : (
        <div className="divide-y divide-border">
          {errors.map((error, i) => (
            <ErrorItem
              key={i}
              error={error}
              onClick={() => onErrorClick(error.resourceArn)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorItem({
  error,
  onClick,
}: {
  error: ErrorSummary;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const icon = errorIcon(error.errorType);
  const color = errorColor(error.errorType);

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 text-left"
      >
        <div className={`mt-0.5 ${color}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {errorTypeLabel(error.errorType)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
              {error.count}x
            </span>
          </div>
          <div
            className="text-[11px] text-muted-foreground truncate mt-0.5 cursor-pointer hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {error.resourceArn}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 ml-6 space-y-2">
          {error.details.slice(0, 5).map((detail, j) => (
            <div key={j} className="text-[10px] space-y-0.5">
              <div className="font-mono text-red-600">
                {detail.errorCode}
              </div>
              {detail.action && (
                <div className="text-muted-foreground">
                  Action: <span className="font-mono">{detail.action}</span>
                </div>
              )}
              {detail.sourceArn && (
                <div className="text-muted-foreground truncate">
                  Caller: <span className="font-mono">{detail.sourceArn}</span>
                </div>
              )}
            </div>
          ))}
          {error.details.length > 5 && (
            <div className="text-[10px] text-muted-foreground">
              + {error.details.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function errorIcon(type: ErrorType) {
  switch (type) {
    case "access_denied":
      return <ShieldAlert className="w-3.5 h-3.5" />;
    case "throttled":
      return <Zap className="w-3.5 h-3.5" />;
    case "broken_ref":
      return <Link2Off className="w-3.5 h-3.5" />;
    case "config_error":
      return <Settings className="w-3.5 h-3.5" />;
    default:
      return <Ban className="w-3.5 h-3.5" />;
  }
}

function errorColor(type: ErrorType): string {
  switch (type) {
    case "access_denied":
      return "text-red-500";
    case "throttled":
      return "text-amber-500";
    case "broken_ref":
      return "text-orange-500";
    case "config_error":
      return "text-yellow-600";
    default:
      return "text-red-400";
  }
}

function errorTypeLabel(type: ErrorType): string {
  switch (type) {
    case "access_denied":
      return "Access Denied";
    case "delivery_failure":
      return "Delivery Failure";
    case "unhealthy":
      return "Unhealthy";
    case "broken_ref":
      return "Missing Resource";
    case "throttled":
      return "Throttled";
    case "config_error":
      return "Configuration Error";
  }
}
