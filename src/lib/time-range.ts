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
