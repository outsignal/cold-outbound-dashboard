"use client";

import { useState } from "react";
import { FileDown, Send, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { formatGBP, formatInvoiceDate } from "@/lib/invoices/format";
import type { InvoiceWithLineItems } from "@/lib/invoices/types";
import { toast } from "sonner";

interface InvoiceDetailDialogProps {
  invoice: InvoiceWithLineItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

/**
 * Parse address string into display lines.
 * Matches the parseAddress logic in pdf.tsx.
 */
function parseAddress(raw: string | null): string[] {
  if (!raw) return [];
  if (raw.includes("\n")) return raw.split("\n").filter(Boolean);
  const parts = raw.split(", ").filter(Boolean);
  if (parts.length <= 1) return parts;
  if (parts.length <= 3) return parts;
  const postcode = parts[parts.length - 1];
  const city = parts[parts.length - 2];
  const streetLines = parts.slice(0, -2).join(", ");
  return [streetLines, city, postcode];
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  onRefresh,
}: InvoiceDetailDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const canSend = invoice.status === "draft" || invoice.status === "overdue";
  const canMarkPaid = invoice.status === "sent" || invoice.status === "overdue";

  const senderLines = parseAddress(invoice.senderAddress);
  const clientLines = parseAddress(invoice.clientAddress);

  const bankDetailsLines = invoice.bankDetails
    ? invoice.bankDetails.includes("\n")
      ? invoice.bankDetails.split("\n").filter(Boolean)
      : invoice.bankDetails.split(", ").filter(Boolean)
    : [];

  async function handleSend() {
    if (!invoice) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Invoice sent");
        onRefresh();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to send" }));
        toast.error(err.error ?? "Failed to send invoice");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (res.ok) {
        toast.success("Invoice marked as paid");
        onRefresh();
      } else {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update" }));
        toast.error(err.error ?? "Failed to mark invoice as paid");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoiceNumber} details
          </DialogDescription>
        </DialogHeader>

        {/* Invoice document — matches PDF layout */}
        <div className="px-10 pt-10 pb-6">
          {/* ── Title: "I N V O I C E" + rule ── */}
          <div className="flex items-center gap-4 mb-9">
            <span className="text-sm font-bold text-zinc-900 tracking-[0.45em] uppercase shrink-0">
              I N V O I C E
            </span>
            <div className="flex-1 h-[1.5px]" style={{ backgroundColor: "#F0FF7A" }} />
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          {/* ── Address: sender left, bill-to right ── */}
          <div className="flex justify-between mb-8">
            <div>
              <p className="text-base text-zinc-900 mb-2">
                {invoice.senderName}
              </p>
              {senderLines.map((line, i) => (
                <p key={i} className="text-[10px] text-zinc-900 leading-relaxed">
                  {line}
                </p>
              ))}
              {invoice.senderEmail && (
                <p className="text-[10px] text-zinc-900 leading-relaxed">
                  {invoice.senderEmail}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Bill To:
              </p>
              {invoice.clientCompanyName && (
                <p className="text-[11px] font-bold text-zinc-900 uppercase mb-1">
                  {invoice.clientCompanyName}
                </p>
              )}
              {clientLines.map((line, i) => (
                <p key={i} className="text-[10px] text-zinc-900 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* ── Metadata bar (dark) ── */}
          <div className="flex rounded bg-zinc-900 mb-7 overflow-hidden">
            <div className="flex-1 px-3.5 py-3">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Invoice #
              </p>
              <p className="text-[11px] font-bold text-white">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-3">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Invoice Date
              </p>
              <p className="text-[11px] font-bold text-white">
                {formatInvoiceDate(new Date(invoice.issueDate))}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-3">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Due Date
              </p>
              <p className="text-[11px] font-bold text-white">
                {formatInvoiceDate(new Date(invoice.dueDate))}
              </p>
            </div>
            <div className="flex-1 px-3.5 py-3 bg-zinc-800">
              <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Amount Due
              </p>
              <p className="text-[13px] font-bold" style={{ color: "#F0FF7A" }}>
                {formatGBP(invoice.totalPence)}
              </p>
            </div>
          </div>

          {/* ── Line items table ── */}
          {/* Header */}
          <div className="flex px-2.5 py-2.5 border-b-[1.5px] border-zinc-900 mb-0.5">
            <span className="flex-[3] text-[9px] font-bold text-zinc-900 uppercase tracking-wider">
              Items
            </span>
            <span className="flex-1 text-[9px] font-bold text-zinc-900 uppercase tracking-wider text-center">
              Quantity
            </span>
            <span className="flex-[1.5] text-[9px] font-bold text-zinc-900 uppercase tracking-wider text-right">
              Price
            </span>
            <span className="flex-[1.5] text-[9px] font-bold text-zinc-900 uppercase tracking-wider text-right">
              Amount
            </span>
          </div>
          {/* Rows */}
          {invoice.lineItems.map((item) => (
            <div
              key={item.id}
              className="flex px-2.5 py-3 border-b border-zinc-200"
            >
              <span className="flex-[3] text-[10px] text-zinc-900">
                {item.description}
              </span>
              <span className="flex-1 text-[10px] text-zinc-900 text-center tabular-nums">
                {item.quantity.toFixed(1)}
              </span>
              <span className="flex-[1.5] text-[10px] text-zinc-900 text-right tabular-nums">
                {formatGBP(item.unitPricePence)}
              </span>
              <span className="flex-[1.5] text-[10px] text-zinc-900 text-right tabular-nums">
                {formatGBP(item.amountPence)}
              </span>
            </div>
          ))}

          {/* ── Bottom: notes left, totals right ── */}
          <div className="flex mt-8 border-t-[1.5px] border-zinc-200 pt-5">
            {/* Notes / bank details */}
            <div className="flex-1 pr-8">
              {bankDetailsLines.length > 0 && (
                <>
                  <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider mb-2">
                    Notes:
                  </p>
                  {bankDetailsLines.map((line, i) => (
                    <p key={i} className="text-[9px] text-zinc-600 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </>
              )}
            </div>

            {/* Totals */}
            <div className="w-[220px]">
              <div className="flex justify-between py-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Sub-Total
                </span>
                <span className="text-[10px] text-zinc-900 tabular-nums">
                  {formatGBP(invoice.subtotalPence)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Tax Rate
                </span>
                <span className="text-[10px] text-zinc-900 tabular-nums">
                  {invoice.taxRate}%
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Tax
                </span>
                <span className="text-[10px] text-zinc-900 tabular-nums">
                  {formatGBP(invoice.taxAmountPence)}
                </span>
              </div>
              <div className="h-[1.5px] bg-zinc-900 my-1.5" />
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[13px] font-bold text-zinc-900 uppercase">
                  Total
                </span>
                <span className="text-base font-bold text-zinc-900 tabular-nums">
                  {formatGBP(invoice.totalPence)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <DialogFooter className="px-10 pb-6 pt-2 gap-2 sm:gap-2 border-t border-zinc-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")
            }
            disabled={loading}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>

          {canSend && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={handleSend}
              disabled={loading}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Send
            </Button>
          )}

          {canMarkPaid && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={handleMarkPaid}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Mark Paid
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
