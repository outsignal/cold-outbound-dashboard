"use client";

import { ReferenceGauge } from "./reference-band-gauge";
import type {
  IndustryBenchmark,
  VerticalBenchmarks,
} from "@/lib/analytics/industry-benchmarks";
import { LINKEDIN_BENCHMARKS } from "@/lib/analytics/industry-benchmarks";

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------

interface WorkspaceMetrics {
  slug: string;
  name: string;
  vertical: string | null;
  activeChannels: ("email" | "linkedin")[];
  metrics: {
    replyRate: number;
    openRate: number;
    bounceRate: number;
    interestedRate: number;
  };
  industryBenchmark: VerticalBenchmarks;
}

interface ReferenceBandsData {
  workspaces: WorkspaceMetrics[];
  globalAvg: {
    replyRate: number;
    openRate: number;
    bounceRate: number;
    interestedRate: number;
  } | null;
}

interface ReferenceBandsSectionProps {
  data: ReferenceBandsData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceBandsSection({ data }: ReferenceBandsSectionProps) {
  if (data.workspaces.length === 0 || !data.globalAvg) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No campaign data yet. Analytics snapshots will populate benchmarks
        automatically.
      </div>
    );
  }

  const globalAvg = data.globalAvg;
  const isSingle = data.workspaces.length === 1;

  return (
    <div className="space-y-6">
      {data.workspaces.map((ws, idx) => (
        <div key={ws.slug}>
          {/* Workspace header */}
          <div className="mb-3">
            <h3 className="text-sm font-semibold">{ws.name}</h3>
            {ws.vertical && (
              <p className="text-xs text-muted-foreground">{ws.vertical}</p>
            )}
          </div>

          {/* Gauges */}
          <div
            className={
              isSingle ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-3"
            }
          >
            {/* Email gauges */}
            {ws.activeChannels.includes("email") && (
              <>
                <ReferenceGauge
                  label="Reply Rate"
                  value={ws.metrics.replyRate}
                  globalAvg={globalAvg.replyRate}
                  industry={ws.industryBenchmark.replyRate}
                />
                <ReferenceGauge
                  label="Open Rate"
                  value={ws.metrics.openRate}
                  globalAvg={globalAvg.openRate}
                  industry={ws.industryBenchmark.openRate}
                />
                <ReferenceGauge
                  label="Bounce Rate"
                  value={ws.metrics.bounceRate}
                  globalAvg={globalAvg.bounceRate}
                  industry={ws.industryBenchmark.bounceRate}
                  inverted
                />
                <ReferenceGauge
                  label="Interested Rate"
                  value={ws.metrics.interestedRate}
                  globalAvg={globalAvg.interestedRate}
                  industry={ws.industryBenchmark.interestedRate}
                />
              </>
            )}

            {/* LinkedIn gauges */}
            {ws.activeChannels.includes("linkedin") && (
              <>
                {LINKEDIN_BENCHMARKS.connectionAcceptRate && (
                  <ReferenceGauge
                    label="Connection Accept Rate"
                    value={0}
                    globalAvg={0}
                    industry={
                      LINKEDIN_BENCHMARKS.connectionAcceptRate as IndustryBenchmark
                    }
                  />
                )}
                {LINKEDIN_BENCHMARKS.messageReplyRate && (
                  <ReferenceGauge
                    label="Message Reply Rate"
                    value={0}
                    globalAvg={0}
                    industry={
                      LINKEDIN_BENCHMARKS.messageReplyRate as IndustryBenchmark
                    }
                  />
                )}
              </>
            )}
          </div>

          {/* Divider between workspaces */}
          {!isSingle && idx < data.workspaces.length - 1 && (
            <div className="mt-6 border-t border-border" />
          )}
        </div>
      ))}
    </div>
  );
}
