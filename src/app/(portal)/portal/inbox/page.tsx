"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmailThreadList,
  type ThreadSummary,
} from "@/components/portal/email-thread-list";
import { EmailThreadView } from "@/components/portal/email-thread-view";

const ACTIVE_INTERVAL = 15_000;
const BACKGROUND_INTERVAL = 60_000;

export default function PortalInboxPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether we've auto-selected the first thread
  const hasAutoSelected = useRef(false);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/inbox/email/threads");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { threads: ThreadSummary[] };
      setThreads(data.threads);
      setError(null);
      return data.threads;
    } catch {
      setError("Failed to load inbox");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const load = async () => {
      const result = await fetchThreads();
      // Auto-select the first thread on initial load
      if (result && result.length > 0 && !hasAutoSelected.current) {
        setSelectedThreadId(result[0].threadId);
        hasAutoSelected.current = true;
      }
    };

    load();

    const getInterval = () =>
      document.visibilityState === "visible"
        ? ACTIVE_INTERVAL
        : BACKGROUND_INTERVAL;

    timer = setInterval(fetchThreads, getInterval());

    const handleVisibility = () => {
      clearInterval(timer);
      timer = setInterval(fetchThreads, getInterval());
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchThreads]);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-xl font-heading font-bold">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Email conversations from your campaigns
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: thread list */}
        <div className="w-[380px] shrink-0 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive text-center pt-12">
              {error}
            </div>
          ) : (
            <EmailThreadList
              threads={threads}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
            />
          )}
        </div>

        {/* Right panel: conversation view */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedThreadId !== null ? (
            <EmailThreadView
              threadId={selectedThreadId}
              onReplySent={fetchThreads}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Choose a thread from the left to view the full conversation and
                send a reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
