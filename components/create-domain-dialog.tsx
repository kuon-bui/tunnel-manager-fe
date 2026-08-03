"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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

export function CreateDomainDialog() {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [path, setPath] = useState("");
  const [zoneId, setZoneId] = useState("");
  const createDomain = useCreateDomain();
  const zones = useCloudflareZones(open);
  const effectiveZoneId = selectedZoneID(zoneId, zones.data ?? []);
  const selectedZone = zones.data?.find((zone) => zone.id === effectiveZoneId);
  const fullHostname = hostnameForZone(hostname, selectedZone?.name ?? "");
  const hostnameOutsideZone = Boolean(hostname.trim() && selectedZone && !fullHostname);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!fullHostname) return;
    createDomain.mutate(
      createDomainPayload(fullHostname, originUrl, path, effectiveZoneId),
      {
        onSuccess: () => {
          toast.success(`Domain "${fullHostname}" created`);
          setOpen(false);
          setHostname("");
          setOriginUrl("");
          setPath("");
          setZoneId("");
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Failed to create domain");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Add domain
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Create a Cloudflare Tunnel-backed domain routing to an origin URL.
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
              <Label htmlFor="origin-url">Origin URL</Label>
              <Input
                id="origin-url"
                placeholder="http://localhost:3001"
                value={originUrl}
                onChange={(e) => setOriginUrl(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="path">Path (optional)</Label>
              <Input
                id="path"
                aria-describedby="path-description"
                placeholder="/api/.*"
                value={path}
                onChange={(event) => setPath(event.target.value)}
              />
              <p id="path-description" className="text-xs text-muted-foreground">
                Leave empty to route every path for this hostname.
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
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createDomain.isPending || !fullHostname || zones.isPending || zones.isError}
            >
              {createDomain.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
