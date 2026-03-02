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
import { Textarea } from "@/components/ui/textarea";
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

export interface ProposalFormData {
  clientName?: string;
  clientEmail?: string;
  companyOverview?: string;
  packageType?: string;
  setupFee?: number;
  platformCost?: number;
  retainerCost?: number;
  status?: string;
}

interface ProposalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, modal is in "edit" mode (PATCH). If absent, modal is in "create" mode (POST). */
  proposalId?: string;
  /** Pre-populated field values (from parsed document or existing proposal) */
  initialData?: ProposalFormData;
  /** Human-readable mode label shown in dialog title */
  mode?: "edit" | "create-from-document" | "create";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_OPTIONS = [
  { value: "email", label: "Email Outbound" },
  { value: "linkedin", label: "LinkedIn Outbound" },
  { value: "email_linkedin", label: "Email + LinkedIn Outbound" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "paid", label: "Paid" },
  { value: "onboarding_complete", label: "Onboarding Complete" },
];

// Convert pence to pounds for display, pounds to pence for saving
function penceToPounds(pence: number | undefined): string {
  if (pence === undefined || pence === null) return "";
  return (pence / 100).toFixed(0);
}

function poundsToPence(pounds: string): number | undefined {
  const num = parseFloat(pounds.replace(/[£,\s]/g, ""));
  if (isNaN(num)) return undefined;
  return Math.round(num * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalFormModal({
  open,
  onOpenChange,
  proposalId,
  initialData,
  mode = proposalId ? "edit" : "create",
}: ProposalFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState(initialData?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail ?? "");
  const [companyOverview, setCompanyOverview] = useState(initialData?.companyOverview ?? "");
  const [packageType, setPackageType] = useState(initialData?.packageType ?? "email");
  const [setupFee, setSetupFee] = useState(penceToPounds(initialData?.setupFee));
  const [platformCost, setPlatformCost] = useState(penceToPounds(initialData?.platformCost));
  const [retainerCost, setRetainerCost] = useState(penceToPounds(initialData?.retainerCost));
  const [status, setStatus] = useState(initialData?.status ?? "draft");

  // Sync when initialData changes (e.g. after document parse)
  useEffect(() => {
    if (!open) return;
    setClientName(initialData?.clientName ?? "");
    setClientEmail(initialData?.clientEmail ?? "");
    setCompanyOverview(initialData?.companyOverview ?? "");
    setPackageType(initialData?.packageType ?? "email");
    setSetupFee(penceToPounds(initialData?.setupFee));
    setPlatformCost(penceToPounds(initialData?.platformCost));
    setRetainerCost(penceToPounds(initialData?.retainerCost));
    setStatus(initialData?.status ?? "draft");
    setError(null);
  }, [open, initialData]);

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

    const payload: ProposalFormData = {
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      companyOverview: companyOverview.trim() || undefined,
      packageType,
      status,
    };

    const setupFeeVal = poundsToPence(setupFee);
    const platformCostVal = poundsToPence(platformCost);
    const retainerCostVal = poundsToPence(retainerCost);
    if (setupFeeVal !== undefined) payload.setupFee = setupFeeVal;
    if (platformCostVal !== undefined) payload.platformCost = platformCostVal;
    if (retainerCostVal !== undefined) payload.retainerCost = retainerCostVal;

    try {
      let res: Response;
      if (proposalId) {
        // Edit mode
        res = await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create mode
        res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save proposal");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "edit"
      ? "Edit Proposal"
      : mode === "create-from-document"
        ? "Create Proposal from Document"
        : "Create Proposal";

  const description =
    mode === "edit"
      ? "Update proposal details below."
      : "Review the pre-filled fields parsed from your document, then save.";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-clientName">Client Name *</Label>
            <Input
              id="pf-clientName"
              required
              placeholder="Acme Ltd"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          {/* Client Email */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-clientEmail">Client Email</Label>
            <Input
              id="pf-clientEmail"
              type="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          {/* Company Overview */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-overview">Company Overview</Label>
            <Textarea
              id="pf-overview"
              placeholder="Brief description of the client's business..."
              rows={3}
              value={companyOverview}
              onChange={(e) => setCompanyOverview(e.target.value)}
            />
          </div>

          {/* Package Type */}
          <div className="space-y-1.5">
            <Label>Package Type</Label>
            <Select value={packageType} onValueChange={setPackageType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-setupFee">Setup Fee (£)</Label>
              <Input
                id="pf-setupFee"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={setupFee}
                onChange={(e) => setSetupFee(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-platformCost">Platform (£/mo)</Label>
              <Input
                id="pf-platformCost"
                type="number"
                min={0}
                step={1}
                placeholder="450"
                value={platformCost}
                onChange={(e) => setPlatformCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-retainerCost">Retainer (£/mo)</Label>
              <Input
                id="pf-retainerCost"
                type="number"
                min={0}
                step={1}
                placeholder="1050"
                value={retainerCost}
                onChange={(e) => setRetainerCost(e.target.value)}
              />
            </div>
          </div>

          {/* Status — only shown in edit mode */}
          {mode === "edit" && (
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
          )}

          {/* Error message */}
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
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Create Proposal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
