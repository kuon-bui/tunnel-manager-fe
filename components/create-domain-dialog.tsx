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
import { createDomainPayload } from "@/lib/api-config";

export function CreateDomainDialog() {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [zoneId, setZoneId] = useState("");
  const createDomain = useCreateDomain();
  const zones = useCloudflareZones(open);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createDomain.mutate(
      createDomainPayload(hostname, originUrl, zoneId),
      {
        onSuccess: () => {
          toast.success(`Domain "${hostname}" created`);
          setOpen(false);
          setHostname("");
          setOriginUrl("");
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
                placeholder="app.example.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                required
              />
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
              <Label htmlFor="zone">Cloudflare zone</Label>
              <select
                id="zone"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={zoneId}
                onChange={(event) => setZoneId(event.target.value)}
                required
              >
                <option value="" disabled>
                  {zones.isPending ? "Loading zones…" : "Select a zone"}
                </option>
                {zones.data?.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              {zones.isError && <p className="text-xs text-destructive">Failed to load Cloudflare zones.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createDomain.isPending || !zoneId || zones.isError}>
              {createDomain.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
