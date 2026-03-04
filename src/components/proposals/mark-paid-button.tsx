"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function MarkPaidButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidManually: true }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" disabled={loading}>
          {loading ? "Updating..." : "Mark as Paid Manually"}
        </Button>
      }
      title="Mark as Paid"
      description="Mark this proposal as paid manually? This action records the payment without processing it through the payment system."
      confirmLabel="Mark as Paid"
      onConfirm={handleConfirm}
      disabled={loading}
    />
  );
}
