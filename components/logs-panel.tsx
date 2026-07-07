"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useLogs } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";

export function LogsPanel({ id }: { id: string }) {
  const { data: lines, isPending, isError, error } = useLogs(id);

  if (isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Failed to load logs."}
      </p>
    );
  }

  return (
    <pre className="h-96 overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {lines && lines.length > 0 ? lines.join("\n") : "No log lines yet."}
    </pre>
  );
}
