"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "brand" }
> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
};

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={
      status === "paid"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
        : status === "sent"
          ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
          : undefined
    }>
      {config.label}
    </Badge>
  );
}
