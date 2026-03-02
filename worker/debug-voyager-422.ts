import { ProxyAgent, fetch as undiciFetch } from "undici";
import { randomBytes } from "crypto";

const PROXY_URL = "http://14a3ea8349d72:82454f8432@178.95.63.221:12323";
const LI_AT =
  "AQEDAQ7tw-MEHoyBAAABnK8rI4AAAAGc0zengE0ANBgNDTJRd3WrlaezkOU24vK2vcJH6VuNsvAbhux610xX7puwqEwYXJfffKeDKJoNBIdUKoaEDMRmNNcLx2Lwspe-Shk0gypwDNyw1MbJ66ro_hmI";
const JSESSIONID = "ajax:4659824400609036667";
const CSRF_TOKEN = "ajax:4659824400609036667";

const proxyAgent = new ProxyAgent(PROXY_URL);

const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/vnd.linkedin.normalized+json+2.1",
  "csrf-token": CSRF_TOKEN,
  "x-restli-protocol-version": "2.0.0",
  "x-li-lang": "en_US",
  Cookie: `li_at=${LI_AT}; JSESSIONID="${JSESSIONID}"`,
};

function generateTrackingId(): string {
  return randomBytes(16).toString("base64");
}

async function task1_checkRelationship() {
  console.log("=".repeat(70));
  console.log("TASK 1: Check connection status with Eduardo");
  console.log("=".repeat(70));

  const url =
    "https://www.linkedin.com/voyager/api/identity/profiles/eduardomiddleton/relationships";

  console.log(`GET ${url}`);
  console.log();

  try {
    const resp = await undiciFetch(url, {
      method: "GET",
      headers: BASE_HEADERS,
      dispatcher: proxyAgent,
    });

    console.log(`Status: ${resp.status} ${resp.statusText}`);
    console.log(
      "Response headers:",
      JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2)
    );
    console.log();

    const body = await resp.text();
    try {
      const json = JSON.parse(body);
      console.log("Response JSON:");
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log("Response body (raw):");
      console.log(body);
    }
  } catch (err) {
    console.error("Request failed:", err);
  }
  console.log();
}

async function task2_tryConnectionRequests() {
  console.log("=".repeat(70));
  console.log("TASK 2: Try connection request with member URN format");
  console.log("=".repeat(70));

  const url =
    "https://www.linkedin.com/voyager/api/growth/normInvitations";

  // --- Attempt A: inviteeUrn with member URN ---
  console.log();
  console.log("-".repeat(50));
  console.log("Attempt A: inviteeUrn = urn:li:member:1156757069");
  console.log("-".repeat(50));

  const bodyA = {
    inviteeUrn: "urn:li:member:1156757069",
    invitationType: "CONNECTION",
    trackingId: generateTrackingId(),
  };

  console.log(`POST ${url}`);
  console.log("Request body:", JSON.stringify(bodyA, null, 2));
  console.log();

  try {
    const resp = await undiciFetch(url, {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyA),
      dispatcher: proxyAgent,
    });

    console.log(`Status: ${resp.status} ${resp.statusText}`);
    console.log(
      "Response headers:",
      JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2)
    );
    console.log();

    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      console.log("Response JSON:");
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log("Response body (raw):");
      console.log(text);
    }
  } catch (err) {
    console.error("Request failed:", err);
  }

  // --- Attempt B: inviteeProfileUrn with fsd_profile URN ---
  console.log();
  console.log("-".repeat(50));
  console.log(
    "Attempt B: inviteeProfileUrn = urn:li:fsd_profile:ACoAAETytk0B64LCbZ68IvQEy97Iln66vKC6n8A"
  );
  console.log("-".repeat(50));

  const bodyB = {
    inviteeProfileUrn:
      "urn:li:fsd_profile:ACoAAETytk0B64LCbZ68IvQEy97Iln66vKC6n8A",
    invitationType: "CONNECTION",
    trackingId: generateTrackingId(),
  };

  console.log(`POST ${url}`);
  console.log("Request body:", JSON.stringify(bodyB, null, 2));
  console.log();

  try {
    const resp = await undiciFetch(url, {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyB),
      dispatcher: proxyAgent,
    });

    console.log(`Status: ${resp.status} ${resp.statusText}`);
    console.log(
      "Response headers:",
      JSON.stringify(Object.fromEntries(resp.headers.entries()), null, 2)
    );
    console.log();

    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      console.log("Response JSON:");
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log("Response body (raw):");
      console.log(text);
    }
  } catch (err) {
    console.error("Request failed:", err);
  }
}

async function main() {
  console.log("LinkedIn Voyager 422 Debug Script");
  console.log(`Proxy: ${PROXY_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  await task1_checkRelationship();
  await task2_tryConnectionRequests();

  console.log();
  console.log("=".repeat(70));
  console.log("DONE");
  console.log("=".repeat(70));
}

main().catch(console.error);
