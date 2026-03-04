"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SignalStatusButtonProps {
  campaignId: string;
  currentStatus: string;
}

export function SignalStatusButton({
  campaignId,
  currentStatus,
}: SignalStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isPaused = currentStatus === "paused";
  const action = isPaused ? "resume" : "pause";
  const label = isPaused ? "Resume Campaign" : "Pause Campaign";

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/signal-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Signal status update failed:", data.error ?? res.statusText);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Signal status update error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={isPaused
        ? "border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
        : "border-yellow-700 text-yellow-400 hover:bg-yellow-900/30"
      }
    >
      {loading ? "Updating..." : label}
    </Button>
  );
}
