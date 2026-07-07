"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { useUpdateOrigin } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";

export function EditOriginDialog({ id, currentOriginUrl }: { id: string; currentOriginUrl: string }) {
  const [open, setOpen] = useState(false);
  const [originUrl, setOriginUrl] = useState(currentOriginUrl);
  const updateOrigin = useUpdateOrigin();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateOrigin.mutate(
      { id, originUrl },
      {
        onSuccess: () => {
          toast.success("Origin URL updated");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Failed to update origin URL");
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOriginUrl(currentOriginUrl);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil />
        Edit origin
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit origin URL</DialogTitle>
            <DialogDescription>Update where this domain routes traffic to.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="edit-origin-url">Origin URL</Label>
            <Input
              id="edit-origin-url"
              value={originUrl}
              onChange={(e) => setOriginUrl(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateOrigin.isPending}>
              {updateOrigin.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
