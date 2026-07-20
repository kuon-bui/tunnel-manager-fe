"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, changePassword } from "@/lib/api";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const byteLength = new TextEncoder().encode(newPassword).length;
    if (byteLength < 12 || byteLength > 72) {
      toast.error("New password must contain 12–72 UTF-8 bytes.");
      return;
    }
    if (newPassword !== confirmation) {
      toast.error("New password confirmation does not match.");
      return;
    }

    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password changed");
      setOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" className="w-full justify-start" />}>
        <KeyRound />
        <span>Change password</span>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>All older sessions will be signed out immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <PasswordField id="current-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordField id="new-password" label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
            <PasswordField id="confirm-password" label="Confirm new password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Changing…" : "Change password"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="password" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required /></div>;
}
