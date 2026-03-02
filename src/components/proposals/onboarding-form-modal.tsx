"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingInviteData {
  id: string;
  clientName: string;
  clientEmail?: string | null;
  status: string;
  createWorkspace: boolean;
  workspaceSlug?: string | null;
}

interface OnboardingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: OnboardingInviteData;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "completed", label: "Completed" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingFormModal({
  open,
  onOpenChange,
  invite,
}: OnboardingFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState(invite.clientName);
  const [clientEmail, setClientEmail] = useState(invite.clientEmail ?? "");
  const [status, setStatus] = useState(invite.status);
  const [createWorkspace, setCreateWorkspace] = useState(invite.createWorkspace);
  const [workspaceSlug, setWorkspaceSlug] = useState(invite.workspaceSlug ?? "");

  // Sync when invite or open changes
  useEffect(() => {
    if (!open) return;
    setClientName(invite.clientName);
    setClientEmail(invite.clientEmail ?? "");
    setStatus(invite.status);
    setCreateWorkspace(invite.createWorkspace);
    setWorkspaceSlug(invite.workspaceSlug ?? "");
    setError(null);
  }, [open, invite]);

  function handleClose() {
    if (saving) return;
    onOpenChange(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || null,
      status,
      createWorkspace,
    };

    if (workspaceSlug.trim()) {
      payload.workspaceSlug = workspaceSlug.trim();
    }

    try {
      const res = await fetch(`/api/onboarding-invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save onboarding invite");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Onboarding Invite</DialogTitle>
          <DialogDescription>
            Update onboarding invite details for {invite.clientName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="of-clientName">Client Name *</Label>
            <Input
              id="of-clientName"
              required
              placeholder="Acme Ltd"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          {/* Client Email */}
          <div className="space-y-1.5">
            <Label htmlFor="of-clientEmail">Client Email</Label>
            <Input
              id="of-clientEmail"
              type="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create Workspace toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="of-createWorkspace"
              checked={createWorkspace}
              onCheckedChange={(checked) =>
                setCreateWorkspace(checked === true)
              }
            />
            <Label htmlFor="of-createWorkspace" className="cursor-pointer">
              Create workspace on completion
            </Label>
          </div>

          {/* Workspace Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="of-workspaceSlug">Workspace Slug</Label>
            <Input
              id="of-workspaceSlug"
              placeholder="acme-ltd"
              value={workspaceSlug}
              onChange={(e) => setWorkspaceSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-generate from client name.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
