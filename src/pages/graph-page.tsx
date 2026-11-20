import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InfraCanvas } from "../components/infra-canvas";
import { useInfraGraph } from "../hooks/use-infra-graph";
import type { ConnectionConfig } from "../types";
import type { TimeRange } from "../components/toolbar/graph-toolbar";

interface GraphPageProps {
  config: ConnectionConfig | null;
  accountId: string;
}

export function GraphPage({ config, accountId }: GraphPageProps) {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("5m");
  const { graph, isLoading, progress, refresh } = useInfraGraph(config, accountId, timeRange);

  useEffect(() => {
    if (!config) {
      navigate("/", { replace: true });
    }
  }, [config, navigate]);

  if (!config) return null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <InfraCanvas
        graph={graph}
        isLoading={isLoading}
        onRefresh={refresh}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        loadingProgress={progress}
      />
    </div>
  );
}
