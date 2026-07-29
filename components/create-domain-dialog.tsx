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
import { useCreateDomain } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";
import { createDomainPayload } from "@/lib/api-config";

export function CreateDomainDialog() {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [path, setPath] = useState("");
  const createDomain = useCreateDomain();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createDomain.mutate(
      createDomainPayload(hostname, originUrl, path),
      {
        onSuccess: () => {
          toast.success(`Domain "${hostname}" created`);
          setOpen(false);
          setHostname("");
          setOriginUrl("");
          setPath("");
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
              <Label htmlFor="path">Path (optional)</Label>
              <Input
                id="path"
                aria-describedby="path-description"
                placeholder="/api/.*"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
              <p id="path-description" className="text-xs text-muted-foreground">
                Leave empty to route every path for this hostname.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createDomain.isPending}>
              {createDomain.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
