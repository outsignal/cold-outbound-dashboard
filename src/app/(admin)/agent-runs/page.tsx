"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryState } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { AgentRunTable, AgentRun } from "@/components/operations/agent-run-table";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AgentRunsResponse {
  runs: AgentRun[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Options ───────────────────────────────────────────────────────────────────

const AGENT_OPTIONS = [
  { value: "research", label: "Research" },
  { value: "leads", label: "Leads" },
  { value: "writer", label: "Writer" },
  { value: "campaign", label: "Campaign" },
];

const STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AgentRunsPage() {
  const [data, setData] = useState<AgentRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [workspaces, setWorkspaces] = useState<string[]>([]);

  // URL-persisted filters
  const [agentFilter, setAgentFilter] = useQueryState("agent", {
    defaultValue: "all",
  });
  const [statusFilter, setStatusFilter] = useQueryState("status", {
    defaultValue: "all",
  });
  const [workspaceFilter, setWorkspaceFilter] = useQueryState("workspace", {
    defaultValue: "all",
  });

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch agent runs
  const fetchRuns = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agent", agentFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (workspaceFilter !== "all") params.set("workspace", workspaceFilter);
      params.set("page", String(page));
      params.set("limit", "50");

      try {
        const res = await fetch(`/api/agent-runs?${params.toString()}`);
        const json: AgentRunsResponse = await res.json();
        setData(json);
      } catch {
        // Silently fail on auto-refresh
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [agentFilter, statusFilter, workspaceFilter, page]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [agentFilter, statusFilter, workspaceFilter]);

  // Fetch on filter/page change
  useEffect(() => {
    fetchRuns(false);
  }, [fetchRuns]);

  // Discover unique workspaces from first load
  useEffect(() => {
    async function loadWorkspaces() {
      const res = await fetch("/api/agent-runs?limit=100");
      const json: AgentRunsResponse = await res.json();
      const slugs = Array.from(
        new Set(
          json.runs
            .map((r: AgentRun) => r.workspaceSlug)
            .filter((s): s is string => s !== null)
        )
      ).sort();
      setWorkspaces(slugs);
    }
    loadWorkspaces();
  }, []);

  // Auto-refresh every 30s when any run is "running"
  useEffect(() => {
    const hasRunning = data?.runs.some((r) => r.status === "running") ?? false;

    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    if (hasRunning) {
      autoRefreshRef.current = setInterval(() => {
        fetchRuns(true);
      }, 30_000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [data?.runs, fetchRuns]);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Agent Runs"
        description="Monitor all agent executions across workspaces"
      />

      <div className="flex-1 px-8 py-6 space-y-4">
        {/* Filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={agentFilter}
            onValueChange={(v) => setAgentFilter(v)}
          >
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Agents
              </SelectItem>
              {AGENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {workspaces.length > 0 && (
            <Select
              value={workspaceFilter}
              onValueChange={(v) => setWorkspaceFilter(v)}
            >
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <SelectValue placeholder="All Workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Workspaces
                </SelectItem>
                {workspaces.map((slug) => (
                  <SelectItem key={slug} value={slug} className="text-xs font-mono">
                    {slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2">
            {data && (
              <span className="text-xs text-muted-foreground">
                {data.total} run{data.total !== 1 ? "s" : ""}
              </span>
            )}
            {data?.runs.some((r) => r.status === "running") && (
              <span className="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                Auto-refreshing every 30s
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <AgentRunTable runs={data?.runs ?? []} loading={loading} />

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
