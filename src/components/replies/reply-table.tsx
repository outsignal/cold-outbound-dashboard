"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IntentBadge } from "./intent-badge";
import { SentimentBadge } from "./sentiment-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Reply {
  id: string;
  workspaceSlug: string;
  senderEmail: string;
  senderName: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: string;
  campaignName: string | null;
  campaignId: string | null;
  sequenceStep: number | null;
  intent: string | null;
  sentiment: string | null;
  objectionSubtype: string | null;
  classificationSummary: string | null;
  classifiedAt: string | null;
  overrideIntent: string | null;
  overrideSentiment: string | null;
  overrideObjSubtype: string | null;
  overriddenAt: string | null;
  outboundSubject: string | null;
  outboundBody: string | null;
  source: string;
  personId: string | null;
  effectiveIntent: string | null;
  effectiveSentiment: string | null;
}

interface ReplyTableProps {
  replies: Reply[];
  onSelect: (reply: Reply) => void;
  selectedId: string | null;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function truncate(text: string, len: number): string {
  if (text.length <= len) return text;
  return text.slice(0, len).trimEnd() + "...";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplyTable({
  replies,
  onSelect,
  selectedId,
  loading,
}: ReplyTableProps) {
  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <th className="whitespace-nowrap px-4 py-2.5">Sender</th>
            <th className="whitespace-nowrap px-4 py-2.5">Subject</th>
            <th className="whitespace-nowrap px-4 py-2.5">Intent</th>
            <th className="whitespace-nowrap px-4 py-2.5">Sentiment</th>
            <th className="whitespace-nowrap px-4 py-2.5">Workspace</th>
            <th className="whitespace-nowrap px-4 py-2.5">Time</th>
            <th className="whitespace-nowrap px-4 py-2.5">Preview</th>
          </tr>
        </thead>
        <tbody>
          {replies.map((reply) => (
            <tr
              key={reply.id}
              onClick={() => onSelect(reply)}
              className={cn(
                "cursor-pointer border-b transition-colors hover:bg-muted/40",
                selectedId === reply.id && "bg-muted",
              )}
            >
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex flex-col">
                  {reply.senderName && (
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {reply.senderName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                    {reply.senderEmail}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 max-w-[200px]">
                <span className="truncate block text-sm">
                  {reply.subject ?? "(no subject)"}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <IntentBadge
                  intent={reply.intent}
                  overrideIntent={reply.overrideIntent}
                />
              </td>
              <td className="px-4 py-2.5">
                <SentimentBadge
                  sentiment={reply.sentiment}
                  overrideSentiment={reply.overrideSentiment}
                />
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {reply.workspaceSlug}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                {relativeTime(reply.receivedAt)}
              </td>
              <td className="px-4 py-2.5 max-w-[250px]">
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {truncate(reply.bodyText, 100)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
