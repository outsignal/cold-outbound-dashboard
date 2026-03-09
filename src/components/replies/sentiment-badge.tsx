"use client";

import { cn } from "@/lib/utils";
import { SENTIMENT_COLORS, type Sentiment } from "@/lib/classification/types";

interface SentimentBadgeProps {
  sentiment: string | null;
  overrideSentiment: string | null;
}

const DOT_COLORS: Record<Sentiment, string> = {
  positive: "bg-green-500",
  neutral: "bg-gray-400",
  negative: "bg-red-500",
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function SentimentBadge({
  sentiment,
  overrideSentiment,
}: SentimentBadgeProps) {
  const effective = (overrideSentiment ?? sentiment) as Sentiment | null;

  if (!effective) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        Unknown
      </span>
    );
  }

  const label = SENTIMENT_LABELS[effective] ?? effective;
  const colorClasses =
    SENTIMENT_COLORS[effective] ?? "bg-gray-100 text-gray-600";
  const dotColor = DOT_COLORS[effective] ?? "bg-gray-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClasses,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      {label}
    </span>
  );
}
