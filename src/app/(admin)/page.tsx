"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useQueryState } from "nuqs";
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
      <Header
        title="Dashboard"
        description={`${days === "7" ? "Last 7 days" : days === "14" ? "Last 14 days" : days === "30" ? "Last 30 days" : "Last 90 days"} ${workspace !== "all" ? `· ${workspace}` : "· all campaigns"}`}
        actions={<ClientFilter workspaces={workspaces} />}
      />

      <div className="p-6 space-y-5">
        {/* Alerts — shown above KPIs so critical items are immediately visible */}
        {!loading && alerts.length > 0 && (
          <AlertsSection alerts={alerts} />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              {/* Email KPIs */}
              <MetricCard
                label="Emails Sent"
                value={kpis.emailSent.toLocaleString()}
                trend="neutral"
              />
              <MetricCard
                label="Replies"
                value={totalReplies.toLocaleString()}
                trend={totalReplies > 0 ? "up" : "neutral"}
                detail={`${replyRate}% reply rate`}
              />
              <MetricCard
                label="Bounces"
                value={kpis.emailBounced.toLocaleString()}
                trend={kpis.emailBounced > 0 ? "down" : "neutral"}
                detail={kpis.emailBounced > 0 ? `${bounceRate}% bounce rate` : "Clean"}
              />

              {/* LinkedIn KPIs */}
              <MetricCard
                label="LI Connections"
                value={kpis.linkedinConnect.toLocaleString()}
                trend={kpis.linkedinConnect > 0 ? "up" : "neutral"}
              />
              <MetricCard
                label="LI Messages"
                value={kpis.linkedinMessage.toLocaleString()}
                trend={kpis.linkedinMessage > 0 ? "up" : "neutral"}
              />
              <MetricCard
                label="LI Pending"
                value={kpis.linkedinPending.toLocaleString()}
                trend={kpis.linkedinFailed > 0 ? "warning" : "neutral"}
                detail={kpis.linkedinFailed > 0 ? `${kpis.linkedinFailed} failed` : undefined}
              />

              {/* Pipeline KPIs */}
              <MetricCard
                label="Contacted"
                value={kpis.pipelineContacted.toLocaleString()}
                trend="neutral"
              />
              <MetricCard
                label="Interested"
                value={kpis.pipelineInterested.toLocaleString()}
                trend={kpis.pipelineInterested > 0 ? "up" : "neutral"}
              />
              <MetricCard
                label="Meetings"
                value={kpis.pipelineMeetings.toLocaleString()}
                trend={kpis.pipelineMeetings > 0 ? "up" : "neutral"}
              />

              {/* Health KPIs */}
              <MetricCard
                label="Active Senders"
                value={kpis.sendersHealthy.toLocaleString()}
                trend={unhealthySenders > 0 ? "warning" : "up"}
                detail={unhealthySenders > 0 ? `${unhealthySenders} need attention` : "All healthy"}
              />
              <MetricCard
                label="Campaigns Active"
                value={kpis.campaignsActive.toLocaleString()}
                trend={kpis.campaignsActive > 0 ? "up" : "neutral"}
                detail={kpis.campaignsPaused > 0 ? `${kpis.campaignsPaused} paused` : undefined}
              />

              {/* Inbox KPIs */}
              <MetricCard
                label="Inboxes Connected"
                value={kpis.inboxesConnected.toLocaleString()}
                trend={kpis.inboxesDisconnected > 0 ? "warning" : "up"}
                detail={kpis.inboxesDisconnected > 0 ? `${kpis.inboxesDisconnected} disconnected` : "All connected"}
              />
            </>
          )}
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-sm font-semibold">
                Email Activity
              </CardTitle>
              <ActivityChartLegend />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : error ? (
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

        {/* Workspace Overview Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-sm font-semibold">
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
