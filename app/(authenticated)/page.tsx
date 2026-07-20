"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateDomainDialog } from "@/components/create-domain-dialog";
import { DomainsTable } from "@/components/domains-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDomains } from "@/hooks/use-domains";

export default function DomainsPage() {
  const { data: domains, isPending, isError, error } = useDomains();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground">
            Manage Cloudflare Tunnel-backed domains and their cloudflared processes.
          </p>
        </div>
        <CreateDomainDialog />
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Can&apos;t reach the backend</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"} — check that the
            tunnel-manager backend is running and reachable.
          </AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DomainsTable domains={domains ?? []} />
      )}
    </div>
  );
}
