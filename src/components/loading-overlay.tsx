import { useState, useEffect, useRef } from "react";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";
import type { SourceProgress, SourceStatus } from "../types";

const FADE_IN_DELAY = 300;  // ms before showing (skip if query is instant)
const FADE_OUT_DELAY = 400; // ms to hold after done before fading out

interface LoadingOverlayProps {
  sources: SourceProgress[];
}

export function LoadingOverlay({ sources }: LoadingOverlayProps) {
  const doneCount = sources.filter((s) => s.status === "done").length;
  const allDone = sources.length > 0 && doneCount === sources.length;

  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (sources.length > 0 && !allDone) {
      // Delay showing to avoid flash on fast queries
      window.clearTimeout(hideTimer.current);
      setFading(false);
      showTimer.current = window.setTimeout(() => setVisible(true), FADE_IN_DELAY);
    }

    if (allDone && visible) {
      // Fade out after a short hold
      window.clearTimeout(showTimer.current);
      setFading(true);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, FADE_OUT_DELAY);
    }

    return () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, [sources, allDone, visible]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="bg-background rounded-xl border border-border shadow-lg p-5 w-72">
        <div className="flex items-center gap-2 mb-4">
          {allDone ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {allDone ? "Done" : "Loading infrastructure"}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {doneCount}/{sources.length}
          </span>
        </div>

        <div className="space-y-1.5">
          {sources.map((source) => (
            <SourceRow key={source.name} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: SourceProgress }) {
  return (
    <div className="flex items-center gap-2">
      <StatusIcon status={source.status} />
      <span
        className={`text-xs flex-1 ${
          source.status === "loading"
            ? "text-foreground font-medium"
            : source.status === "done"
              ? "text-muted-foreground"
              : source.status === "error"
                ? "text-red-600"
                : "text-muted-foreground/60"
        }`}
      >
        {source.name}
      </span>
      {source.detail && (
        <span className="text-[10px] text-muted-foreground">{source.detail}</span>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: SourceStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="w-3 h-3 text-gray-300" />;
    case "loading":
      return <Loader2 className="w-3 h-3 animate-spin text-foreground" />;
    case "done":
      return <Check className="w-3 h-3 text-green-500" />;
    case "error":
      return <AlertCircle className="w-3 h-3 text-red-500" />;
  }
}
