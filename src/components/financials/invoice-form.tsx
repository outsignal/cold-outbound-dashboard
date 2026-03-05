"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatGBP } from "@/lib/invoices/format";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unitPricePounds: string; // user-facing pounds input, converted to pence on submit
}

interface Workspace {
  slug: string;
  name: string;
  billingRetainerPence: number | null;
  billingPlatformFeePence: number | null;
  invoiceTaxRate: number | null;
}

interface InvoiceFormProps {
  workspaces: Workspace[];
  onCreated: () => void;
  trigger: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function poundsToString(pence: number | null): string {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceForm({ workspaces, onCreated, trigger }: InvoiceFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPricePounds: "" },
  ]);

  // Derived state
  const selectedWorkspace = workspaces.find((w) => w.slug === workspaceSlug) ?? null;
  const taxRate = selectedWorkspace?.invoiceTaxRate ?? 0;

  // When workspace changes, pre-populate default line items
  useEffect(() => {
    if (!selectedWorkspace) {
      setLineItems([{ description: "", quantity: 1, unitPricePounds: "" }]);
      return;
    }

    const defaults: LineItem[] = [];

    if (selectedWorkspace.billingRetainerPence != null) {
      defaults.push({
        description: "Cold Outbound Retainer",
        quantity: 1,
        unitPricePounds: poundsToString(selectedWorkspace.billingRetainerPence),
      });
    }

    if (selectedWorkspace.billingPlatformFeePence != null) {
      defaults.push({
        description: "Cold Outbound Platform Fee",
        quantity: 1,
        unitPricePounds: poundsToString(selectedWorkspace.billingPlatformFeePence),
      });
    }

    if (defaults.length === 0) {
      defaults.push({ description: "", quantity: 1, unitPricePounds: "" });
    }

    setLineItems(defaults);
  }, [workspaceSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed totals
  const subtotalPence = lineItems.reduce((sum, item) => {
    const unitPence = Math.round((parseFloat(item.unitPricePounds) || 0) * 100);
    return sum + item.quantity * unitPence;
  }, 0);
  const taxAmountPence = Math.round((subtotalPence * taxRate) / 100);
  const totalPence = subtotalPence + taxAmountPence;

  // Line item helpers
  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPricePounds: "" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setWorkspaceSlug("");
    setIssueDate(todayIso());
    setBillingPeriodStart("");
    setBillingPeriodEnd("");
    setLineItems([{ description: "", quantity: 1, unitPricePounds: "" }]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceSlug) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        workspaceSlug,
        issueDate: new Date(issueDate).toISOString(),
        billingPeriodStart: billingPeriodStart
          ? new Date(billingPeriodStart).toISOString()
          : undefined,
        billingPeriodEnd: billingPeriodEnd
          ? new Date(billingPeriodEnd).toISOString()
          : undefined,
        lineItems: lineItems
          .filter((item) => item.description.trim())
          .map((item) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPricePence: Math.round((parseFloat(item.unitPricePounds) || 0) * 100),
          })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        setOpen(false);
        onCreated();
        toast.success("Invoice created");
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to create invoice" }));
        setError(err.error ?? "Failed to create invoice");
        toast.error("Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a workspace. Line items will be pre-filled from the
              workspace billing configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Workspace + Issue Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace *</Label>
                <Select value={workspaceSlug} onValueChange={setWorkspaceSlug}>
                  <SelectTrigger id="workspace" aria-label="Select workspace">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.slug} value={ws.slug}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="billingPeriodStart">Billing Period Start</Label>
                <Input
                  id="billingPeriodStart"
                  type="date"
                  value={billingPeriodStart}
                  onChange={(e) => setBillingPeriodStart(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billingPeriodEnd">Billing Period End</Label>
                <Input
                  id="billingPeriodEnd"
                  type="date"
                  value={billingPeriodEnd}
                  onChange={(e) => setBillingPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={addLineItem}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add item
                </Button>
              </div>

              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_60px_90px_28px] gap-2 text-[11px] font-medium text-muted-foreground px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit Price (£)</span>
                  <span />
                </div>

                {lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_60px_90px_28px] gap-2 items-center"
                  >
                    <Input
                      placeholder="e.g. Cold Outbound Retainer"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, "description", e.target.value)}
                      className="text-sm h-8"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="text-sm h-8"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPricePounds}
                      onChange={(e) => updateLineItem(index, "unitPricePounds", e.target.value)}
                      className="text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals preview */}
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatGBP(subtotalPence)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span className="tabular-nums">{formatGBP(taxAmountPence)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                <span>Total</span>
                <span className="tabular-nums">{formatGBP(totalPence)}</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!workspaceSlug || submitting || lineItems.filter((i) => i.description.trim()).length === 0}
            >
              {submitting ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
