import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Domain } from "@/lib/api";

export function DomainsTable({ domains }: { domains: Domain[] }) {
  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No domains yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hostname</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Metrics port</TableHead>
            <TableHead>PID</TableHead>
            <TableHead>Restarts</TableHead>
            <TableHead>Last error</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain) => (
            <TableRow key={domain.id}>
              <TableCell className="font-medium">{domain.hostname}</TableCell>
              <TableCell className="text-muted-foreground">{domain.originUrl}</TableCell>
              <TableCell>
                <StatusBadge status={domain.status} />
              </TableCell>
              <TableCell>{domain.metricsPort}</TableCell>
              <TableCell>{domain.pid || "—"}</TableCell>
              <TableCell>{domain.restartCount}</TableCell>
              <TableCell className="max-w-48 truncate text-destructive" title={domain.lastError}>
                {domain.lastError || "—"}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm" render={<Link href={`/domains/${domain.id}`} />}>
                  <ArrowRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
