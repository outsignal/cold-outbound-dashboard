/**
 * LeadMagic email-finding adapter.
 * Finds a person's email using a two-strategy approach:
 *
 * Strategy 1 (preferred, 1 credit):
 *   Endpoint: POST https://api.leadmagic.io/v1/people/email-finder
 *   Input: { first_name, last_name, company_name } or { first_name, last_name, domain }
 *   Requires: firstName + lastName + (companyName or companyDomain)
 *
 * Strategy 2 (fallback, 2 credits):
 *   Step A: POST https://api.leadmagic.io/v1/people/profile-search
 *     Input: { profile_url } — returns name + company (no email)
 *   Step B: POST https://api.leadmagic.io/v1/people/email-finder
 *     Input: { first_name, last_name, company_name } from step A
 *
 * Auth: X-API-Key header
 * Docs: https://leadmagic.io
 */
import { z } from "zod";
import { PROVIDER_COSTS } from "../costs";
import type { EmailAdapter, EmailProviderResult } from "../types";

const EMAIL_FINDER_ENDPOINT =
  "https://api.leadmagic.io/v1/people/email-finder";
const PROFILE_SEARCH_ENDPOINT =
  "https://api.leadmagic.io/v1/people/profile-search";
const TIMEOUT_MS = 10_000;

function getApiKey(): string {
  const key = process.env.LEADMAGIC_API_KEY;
  if (!key) throw new Error("LEADMAGIC_API_KEY environment variable is not set");
  return key;
}

/* ---------- Zod schemas for API responses ---------- */

const EmailFinderResponseSchema = z.object({
  email: z.string().nullable().optional(),
  status: z.string().optional(),
  credits_consumed: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  domain: z.string().optional(),
  mx_record: z.string().optional(),
  mx_provider: z.string().optional(),
  mx_security_gateway: z.boolean().optional(),
  has_mx: z.boolean().optional(),
  company_name: z.string().optional(),
  company_industry: z.string().nullable().optional(),
  message: z.string().optional(),
});

const ProfileSearchResponseSchema = z.object({
  profile_url: z.string().optional(),
  credits_consumed: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  professional_title: z.string().optional(),
  company_name: z.string().optional(),
  company_website: z.string().optional(),
  work_experience: z.array(z.unknown()).optional(),
  education: z.array(z.unknown()).optional(),
});

/* ---------- Internal helpers ---------- */

async function callLeadMagic(
  endpoint: string,
  body: Record<string, string>,
  apiKey: string,
): Promise<{ raw: unknown; res: Response }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429) {
        const err = new Error(`LeadMagic rate-limited: HTTP 429`);
        (err as any).status = 429;
        throw err;
      }
      if (res.status === 404 || res.status === 422) {
        const err = new Error(`LeadMagic returned HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
      }
      throw new Error(`LeadMagic HTTP error: ${res.status} ${res.statusText}`);
    }

    const raw = await res.json();
    return { raw, res };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strategy 1: Call email-finder directly with name + company info.
 * Cost: 1 credit.
 */
async function emailFinderDirect(
  firstName: string,
  lastName: string,
  companyName: string | undefined,
  companyDomain: string | undefined,
  apiKey: string,
): Promise<EmailProviderResult> {
  const body: Record<string, string> = {
    first_name: firstName,
    last_name: lastName,
  };
  if (companyDomain) {
    body.domain = companyDomain;
  } else if (companyName) {
    body.company_name = companyName;
  }

  const { raw } = await callLeadMagic(EMAIL_FINDER_ENDPOINT, body, apiKey);
  const parsed = EmailFinderResponseSchema.safeParse(raw);

  if (!parsed.success) {
    console.warn(
      "[leadmagicAdapter] email-finder Zod validation failed:",
      parsed.error.message,
      "rawResponse:",
      raw,
    );
    return {
      email: null,
      source: "leadmagic",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.leadmagic,
    };
  }

  return {
    email: parsed.data.email ?? null,
    source: "leadmagic",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.leadmagic,
  };
}

/**
 * Strategy 2: profile-search to get name + company, then email-finder.
 * Cost: 2 credits (1 per call).
 */
async function profileSearchThenEmailFinder(
  linkedinUrl: string,
  apiKey: string,
): Promise<EmailProviderResult> {
  // Step A: profile-search
  const { raw: profileRaw } = await callLeadMagic(
    PROFILE_SEARCH_ENDPOINT,
    { profile_url: linkedinUrl },
    apiKey,
  );

  const profileParsed = ProfileSearchResponseSchema.safeParse(profileRaw);

  if (!profileParsed.success) {
    console.warn(
      "[leadmagicAdapter] profile-search Zod validation failed:",
      profileParsed.error.message,
      "rawResponse:",
      profileRaw,
    );
    return {
      email: null,
      source: "leadmagic",
      rawResponse: profileRaw,
      costUsd: PROVIDER_COSTS.leadmagic, // 1 credit consumed for profile-search
    };
  }

  const profile = profileParsed.data;
  const firstName = profile.first_name;
  const lastName = profile.last_name;
  const companyName = profile.company_name;
  const companyDomain = profile.company_website;

  // If profile-search didn't return enough data for email-finder, bail
  if (!firstName || !lastName || (!companyName && !companyDomain)) {
    console.warn(
      "[leadmagicAdapter] profile-search returned insufficient data for email-finder:",
      { firstName, lastName, companyName, companyDomain },
    );
    return {
      email: null,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      source: "leadmagic",
      rawResponse: profileRaw,
      costUsd: PROVIDER_COSTS.leadmagic, // 1 credit consumed for profile-search
    };
  }

  // Step B: email-finder with data from profile-search
  const emailResult = await emailFinderDirect(
    firstName,
    lastName,
    companyName,
    companyDomain,
    apiKey,
  );

  return {
    ...emailResult,
    firstName,
    lastName,
    rawResponse: { profileSearch: profileRaw, emailFinder: emailResult.rawResponse },
    costUsd: PROVIDER_COSTS.leadmagic * 2, // 2 credits total
  };
}

/* ---------- Main adapter ---------- */

/**
 * LeadMagic adapter — finds email using a two-strategy approach:
 *
 * 1. If firstName + lastName + (companyName or companyDomain) are available,
 *    calls email-finder directly (1 credit).
 * 2. Else if a LinkedIn URL is available, calls profile-search first to get
 *    name + company, then email-finder (2 credits total).
 * 3. Otherwise returns null email with costUsd=0 (no API call).
 */
export const leadmagicAdapter: EmailAdapter = async (
  input,
): Promise<EmailProviderResult> => {
  const hasName = Boolean(input.firstName && input.lastName);
  const hasCompany = Boolean(input.companyName || input.companyDomain);

  // Strategy 1: Direct email-finder (1 credit)
  if (hasName && hasCompany) {
    const apiKey = getApiKey();
    return emailFinderDirect(
      input.firstName!,
      input.lastName!,
      input.companyName,
      input.companyDomain,
      apiKey,
    );
  }

  // Strategy 2: profile-search -> email-finder (2 credits)
  if (input.linkedinUrl) {
    const apiKey = getApiKey();
    return profileSearchThenEmailFinder(input.linkedinUrl, apiKey);
  }

  // No usable input — skip without API call
  return {
    email: null,
    source: "leadmagic",
    rawResponse: { skipped: "insufficient input: need name+company or linkedin url" },
    costUsd: 0,
  };
};
