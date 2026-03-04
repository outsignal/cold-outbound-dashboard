import { z } from "zod";

// ---------------------------------------------------------------------------
// Signal type union — used across the system for signal categorization
// ---------------------------------------------------------------------------

export type SignalType =
  | "job_change"
  | "funding"
  | "hiring_spike"
  | "tech_adoption"
  | "news"
  | "social_mention";

// ---------------------------------------------------------------------------
// PredictLeads response schemas (Zod v3)
// MEDIUM confidence — field names based on PredictLeads API docs + Swagger.
// Use .passthrough() so unknown API fields don't fail validation.
// ---------------------------------------------------------------------------

/**
 * Job Opening — represents a single job posting from PredictLeads.
 * Endpoint: GET /companies/{company_id}/job_openings
 */
export const JobOpeningSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    url: z.string().optional(),
    first_seen_at: z.string(), // ISO date string
    location: z.string().optional(),
    seniority: z.string().optional(),
    department: z.string().optional(),
  })
  .passthrough();

export type JobOpening = z.infer<typeof JobOpeningSchema>;

/**
 * Financing Event — represents a funding round from PredictLeads.
 * Endpoint: GET /companies/{company_id}/financing_events
 */
export const FinancingEventSchema = z
  .object({
    id: z.string(),
    funding_type: z.string(), // e.g. "seed", "series_a", "series_b"
    amount: z.number().optional(),
    currency: z.string().optional(),
    first_seen_at: z.string(), // ISO date string
    investors: z.array(z.string()).optional(),
    source_url: z.string().optional(),
  })
  .passthrough();

export type FinancingEvent = z.infer<typeof FinancingEventSchema>;

/**
 * News Event — represents a company news item from PredictLeads.
 * Endpoint: GET /companies/{company_id}/news_events
 */
export const NewsEventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    category: z.string().optional(),
    source_url: z.string().optional(),
    first_seen_at: z.string(), // ISO date string
    summary: z.string().optional(),
  })
  .passthrough();

export type NewsEvent = z.infer<typeof NewsEventSchema>;

/**
 * Technology Detection — represents a technology change from PredictLeads.
 * Endpoint: GET /companies/{company_id}/technology_detections
 */
export const TechnologyDetectionSchema = z
  .object({
    id: z.string(),
    technology_name: z.string(),
    category: z.string().optional(),
    first_seen_at: z.string(), // ISO date string
    is_new: z.boolean().optional(),
  })
  .passthrough();

export type TechnologyDetection = z.infer<typeof TechnologyDetectionSchema>;

// ---------------------------------------------------------------------------
// Generic list response wrapper
// PredictLeads wraps array results in a { data: [...], pagination: {...} } shape
// ---------------------------------------------------------------------------

export const PaginationSchema = z
  .object({
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
  })
  .passthrough();

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Generic list response — wraps any array response from PredictLeads.
 * Usage: PredictLeadsListResponseSchema(JobOpeningSchema).parse(rawData)
 */
export function PredictLeadsListResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema.optional(),
  });
}

export type PredictLeadsListResponse<T> = {
  data: T[];
  pagination?: Pagination;
};
