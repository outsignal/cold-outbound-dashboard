/**
 * test-voyager.ts — Debug script for LinkedIn Voyager API 422 error.
 *
 * Steps:
 *   1. View profile via /identity/dash/profiles (new dash endpoint)
 *   2. Extract memberUrn from the response
 *   3. Attempt connection request to /growth/normInvitations
 *   4. Log FULL response bodies at every step
 *
 * Usage: cd /Users/jjay/programs/outsignal-agents/worker && npx tsx test-voyager.ts
 *
 * Set env vars: VOYAGER_LI_AT and VOYAGER_JSESSIONID
 */

import { ProxyAgent } from "undici";

// ── Configuration ──────────────────────────────────────────────────────
const LI_AT = process.env.VOYAGER_LI_AT ?? "";
const JSESSIONID = process.env.VOYAGER_JSESSIONID ?? "";
const PROXY_URL = "http://14a3ea8349d72:82454f8432@178.95.63.221:12323";
const PROFILE_SLUG = "eduardomiddleton";
const BASE_URL = "https://www.linkedin.com/voyager/api";

if (!LI_AT || !JSESSIONID) {
  console.error("ERROR: VOYAGER_LI_AT and VOYAGER_JSESSIONID must be set.");
  console.error("Run: railway variables --json | to check values.");
  process.exit(1);
}

console.log("=== Voyager Debug Script ===");
console.log(`Profile: ${PROFILE_SLUG}`);
console.log(`LI_AT: ${LI_AT.slice(0, 20)}...`);
console.log(`JSESSIONID: ${JSESSIONID}`);
console.log(`CSRF Token: ${JSESSIONID.replace(/"/g, "")}`);
console.log(`Proxy: ${PROXY_URL}`);
console.log();

// Log the exact Cookie header being sent
const cookieHeader = `li_at=${LI_AT}; JSESSIONID="${JSESSIONID}"`;
console.log(`Cookie header: ${cookieHeader}`);
console.log(`Cookie header length: ${cookieHeader.length}`);
console.log();

// ── Proxy setup ────────────────────────────────────────────────────────
const proxyDispatcher = new ProxyAgent(PROXY_URL);

// CSRF token = JSESSIONID with quotes stripped
const csrfToken = JSESSIONID.replace(/"/g, "");

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/vnd.linkedin.normalized+json+2.1",
    "Accept-Language": "en-US,en;q=0.9",
    "csrf-token": csrfToken,
    "x-restli-protocol-version": "2.0.0",
    "x-li-lang": "en_US",
    Cookie: cookieHeader,
    ...extra,
  };
}

// ── Step 0: Quick auth check — hit a simple Voyager endpoint ───────────
console.log("═══════════════════════════════════════════════════════════════");
console.log("STEP 0: Auth Check (manual redirect follow)");
console.log("═══════════════════════════════════════════════════════════════");

// Use redirect: "manual" to see WHERE LinkedIn redirects us
const authCheckUrl = `${BASE_URL}/identity/dash/profiles?q=memberIdentity&memberIdentity=${PROFILE_SLUG}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-6`;

try {
  const authResp = await fetch(authCheckUrl, {
    headers: getHeaders(),
    redirect: "manual",
    dispatcher: proxyDispatcher,
  } as any);

  console.log(`Status: ${authResp.status} ${authResp.statusText}`);
  console.log(`Location header: ${authResp.headers.get("location") ?? "(none)"}`);
  console.log();

  // Log all response headers
  console.log("--- RESPONSE HEADERS ---");
  authResp.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log("--- END RESPONSE HEADERS ---");
  console.log();

  if (authResp.status >= 300 && authResp.status < 400) {
    const location = authResp.headers.get("location");
    console.log(`REDIRECT DETECTED -> ${location}`);
    console.log();

    if (location?.includes("/checkpoint/") || location?.includes("/challenge/")) {
      console.log("*** SESSION REQUIRES CHECKPOINT/CHALLENGE ***");
    } else if (location?.includes("/login") || location?.includes("/uas/")) {
      console.log("*** SESSION EXPIRED — redirecting to login ***");
    }

    // Try to read the body anyway
    const body = await authResp.text();
    if (body) {
      console.log("Redirect body (first 2000 chars):");
      console.log(body.slice(0, 2000));
    }

    console.log();
    console.log("FATAL: Authentication failed (redirect). Cookies may be expired.");
    console.log("Try refreshing cookies via browser login.");
    process.exit(1);
  }

  // If we got a non-redirect response, process it
  if (authResp.ok) {
    console.log("Auth check PASSED (200 OK). Proceeding...");
    const profileBody = await authResp.text();
    console.log();
    console.log("--- RAW RESPONSE BODY (first 5000 chars) ---");
    console.log(profileBody.slice(0, 5000));
    console.log("--- END RAW RESPONSE BODY ---");
    console.log();

    // Parse and extract memberUrn
    let memberUrn: string | null = null;
    try {
      const data = JSON.parse(profileBody);
      console.log("Top-level keys:", Object.keys(data));

      // Method 1: data['*elements'] (normalized response)
      const elements = data.data?.["*elements"] ?? [];
      console.log("data['*elements']:", JSON.stringify(elements, null, 2));

      if (elements.length > 0) {
        const entityUrn = elements[0] as string;
        console.log(`First element entityUrn: ${entityUrn}`);
        memberUrn = entityUrn.replace("urn:li:fsd_profile:", "");
        console.log(`Extracted memberUrn: ${memberUrn}`);
      }

      // Method 2: included array
      if (!memberUrn && data.included && Array.isArray(data.included)) {
        console.log(`Found 'included' array with ${data.included.length} items`);
        for (const item of data.included) {
          if (item.entityUrn?.startsWith("urn:li:fsd_profile:")) {
            console.log(`Found in included: ${item.entityUrn}`);
            memberUrn = item.entityUrn.replace("urn:li:fsd_profile:", "");
            break;
          }
        }
      }

      // Method 3: elements array directly
      if (!memberUrn && data.elements && Array.isArray(data.elements)) {
        console.log(`Found 'elements' array with ${data.elements.length} items`);
        for (const item of data.elements) {
          if (item.entityUrn?.startsWith("urn:li:fsd_profile:")) {
            console.log(`Found in elements: ${item.entityUrn}`);
            memberUrn = item.entityUrn.replace("urn:li:fsd_profile:", "");
            break;
          }
        }
      }

      if (!memberUrn) {
        console.log();
        console.log("=== FULL JSON (pretty, first 10000 chars) ===");
        console.log(JSON.stringify(data, null, 2).slice(0, 10000));
        console.log("=== END FULL JSON ===");
        console.log("FATAL: Could not extract memberUrn.");
        process.exit(1);
      }
    } catch (parseErr) {
      console.error("Failed to parse profile response as JSON:", parseErr);
      process.exit(1);
    }

    // ── Step 2: Log extracted memberUrn ──────────────────────────────
    console.log();
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("STEP 2: Extracted memberUrn");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`memberUrn: ${memberUrn}`);
    console.log(`Full URN: urn:li:fsd_profile:${memberUrn}`);
    console.log();

    // ── Step 3: Send Connection Request ──────────────────────────────
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("STEP 3: Connection Request to /growth/normInvitations");
    console.log("═══════════════════════════════════════════════════════════════");

    const connBody = {
      inviteeUrn: `urn:li:fsd_profile:${memberUrn}`,
      invitationType: "CONNECTION",
      trackingId: Buffer.from(Math.random().toString()).toString("base64").slice(0, 16),
    };

    console.log("Request payload:");
    console.log(JSON.stringify(connBody, null, 2));
    console.log();

    const connUrl = `${BASE_URL}/growth/normInvitations`;
    console.log(`URL: ${connUrl}`);
    console.log();

    try {
      const connResp = await fetch(connUrl, {
        method: "POST",
        headers: getHeaders({
          "Content-Type": "application/json",
          Referer: `https://www.linkedin.com/in/${PROFILE_SLUG}/`,
        }),
        body: JSON.stringify(connBody),
        redirect: "manual",
        dispatcher: proxyDispatcher,
      } as any);

      console.log(`Status: ${connResp.status} ${connResp.statusText}`);
      console.log(`Final URL: ${connResp.url}`);
      console.log(`Location: ${connResp.headers.get("location") ?? "(none)"}`);
      console.log();

      // Log ALL response headers
      console.log("--- RESPONSE HEADERS ---");
      connResp.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log("--- END RESPONSE HEADERS ---");
      console.log();

      const connRespBody = await connResp.text();
      console.log("--- RAW RESPONSE BODY (FULL) ---");
      console.log(connRespBody);
      console.log("--- END RAW RESPONSE BODY ---");
      console.log();

      // Try to parse as JSON for pretty printing
      try {
        const parsed = JSON.parse(connRespBody);
        console.log("--- PARSED JSON (pretty) ---");
        console.log(JSON.stringify(parsed, null, 2));
        console.log("--- END PARSED JSON ---");
      } catch {
        console.log("(Response body is not JSON)");
      }
    } catch (err) {
      console.error("Connection request failed:", err);
    }
  } else {
    // Non-OK, non-redirect response
    console.log(`Unexpected status: ${authResp.status}`);
    const body = await authResp.text();
    console.log("--- RESPONSE BODY ---");
    console.log(body.slice(0, 5000));
    console.log("--- END RESPONSE BODY ---");
  }
} catch (err) {
  console.error("Auth check request failed:", err);
}

console.log();
console.log("=== Debug complete ===");
