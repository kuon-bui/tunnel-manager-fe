"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { useDeleteDomain } from "@/hooks/use-domains";
import { ApiError } from "@/lib/api";

export function DeleteConfirmDialog({
  id,
  hostname,
  onDeleted,
}: {
  id: string;
  hostname: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const deleteDomain = useDeleteDomain();

  function handleConfirm() {
    deleteDomain.mutate(id, {
      onSuccess: () => {
        toast.success(`Domain "${hostname}" deleted`);
        setOpen(false);
        onDeleted();
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to delete domain");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2 />
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {hostname}?</DialogTitle>
          <DialogDescription>
            This removes the Cloudflare tunnel and DNS record, and stops the cloudflared process.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteDomain.isPending}>
            {deleteDomain.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
