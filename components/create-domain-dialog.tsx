"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { DomainRoutesEditor } from "@/components/domain-routes-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCloudflareZones, useCreateDomain } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";
import { createDomainPayload, hostnameForZone, selectedZoneID } from "@/lib/api-config";
import {
  defaultEditableRoutes,
  toRouteInputs,
  validateEditableRoutes,
  type EditableRoute,
} from "@/lib/domain-routes";

export function CreateDomainDialog() {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [routes, setRoutes] = useState<EditableRoute[]>(() => defaultEditableRoutes());
  const [zoneId, setZoneId] = useState("");
  const createDomain = useCreateDomain();
  const zones = useCloudflareZones(open);
  const effectiveZoneId = selectedZoneID(zoneId, zones.data ?? []);
  const selectedZone = zones.data?.find((zone) => zone.id === effectiveZoneId);
  const fullHostname = hostnameForZone(hostname, selectedZone?.name ?? "");
  const hostnameOutsideZone = Boolean(hostname.trim() && selectedZone && !fullHostname);
  const routeError = validateEditableRoutes(routes);

  function resetForm() {
    setHostname("");
    setRoutes(defaultEditableRoutes());
    setZoneId("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!fullHostname) return;
    if (routeError) {
      toast.error(routeError);
      return;
    }
    createDomain.mutate(
      createDomainPayload(fullHostname, effectiveZoneId, toRouteInputs(routes)),
      {
        onSuccess: () => {
          toast.success(`Domain "${fullHostname}" created`);
          setOpen(false);
          resetForm();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Failed to create domain");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) resetForm();
    }}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Add domain
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Create a Cloudflare Tunnel-backed hostname with one or more path routes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                aria-describedby="hostname-description"
                placeholder="api-tunnel"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                required
              />
              <p
                id="hostname-description"
                className={hostnameOutsideZone ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {hostnameOutsideZone
                  ? `Hostname must be a name or belong to ${selectedZone?.name}.`
                  : fullHostname
                    ? `Full hostname: ${fullHostname}`
                    : "Enter a name; the selected zone will be added automatically."}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone">Cloudflare zone</Label>
              <select
                id="zone"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={effectiveZoneId}
                onChange={(event) => setZoneId(event.target.value)}
                disabled={zones.isPending || zones.isError || !zones.data?.length}
                required
              >
                <option value="" disabled>
                  {zones.isPending ? "Loading zones…" : zones.data?.length ? "Select a zone" : "No zones available"}
                </option>
                {zones.data?.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              {zones.isError && <p className="text-xs text-destructive">Failed to load Cloudflare zones.</p>}
            </div>
            <DomainRoutesEditor routes={routes} onChange={setRoutes} disabled={createDomain.isPending} />
            {routeError && <p className="text-xs text-destructive">{routeError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createDomain.isPending || !fullHostname || Boolean(routeError) || zones.isPending || zones.isError}
            >
              {createDomain.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
