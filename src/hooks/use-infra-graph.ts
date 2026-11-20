import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildInfraGraph } from "../graph-builder";
import type { ConnectionConfig, SourceProgress } from "../types";
import { timeRangeToMs, type TimeRange } from "../lib/time-range";

export function useInfraGraph(config: ConnectionConfig | null, accountId: string, timeRange: TimeRange = "5m") {
  const queryClient = useQueryClient();
  const timeRangeMs = timeRangeToMs(timeRange);
  const [progress, setProgress] = useState<SourceProgress[]>([]);

  const query = useQuery({
    queryKey: ["infra-graph", accountId, config?.region, config?.endpoint, timeRange],
    queryFn: () => buildInfraGraph(config!, accountId, timeRangeMs, setProgress),
    enabled: !!config,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.refetchQueries({
      queryKey: ["infra-graph", accountId, config?.region, config?.endpoint, timeRange],
    });
  };

  return {
    graph: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    progress: query.isLoading ? progress : undefined,
    refresh,
  };
}
