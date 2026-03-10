"use client";

import { useState, useEffect, useCallback } from "react";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferenceBandsSection } from "./reference-bands-section";
import { IcpCalibrationSection } from "./icp-calibration-section";
import { SignalEffectivenessSection } from "./signal-effectiveness-section";

// ---------------------------------------------------------------------------
// Types (match API response shapes)
// ---------------------------------------------------------------------------

interface ReferenceBandsData {
  workspaces: Array<{
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
    industryBenchmark: {
      replyRate: { low: number; avg: number; high: number };
      bounceRate: { low: number; avg: number; high: number };
      interestedRate: { low: number; avg: number; high: number };
      openRate: { low: number; avg: number; high: number };
      connectionAcceptRate?: { low: number; avg: number; high: number };
      messageReplyRate?: { low: number; avg: number; high: number };
    };
  }>;
  globalAvg: {
    replyRate: number;
    openRate: number;
    bounceRate: number;
    interestedRate: number;
  } | null;
}

interface IcpCalibrationData {
  buckets: Array<{
    bucket: string;
    totalPeople: number;
    replyRate: number;
    interestedRate: number;
  }>;
  recommendation: {
    currentThreshold: number;
    recommendedThreshold: number;
    evidence: string;
    confidence: "high" | "medium" | "low";
    sampleSize: number;
  } | null;
  totalPeople: number;
  workspace: string | null;
  isGlobal: boolean;
}

interface SignalEffectivenessData {
  signalTypes: Array<{
    type: string;
    sent: number;
    replied: number;
    interested: number;
    replyRate: number;
    interestedRate: number;
    lowConfidence: boolean;
  }>;
  comparison: {
    signalAvg: {
      replyRate: number;
      interestedRate: number;
      campaigns: number;
    };
    staticAvg: {
      replyRate: number;
      interestedRate: number;
      campaigns: number;
    };
    multiplier: { replyRate: number; interestedRate: number };
  } | null;
  workspace: string | null;
  isGlobal: boolean;
}

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BenchmarksTabProps {
  workspace: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BenchmarksTab({ workspace }: BenchmarksTabProps) {
  // Reference bands state
  const [refData, setRefData] = useState<ReferenceBandsData | null>(null);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);

  // ICP calibration state
  const [icpData, setIcpData] = useState<IcpCalibrationData | null>(null);
  const [icpLoading, setIcpLoading] = useState(true);
  const [icpError, setIcpError] = useState<string | null>(null);
  const [icpGlobal, setIcpGlobal] = useState(false);

  // Signal effectiveness state
  const [signalData, setSignalData] =
    useState<SignalEffectivenessData | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [signalGlobal, setSignalGlobal] = useState(false);

  // ─── Fetch reference bands ──────────────────────────────────────────────
  const fetchRefBands = useCallback(async () => {
    setRefLoading(true);
    setRefError(null);
    try {
      const sp = new URLSearchParams();
      if (workspace) sp.set("workspace", workspace);
      const res = await fetch(
        `/api/analytics/benchmarks/reference-bands?${sp.toString()}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setRefData((await res.json()) as ReferenceBandsData);
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefLoading(false);
    }
  }, [workspace]);

  // ─── Fetch ICP calibration ─────────────────────────────────────────────
  const fetchIcp = useCallback(async () => {
    setIcpLoading(true);
    setIcpError(null);
    try {
      const sp = new URLSearchParams();
      if (workspace) sp.set("workspace", workspace);
      if (icpGlobal) sp.set("global", "true");
      const res = await fetch(
        `/api/analytics/benchmarks/icp-calibration?${sp.toString()}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setIcpData((await res.json()) as IcpCalibrationData);
    } catch (err) {
      setIcpError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIcpLoading(false);
    }
  }, [workspace, icpGlobal]);

  // ─── Fetch signal effectiveness ────────────────────────────────────────
  const fetchSignal = useCallback(async () => {
    setSignalLoading(true);
    setSignalError(null);
    try {
      const sp = new URLSearchParams();
      if (workspace) sp.set("workspace", workspace);
      if (signalGlobal) sp.set("global", "true");
      const res = await fetch(
        `/api/analytics/benchmarks/signal-effectiveness?${sp.toString()}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSignalData((await res.json()) as SignalEffectivenessData);
    } catch (err) {
      setSignalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSignalLoading(false);
    }
  }, [workspace, signalGlobal]);

  // ─── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchRefBands();
  }, [fetchRefBands]);

  useEffect(() => {
    void fetchIcp();
  }, [fetchIcp]);

  useEffect(() => {
    void fetchSignal();
  }, [fetchSignal]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Reference Bands */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reference Bands</h2>
        {refError && (
          <ErrorBanner
            message={`Failed to load reference bands: ${refError}`}
            onRetry={() => void fetchRefBands()}
          />
        )}
        {refLoading ? (
          <SectionSkeleton />
        ) : (
          refData && <ReferenceBandsSection data={refData} />
        )}
      </section>

      {/* ICP Score Calibration */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ICP Score Calibration</h2>
        {icpError && (
          <ErrorBanner
            message={`Failed to load ICP calibration: ${icpError}`}
            onRetry={() => void fetchIcp()}
          />
        )}
        {icpLoading ? (
          <SectionSkeleton />
        ) : (
          icpData && (
            <IcpCalibrationSection
              data={icpData}
              isGlobal={icpGlobal}
              onToggleGlobal={setIcpGlobal}
            />
          )
        )}
      </section>

      {/* Signal Effectiveness */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Signal Effectiveness</h2>
        {signalError && (
          <ErrorBanner
            message={`Failed to load signal effectiveness: ${signalError}`}
            onRetry={() => void fetchSignal()}
          />
        )}
        {signalLoading ? (
          <SectionSkeleton />
        ) : (
          signalData && (
            <SignalEffectivenessSection
              data={signalData}
              isGlobal={signalGlobal}
              onToggleGlobal={setSignalGlobal}
            />
          )
        )}
      </section>
    </div>
  );
}
