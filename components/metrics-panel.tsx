"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, useMetricsError } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";

export function MetricsPanel({ id }: { id: string }) {
  const { data: metrics, isPending, isError, error } = useMetrics(id);
  const { data: streamError } = useMetricsError(id);

  if (isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Failed to load metrics."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {streamError && <p className="text-sm text-destructive">{streamError}</p>}
      <pre className="h-96 overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {metrics || "No metrics available."}
      </pre>
    </div>
  );
}
