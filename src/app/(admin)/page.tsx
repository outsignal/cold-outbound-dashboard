"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useQueryState } from "nuqs";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ClientFilter } from "@/components/dashboard/client-filter";
import { ActivityChart, ActivityChartLegend } from "@/components/dashboard/activity-chart";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import {
  OverviewTable,
  type WorkspaceSummary,
} from "@/components/dashboard/overview-table";
import type {
  DashboardStatsResponse,
  DashboardKPIs,
  TimeSeriesPoint,
  DashboardAlert,
  WorkspaceOption,
} from "@/app/api/dashboard/stats/route";
import { cn } from "@/lib/utils";

function WorkerStatusChip({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          online ? "bg-emerald-500 animate-pulse" : "bg-red-500"
        )}
      />
      <span className={cn("font-medium", online ? "text-emerald-600" : "text-red-500")}>
        {online ? "Worker Online" : "Worker Offline"}
      </span>
    </div>
  );
}

// Fallback empty KPIs
const emptyKpis: DashboardKPIs = {
  emailSent: 0,
  emailOpened: 0,
  emailReplied: 0,
  emailInterested: 0,
  emailBounced: 0,
  linkedinConnect: 0,
  linkedinMessage: 0,
  linkedinProfileView: 0,
  linkedinPending: 0,
  linkedinFailed: 0,
  pipelineContacted: 0,
  pipelineReplied: 0,
  pipelineInterested: 0,
  pipelineMeetings: 0,
  sendersHealthy: 0,
  sendersWarning: 0,
  sendersPaused: 0,
  sendersBlocked: 0,
  sendersSessionExpired: 0,
  sendersActiveTotal: 0,
  campaignsActive: 0,
  campaignsPaused: 0,
  campaignsDraft: 0,
  inboxesConnected: 0,
  inboxesDisconnected: 0,
  workerOnline: false,
  workerLastPollAt: null,
};

function buildWorkspaceSummaries(
  workspaces: WorkspaceOption[],
  kpis: DashboardKPIs
): WorkspaceSummary[] {
  // When viewing "all", we don't have per-workspace breakdown from this endpoint.
  // Return minimal summary rows for each workspace.
  return workspaces.map((ws) => ({
    slug: ws.slug,
    name: ws.name,
    activeCampaigns: 0,
    totalLeads: 0,
    replyRate: 0,
    bounceRate: 0,
    flaggedSenders: 0,
  }));
}

function KpiSkeleton() {
  return <Skeleton className="h-[88px] rounded-lg" />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Pipeline row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      {/* Email card */}
      <Card>
        <CardHeader><div className="h-4 w-16 bg-muted rounded animate-pulse" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
          <div className="h-[240px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
      {/* LinkedIn card */}
      <Card>
        <CardHeader><div className="h-4 w-20 bg-muted rounded animate-pulse" /></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        </CardContent>
      </Card>
      {/* System Health card */}
      <Card>
        <CardHeader><div className="h-4 w-28 bg-muted rounded animate-pulse" /></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [workspace] = useQueryState("workspace", { defaultValue: "all" });
  const [days] = useQueryState("days", { defaultValue: "7" });

  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ workspace, days });
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardStatsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [workspace, days]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const kpis = data?.kpis ?? emptyKpis;
  const timeSeries: TimeSeriesPoint[] = data?.timeSeries ?? [];
  const alerts: DashboardAlert[] = data?.alerts ?? [];
  const workspaces: WorkspaceOption[] = data?.workspaces ?? [];

  const totalReplies = kpis.emailReplied + kpis.emailInterested;
  const replyRate =
    kpis.emailSent > 0
      ? ((totalReplies / kpis.emailSent) * 100).toFixed(1)
      : "—";
  const bounceRate =
    kpis.emailSent > 0
      ? ((kpis.emailBounced / kpis.emailSent) * 100).toFixed(1)
      : "—";

  const unhealthySenders =
    kpis.sendersWarning + kpis.sendersPaused + kpis.sendersBlocked + kpis.sendersSessionExpired;

  return (
    <div>
      {/* 1. Header + Alerts — unchanged */}
      <Header
        title="Dashboard"
        description={`${days === "7" ? "Last 7 days" : days === "14" ? "Last 14 days" : days === "30" ? "Last 30 days" : "Last 90 days"} ${workspace !== "all" ? `· ${workspace}` : "· all campaigns"}`}
        actions={
          <div className="flex items-center gap-3">
            <WorkerStatusChip online={kpis.workerOnline} />
            <ClientFilter workspaces={workspaces} />
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Alerts */}
        {!loading && alerts.length > 0 && (
          <AlertsSection alerts={alerts} />
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* 2. Pipeline Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Contacted"
                value={kpis.pipelineContacted.toLocaleString()}
                trend="neutral"
              />
              <MetricCard
                label="Replied"
                value={kpis.pipelineReplied.toLocaleString()}
                trend={kpis.pipelineReplied > 0 ? "up" : "neutral"}
                detail={
                  kpis.pipelineContacted > 0
                    ? `${((kpis.pipelineReplied / kpis.pipelineContacted) * 100).toFixed(1)}% reply rate`
                    : undefined
                }
              />
              <MetricCard
                label="Interested"
                value={kpis.pipelineInterested.toLocaleString()}
                trend={kpis.pipelineInterested > 0 ? "up" : "neutral"}
              />
              <MetricCard
                label="Meetings Booked"
                value={kpis.pipelineMeetings.toLocaleString()}
                trend={kpis.pipelineMeetings > 0 ? "up" : "neutral"}
                featured
              />
            </div>

            {/* 3. Email Performance */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Email</CardTitle>
                <ActivityChartLegend />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="Reply Rate"
                    value={replyRate === "—" ? "—" : `${replyRate}%`}
                    trend={Number(replyRate) > 0 ? "up" : "neutral"}
                    detail={`${totalReplies.toLocaleString()} replies from ${kpis.emailSent.toLocaleString()} sent`}
                    density="compact"
                    featured
                  />
                  <MetricCard
                    label="Emails Sent"
                    value={kpis.emailSent.toLocaleString()}
                    trend="neutral"
                    density="compact"
                  />
                  <MetricCard
                    label="Opened"
                    value={kpis.emailOpened.toLocaleString()}
                    trend="neutral"
                    detail={
                      kpis.emailSent > 0
                        ? `${((kpis.emailOpened / kpis.emailSent) * 100).toFixed(1)}% open rate`
                        : undefined
                    }
                    density="compact"
                  />
                  <MetricCard
                    label="Bounces"
                    value={kpis.emailBounced.toLocaleString()}
                    trend={kpis.emailBounced > 0 ? "down" : "neutral"}
                    detail={`${bounceRate}% bounce rate`}
                    density="compact"
                  />
                </div>
                {error ? (
                  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    {error}
                  </div>
                ) : timeSeries.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    No activity data for this period
                  </div>
                ) : (
                  <ActivityChart data={timeSeries} />
                )}
              </CardContent>
            </Card>

            {/* 4. LinkedIn Activity */}
            <Card>
              <CardHeader>
                <CardTitle>LinkedIn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="Profile Views"
                    value={kpis.linkedinProfileView.toLocaleString()}
                    trend={kpis.linkedinProfileView > 0 ? "up" : "neutral"}
                    density="compact"
                  />
                  <MetricCard
                    label="Connections Sent"
                    value={kpis.linkedinConnect.toLocaleString()}
                    trend={kpis.linkedinConnect > 0 ? "up" : "neutral"}
                    detail={`${kpis.linkedinPending} pending`}
                    density="compact"
                  />
                  <MetricCard
                    label="Messages Sent"
                    value={kpis.linkedinMessage.toLocaleString()}
                    trend={kpis.linkedinMessage > 0 ? "up" : "neutral"}
                    density="compact"
                  />
                  <MetricCard
                    label="Failed Actions"
                    value={kpis.linkedinFailed.toLocaleString()}
                    trend={kpis.linkedinFailed > 0 ? "warning" : "neutral"}
                    density="compact"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Link href="/senders" className="block">
                    <MetricCard
                      label="Sender Health"
                      value={`${kpis.sendersHealthy}/${kpis.sendersActiveTotal || kpis.sendersHealthy + unhealthySenders}`}
                      trend={unhealthySenders > 0 ? "warning" : "up"}
                      detail={unhealthySenders > 0 ? `${unhealthySenders} need attention` : "All healthy"}
                      density="compact"
                    />
                  </Link>
                  <MetricCard
                    label="Active Campaigns"
                    value={kpis.campaignsActive.toLocaleString()}
                    trend={kpis.campaignsActive > 0 ? "up" : "neutral"}
                    detail={`${kpis.campaignsPaused} paused, ${kpis.campaignsDraft} drafts`}
                    density="compact"
                  />
                  <MetricCard
                    label="Inboxes"
                    value={kpis.inboxesConnected.toLocaleString()}
                    trend={kpis.inboxesDisconnected > 0 ? "warning" : "up"}
                    detail={kpis.inboxesDisconnected > 0 ? `${kpis.inboxesDisconnected} disconnected` : "All connected"}
                    density="compact"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* 6. Workspace Overview — unchanged */}
        <Card>
          <CardHeader>
            <CardTitle>
              Workspace Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <OverviewTable
                summaries={buildWorkspaceSummaries(workspaces, kpis)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
