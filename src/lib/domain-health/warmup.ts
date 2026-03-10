const EMAILBISON_DEDICATED_BASE = "https://dedi.emailbison.com/api";

export interface WarmupSenderEmail {
  id: number;
  email: string;
  warmupEnabled: boolean;
  // Raw additional fields from API response stored in WarmupStatus
  [key: string]: unknown;
}

export type WarmupStatus = WarmupSenderEmail;

/**
 * Fetch warmup data for all sender emails in a workspace.
 * Gracefully returns empty array on API errors (endpoint may not be available for all accounts).
 */
export async function fetchWarmupData(
  apiToken: string,
): Promise<WarmupSenderEmail[]> {
  try {
    const res = await fetch(`${EMAILBISON_DEDICATED_BASE}/warmup/sender-emails`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(
        `[domain-health] Warmup API returned ${res.status} — returning empty warmup data`,
      );
      return [];
    }

    const body = await res.json();

    // Handle paginated response (may have { data: [...] }) or direct array
    const items: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
        ? body.data
        : [];

    return items.map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        ...obj,
        id: Number(obj.id ?? 0),
        email: String(obj.email ?? ""),
        warmupEnabled: Boolean(
          obj.warmup_enabled ?? obj.warmupEnabled ?? false,
        ),
      } as WarmupSenderEmail;
    });
  } catch (err) {
    console.warn(
      `[domain-health] Warmup API fetch failed — returning empty warmup data: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

/**
 * Fetch detailed warmup data for a specific sender email by ID.
 * Returns null on error (graceful degradation).
 */
export async function fetchWarmupDetail(
  apiToken: string,
  senderEmailId: number,
): Promise<object | null> {
  try {
    const res = await fetch(
      `${EMAILBISON_DEDICATED_BASE}/warmup/sender-emails/${senderEmailId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      console.warn(
        `[domain-health] Warmup detail API returned ${res.status} for sender ${senderEmailId}`,
      );
      return null;
    }

    const body = await res.json();
    return (body?.data ?? body) as object;
  } catch (err) {
    console.warn(
      `[domain-health] Warmup detail fetch failed for sender ${senderEmailId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
