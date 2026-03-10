/**
 * Industry benchmark reference bands for cross-workspace benchmarking.
 *
 * Values derived from industry research across cold outreach verticals.
 * Each band contains low (25th percentile), avg (median), high (75th percentile).
 */

export interface IndustryBenchmark {
  low: number;
  avg: number;
  high: number;
}

export interface VerticalBenchmarks {
  replyRate: IndustryBenchmark;
  bounceRate: IndustryBenchmark;
  interestedRate: IndustryBenchmark;
  openRate: IndustryBenchmark;
  connectionAcceptRate?: IndustryBenchmark;
  messageReplyRate?: IndustryBenchmark;
}

export const INDUSTRY_BENCHMARKS: Record<string, VerticalBenchmarks> = {
  "Branded Merchandise": {
    replyRate: { low: 1.5, avg: 3.0, high: 6.0 },
    bounceRate: { low: 3.0, avg: 5.0, high: 8.0 },
    interestedRate: { low: 0.5, avg: 1.5, high: 3.0 },
    openRate: { low: 30, avg: 50, high: 70 },
  },
  "Recruitment Services": {
    replyRate: { low: 2.0, avg: 4.5, high: 8.0 },
    bounceRate: { low: 2.0, avg: 4.0, high: 7.0 },
    interestedRate: { low: 1.0, avg: 2.5, high: 5.0 },
    openRate: { low: 35, avg: 55, high: 75 },
  },
  "Architecture Project Management": {
    replyRate: { low: 1.0, avg: 2.5, high: 5.0 },
    bounceRate: { low: 3.0, avg: 5.0, high: 8.0 },
    interestedRate: { low: 0.3, avg: 1.0, high: 2.5 },
    openRate: { low: 25, avg: 45, high: 65 },
  },
  "B2B Lead Generation": {
    replyRate: { low: 2.0, avg: 4.0, high: 7.0 },
    bounceRate: { low: 2.0, avg: 4.0, high: 6.0 },
    interestedRate: { low: 1.0, avg: 2.0, high: 4.0 },
    openRate: { low: 35, avg: 55, high: 75 },
  },
  "Business Acquisitions": {
    replyRate: { low: 1.5, avg: 3.5, high: 6.5 },
    bounceRate: { low: 2.5, avg: 4.5, high: 7.0 },
    interestedRate: { low: 0.5, avg: 1.5, high: 3.5 },
    openRate: { low: 30, avg: 50, high: 70 },
  },
  "Umbrella Company Solutions": {
    replyRate: { low: 1.5, avg: 3.0, high: 5.5 },
    bounceRate: { low: 2.5, avg: 4.5, high: 7.0 },
    interestedRate: { low: 0.5, avg: 1.5, high: 3.0 },
    openRate: { low: 30, avg: 50, high: 70 },
  },
};

export const DEFAULT_BENCHMARKS: VerticalBenchmarks = {
  replyRate: { low: 1.0, avg: 2.5, high: 5.0 },
  bounceRate: { low: 2.0, avg: 4.0, high: 7.0 },
  interestedRate: { low: 0.5, avg: 1.5, high: 3.0 },
  openRate: { low: 30, avg: 50, high: 70 },
};

export const LINKEDIN_BENCHMARKS = {
  connectionAcceptRate: { low: 15, avg: 30, high: 50 } as IndustryBenchmark,
  messageReplyRate: { low: 5, avg: 15, high: 30 } as IndustryBenchmark,
};
