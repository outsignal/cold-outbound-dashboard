// PredictLeads HTTP client
// Auth: dual-header (X-Api-Key + X-Api-Token)
// Base URL: https://predictleads.com/api/v3
// Retry: exponential backoff on 429 (1s, 3s, 9s), max 3 retries
// Timeout: 15s per request

const BASE_URL = "https://predictleads.com/api/v3";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 9000] as const; // exponential

/**
 * Perform an authenticated GET request to the PredictLeads API.
 *
 * Reads PREDICTLEADS_API_KEY and PREDICTLEADS_API_TOKEN from env.
 * Retries up to 3 times on 429 (rate limit) with exponential backoff.
 * Throws on 4xx/5xx (non-429), timeout, or network failure.
 *
 * @param path - API path including leading slash, e.g. "/companies/123/job_openings"
 * @returns Parsed JSON response body
 */
export async function predictLeadsGet(path: string): Promise<unknown> {
  const apiKey = process.env.PREDICTLEADS_API_KEY;
  const apiToken = process.env.PREDICTLEADS_API_TOKEN;

  if (!apiKey) {
    throw new Error("PREDICTLEADS_API_KEY environment variable is not set");
  }
  if (!apiToken) {
    throw new Error("PREDICTLEADS_API_TOKEN environment variable is not set");
  }

  const url = `${BASE_URL}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
          "X-Api-Token": apiToken,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Rate limited — retry with exponential backoff
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const backoffMs = RETRY_BACKOFF_MS[attempt] ?? 9000;
          console.warn(
            `[PredictLeads] 429 rate limit on ${path} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await sleep(backoffMs);
          continue;
        } else {
          throw new Error(
            `PredictLeads 429 rate limit on ${path} — max retries (${MAX_RETRIES}) exhausted`,
          );
        }
      }

      // Any other error status — throw immediately (no retry)
      if (!response.ok) {
        throw new Error(
          `PredictLeads HTTP ${response.status} on GET ${path}`,
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // AbortController timeout
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          const backoffMs = RETRY_BACKOFF_MS[attempt] ?? 9000;
          console.warn(
            `[PredictLeads] Timeout on ${path} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await sleep(backoffMs);
          continue;
        } else {
          throw new Error(
            `PredictLeads request timed out on GET ${path} after ${REQUEST_TIMEOUT_MS}ms — max retries exhausted`,
          );
        }
      }

      // Network or application error from a non-retry path — rethrow
      throw error;
    }
  }

  // Should never reach here — loop always returns or throws
  throw new Error(`PredictLeads GET ${path} — unexpected end of retry loop`);
}

/**
 * Cost per API call for budget tracking.
 * Based on PredictLeads 101–5k tier pricing: $0.04/call.
 */
export function predictLeadsCostPerCall(): number {
  return 0.04;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
