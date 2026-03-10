"use client";

import type { Correlation, CtaSubtype } from "./copy-tab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ElementMultiplierCardsProps {
  correlations: Correlation[];
  ctaSubtypes: CtaSubtype[];
  totalStepsAnalyzed: number;
}

// ---------------------------------------------------------------------------
// Component (placeholder — fleshed out in Task 3)
// ---------------------------------------------------------------------------

export function ElementMultiplierCards({
  correlations,
  ctaSubtypes,
  totalStepsAnalyzed,
}: ElementMultiplierCardsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {correlations.length} elements, {ctaSubtypes.length} CTA subtypes,{" "}
        {totalStepsAnalyzed} steps analyzed
      </p>
    </div>
  );
}
