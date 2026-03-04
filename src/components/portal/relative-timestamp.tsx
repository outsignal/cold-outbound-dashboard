"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface RelativeTimestampProps {
  /** ISO string of when the data was last fetched (server render time) */
  timestamp: string;
}

export function RelativeTimestamp({ timestamp }: RelativeTimestampProps) {
  const [relative, setRelative] = useState<string | null>(null);
  const date = new Date(timestamp);

  useEffect(() => {
    // Set initial value on mount (avoids hydration mismatch)
    setRelative(formatRelative(date));

    const interval = setInterval(() => {
      setRelative(formatRelative(date));
    }, 15_000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      {relative !== null ? `Updated ${relative}` : `Updated ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
    </span>
  );
}
