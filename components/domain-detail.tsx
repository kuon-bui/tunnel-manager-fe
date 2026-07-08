"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { EditOriginDialog } from "@/components/edit-origin-dialog";
import { LogsPanel } from "@/components/logs-panel";
import { MetricsPanel } from "@/components/metrics-panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDomain, useRestartDomain, useStopDomain } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";

export function DomainDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: domain, isPending, isError, error } = useDomain(id);
  const stopDomain = useStopDomain();
  const restartDomain = useRestartDomain();

  function handleStop() {
    stopDomain.mutate(id, {
      onSuccess: () => toast.success("Domain stopped"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to stop domain"),
    });
  }

  function handleRestart() {
    restartDomain.mutate(id, {
      onSuccess: () => toast.success("Domain restarted"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to restart domain"),
    });
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !domain) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/" />}>
          <ArrowLeft />
          Back to domains
        </Button>
        <p className="text-sm text-destructive">
          {error instanceof ApiError && error.status === 404
            ? "Domain not found."
            : error instanceof Error
              ? error.message
              : "Failed to load domain."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/" />}>
            <ArrowLeft />
            Back to domains
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{domain.hostname}</h1>
            <StatusBadge status={domain.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={stopDomain.isPending || domain.status === "stopped"}
          >
            <Square />
            Stop
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart} disabled={restartDomain.isPending}>
            <RotateCw />
            Restart
          </Button>
          <DeleteConfirmDialog id={id} hostname={domain.hostname} onDeleted={() => router.push("/")} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Configuration</CardTitle>
          <EditOriginDialog id={id} currentOriginUrl={domain.originUrl} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Origin URL</p>
            <p className="font-medium">{domain.originUrl}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Metrics port</p>
            <p className="font-medium">{domain.metricsPort}</p>
          </div>
          <div>
            <p className="text-muted-foreground">PID</p>
            <p className="font-medium">{domain.pid || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Restarts</p>
            <p className="font-medium">{domain.restartCount}</p>
          </div>
          {domain.lastError && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-muted-foreground">Last error</p>
              <p className="font-medium text-destructive">{domain.lastError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="logs">
          <LogsPanel id={id} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsPanel id={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
