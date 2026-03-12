import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/domain-health/warmup.ts
init_esm();
var EMAILBISON_DEDICATED_BASE = "https://dedi.emailbison.com/api";
async function fetchWarmupData(apiToken) {
  try {
    const res = await fetch(`${EMAILBISON_DEDICATED_BASE}/warmup/sender-emails`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json"
      }
    });
    if (!res.ok) {
      console.warn(
        `[domain-health] Warmup API returned ${res.status} — returning empty warmup data`
      );
      return [];
    }
    const body = await res.json();
    const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    return items.map((item) => {
      const obj = item;
      return {
        ...obj,
        id: Number(obj.id ?? 0),
        email: String(obj.email ?? ""),
        warmupEnabled: Boolean(
          obj.warmup_enabled ?? obj.warmupEnabled ?? false
        )
      };
    });
  } catch (err) {
    console.warn(
      `[domain-health] Warmup API fetch failed — returning empty warmup data: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}
__name(fetchWarmupData, "fetchWarmupData");
async function fetchWarmupDetail(apiToken, senderEmailId) {
  try {
    const res = await fetch(
      `${EMAILBISON_DEDICATED_BASE}/warmup/sender-emails/${senderEmailId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json"
        }
      }
    );
    if (!res.ok) {
      console.warn(
        `[domain-health] Warmup detail API returned ${res.status} for sender ${senderEmailId}`
      );
      return null;
    }
    const body = await res.json();
    return body?.data ?? body;
  } catch (err) {
    console.warn(
      `[domain-health] Warmup detail fetch failed for sender ${senderEmailId}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
__name(fetchWarmupDetail, "fetchWarmupDetail");
export {
  fetchWarmupData,
  fetchWarmupDetail
};
//# sourceMappingURL=warmup-5F3YOQEH.mjs.map
