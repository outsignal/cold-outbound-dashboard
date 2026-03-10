"use client";

import type { IndustryBenchmark } from "@/lib/analytics/industry-benchmarks";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GaugeProps {
  label: string;
  value: number;
  globalAvg: number;
  industry: IndustryBenchmark;
  unit?: string;
  inverted?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(v: number, maxScale: number) {
  return Math.min((v / maxScale) * 100, 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceGauge({
  label,
  value,
  globalAvg,
  industry,
  unit = "%",
  inverted = false,
}: GaugeProps) {
  const maxScale = industry.high * 1.5;

  const lowPct = pct(industry.low, maxScale);
  const highPct = pct(industry.high, maxScale);

  // Zone colors — swap red/green when inverted (bounce rate: lower = better)
  const leftColor = inverted ? "bg-green-500/20" : "bg-red-500/20";
  const midColor = "bg-yellow-500/20";
  const rightColor = inverted ? "bg-red-500/20" : "bg-green-500/20";

  const valuePct = pct(value, maxScale);
  const globalPct = pct(globalAvg, maxScale);
  const industryAvgPct = pct(industry.avg, maxScale);

  return (
    <div className="space-y-1">
      {/* Label + value */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {value.toFixed(1)}
          {unit}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative h-3 w-full rounded-full overflow-hidden">
        {/* Zones */}
        <div
          className={`absolute inset-y-0 left-0 ${leftColor}`}
          style={{ width: `${lowPct}%` }}
        />
        <div
          className={`absolute inset-y-0 ${midColor}`}
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
        <div
          className={`absolute inset-y-0 right-0 ${rightColor}`}
          style={{ left: `${highPct}%` }}
        />

        {/* Global average marker — solid line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-muted-foreground/50"
          style={{ left: `${globalPct}%` }}
          title={`Global avg: ${globalAvg.toFixed(1)}${unit}`}
        />

        {/* Industry average marker — dashed line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{
            left: `${industryAvgPct}%`,
            borderLeft: "1.5px dashed",
            borderColor: "currentColor",
            background: "transparent",
          }}
          title={`Industry avg: ${industry.avg.toFixed(1)}${unit}`}
        />

        {/* Workspace value marker — diamond */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-brand rotate-45 rounded-sm border border-brand-strong"
          style={{ left: `${valuePct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-muted-foreground/50" />
          Global: {globalAvg.toFixed(1)}
          {unit}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-0.5"
            style={{ borderTop: "1.5px dashed currentColor" }}
          />
          Industry: {industry.avg.toFixed(1)}
          {unit}
        </span>
      </div>
    </div>
  );
}
