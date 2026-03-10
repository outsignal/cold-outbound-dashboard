"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryStates, parseAsString } from "nuqs";
import Link from "next/link";
import {
  Lightbulb,
  BarChart3,
  PieChart,
  Gauge,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { KpiRow } from "@/components/intelligence/kpi-row";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignData {
  campaignName: string;
  workspaceSlug: string;
  replyRate: number;
  interestedRate?: number;
}

interface CampaignsResponse {
  campaigns: CampaignData[];
}

interface ReplyStatsResponse {
  totalReplies: number;
  intentDistribution: { intent: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Bento section config
// ---------------------------------------------------------------------------

interface BentoSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colSpan: string;
  href: string;
}

const BENTO_SECTIONS: BentoSection[] = [
  {
    title: "Active Insights",
    icon: Lightbulb,
    colSpan: "md:col-span-2",
    href: "/analytics?tab=insights",
  },
  {
    title: "Campaign Rankings",
    icon: BarChart3,
    colSpan: "md:col-span-2",
    href: "/analytics?tab=performance",
  },
  {
    title: "Reply Classification",
    icon: PieChart,
    colSpan: "md:col-span-1 lg:col-span-2",
    href: "/analytics",
  },
  {
    title: "Benchmarks",
    icon: Gauge,
    colSpan: "md:col-span-1",
    href: "/analytics?tab=benchmarks",
  },
  {
    title: "ICP Calibration",
    icon: UserCheck,
    colSpan: "md:col-span-1",
    href: "/analytics?tab=benchmarks",
  },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IntelligenceHubPage() {
  const [params, setParams] = useQueryStates({
    workspace: parseAsString.withDefault(""),
    period: parseAsString.withDefault("7d"),
  });

  // KPI state
  const [repliesCount, setRepliesCount] = useState<number | null>(null);
  const [avgReplyRate, setAvgReplyRate] = useState<number | null>(null);
  const [activeInsights, setActiveInsights] = useState<number | null>(null);
  const [topWorkspace, setTopWorkspace] = useState<string | null>(null);
  const [interestedRate, setInterestedRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch KPI data ──────────────────────────────────────────────────
  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      // Build params for campaigns
      const campaignParams = new URLSearchParams();
      campaignParams.set("sort", "replyRate");
      campaignParams.set("order", "desc");
      if (params.workspace) campaignParams.set("workspace", params.workspace);
      if (params.period && params.period !== "all")
        campaignParams.set("period", params.period);

      // Build params for reply stats
      const replyParams = new URLSearchParams();
      if (params.workspace) replyParams.set("workspace", params.workspace);
      if (params.period) replyParams.set("range", params.period);

      // Build params for insights
      const insightParams = new URLSearchParams();
      insightParams.set("status", "active");
      if (params.workspace) insightParams.set("workspace", params.workspace);

      const [campaignsRes, repliesRes, insightsRes] = await Promise.all([
        fetch(`/api/analytics/campaigns?${campaignParams.toString()}`),
        fetch(`/api/replies/stats?${replyParams.toString()}`),
        fetch(`/api/insights?${insightParams.toString()}`),
      ]);

      // Process campaigns data
      if (campaignsRes.ok) {
        const campaignsJson =
          (await campaignsRes.json()) as CampaignsResponse;
        const campaigns = campaignsJson.campaigns ?? [];
        if (campaigns.length > 0) {
          const totalRate = campaigns.reduce(
            (sum, c) => sum + (c.replyRate ?? 0),
            0,
          );
          setAvgReplyRate(totalRate / campaigns.length);

          // Find top workspace by reply rate
          const byWorkspace = new Map<
            string,
            { totalRate: number; count: number }
          >();
          for (const c of campaigns) {
            const existing = byWorkspace.get(c.workspaceSlug) ?? {
              totalRate: 0,
              count: 0,
            };
            existing.totalRate += c.replyRate ?? 0;
            existing.count += 1;
            byWorkspace.set(c.workspaceSlug, existing);
          }
          let bestWorkspace = "";
          let bestRate = -1;
          for (const [slug, data] of byWorkspace) {
            const avg = data.totalRate / data.count;
            if (avg > bestRate) {
              bestRate = avg;
              bestWorkspace = slug;
            }
          }
          setTopWorkspace(bestWorkspace);

          // Interested rate from campaigns
          const withInterested = campaigns.filter(
            (c) => c.interestedRate != null,
          );
          if (withInterested.length > 0) {
            const totalInterested = withInterested.reduce(
              (sum, c) => sum + (c.interestedRate ?? 0),
              0,
            );
            setInterestedRate(totalInterested / withInterested.length);
          } else {
            setInterestedRate(null);
          }
        } else {
          setAvgReplyRate(null);
          setTopWorkspace(null);
          setInterestedRate(null);
        }
      }

      // Process replies data
      if (repliesRes.ok) {
        const repliesJson = (await repliesRes.json()) as ReplyStatsResponse;
        setRepliesCount(repliesJson.totalReplies ?? 0);
      } else {
        setRepliesCount(null);
      }

      // Process insights data
      if (insightsRes.ok) {
        const insightsJson = (await insightsRes.json()) as unknown[];
        setActiveInsights(Array.isArray(insightsJson) ? insightsJson.length : 0);
      } else {
        setActiveInsights(null);
      }
    } catch (err) {
      console.error("[intelligence] Failed to fetch KPIs:", err);
    } finally {
      setLoading(false);
    }
  }, [params.workspace, params.period]);

  useEffect(() => {
    void fetchKpis();
  }, [fetchKpis]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  function handleWorkspaceChange(w: string | null) {
    void setParams({ workspace: w ?? "" });
  }

  function handlePeriodChange(p: string) {
    void setParams({ period: p });
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Intelligence Hub"
        description="Executive overview of campaign performance, reply intelligence, and AI insights"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filters */}
        <AnalyticsFilters
          workspace={params.workspace || null}
          period={params.period}
          onWorkspaceChange={handleWorkspaceChange}
          onPeriodChange={handlePeriodChange}
        />

        {/* KPI Row */}
        <KpiRow
          repliesCount={repliesCount}
          avgReplyRate={avgReplyRate}
          activeInsights={activeInsights}
          topWorkspace={topWorkspace}
          interestedRate={interestedRate}
          loading={loading}
        />

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENTO_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className={`rounded-lg border bg-card/50 p-6 space-y-4 ${section.colSpan}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                  <Link
                    href={section.href}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View details
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Coming soon
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
