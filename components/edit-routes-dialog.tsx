"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { useReplaceRoutes } from "@/hooks/use-domains";
import { ApiError, type DomainRoute } from "@/lib/api";
import {
  editableRoutesFromDomain,
  toRouteInputs,
  validateEditableRoutes,
  type EditableRoute,
} from "@/lib/domain-routes";

export function EditRoutesDialog({
  id,
  routes,
  fallbackOriginUrl = "",
}: {
  id: string;
  routes: DomainRoute[];
  fallbackOriginUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftRoutes, setDraftRoutes] = useState<EditableRoute[]>(() =>
    editableRoutesFromDomain(routes, fallbackOriginUrl),
  );
  const replaceRoutes = useReplaceRoutes();
  const routeError = validateEditableRoutes(draftRoutes);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (routeError) {
      toast.error(routeError);
      return;
    }
    replaceRoutes.mutate(
      { id, routes: toRouteInputs(draftRoutes) },
      {
        onSuccess: () => {
          toast.success("Routes updated");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Failed to update routes");
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraftRoutes(editableRoutesFromDomain(routes, fallbackOriginUrl));
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil />
        Edit routes
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit routes</DialogTitle>
            <DialogDescription>
              Replace all path routes for this hostname in one update.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <DomainRoutesEditor
              routes={draftRoutes}
              onChange={setDraftRoutes}
              disabled={replaceRoutes.isPending}
            />
            {routeError && <p className="text-xs text-destructive">{routeError}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={replaceRoutes.isPending || Boolean(routeError)}>
              {replaceRoutes.isPending ? "Saving…" : "Save routes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
