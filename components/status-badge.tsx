import { cn } from "@/lib/utils";
import type { DomainStatus } from "@/lib/api";

const STATUS_STYLES: Record<DomainStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-red-500/15 text-red-700 dark:text-red-400",
  stopped: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const STATUS_LABELS: Record<DomainStatus, string> = {
  active: "Active",
  pending: "Pending",
  error: "Error",
  stopped: "Stopped",
};

export function StatusBadge({ status }: { status: DomainStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
