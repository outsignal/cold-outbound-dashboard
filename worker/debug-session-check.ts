import { ProxyAgent, fetch as undiciFetch } from "undici";

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

async function main() {
  console.log("Session validity check");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  // Test 1: /me endpoint (simplest auth check)
  console.log("--- Test: GET /voyager/api/me (no redirect follow) ---");
  try {
    const resp = await undiciFetch(
      "https://www.linkedin.com/voyager/api/me",
      {
        method: "GET",
        headers: BASE_HEADERS,
        dispatcher: proxyAgent,
        redirect: "manual",
      }
    );
    console.log(`Status: ${resp.status} ${resp.statusText}`);
    const loc = resp.headers.get("location");
    if (loc) console.log(`Location: ${loc}`);
    const clearData = resp.headers.get("clear-site-data");
    if (clearData) console.log(`clear-site-data: ${clearData}`);

    const text = await resp.text();
    if (text) {
      try {
        console.log("Body:", JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        console.log("Body:", text.slice(0, 500));
      }
    } else {
      console.log("Body: (empty)");
    }
  } catch (err) {
    console.error("Error:", err);
  }

  console.log();

  // Test 2: profile endpoint with redirect manual
  console.log("--- Test: GET /voyager/api/identity/profiles/eduardomiddleton (no redirect follow) ---");
  try {
    const resp = await undiciFetch(
      "https://www.linkedin.com/voyager/api/identity/profiles/eduardomiddleton",
      {
        method: "GET",
        headers: BASE_HEADERS,
        dispatcher: proxyAgent,
        redirect: "manual",
      }
    );
    console.log(`Status: ${resp.status} ${resp.statusText}`);
    const loc = resp.headers.get("location");
    if (loc) console.log(`Location: ${loc}`);
    const clearData = resp.headers.get("clear-site-data");
    if (clearData) console.log(`clear-site-data: ${clearData}`);

    const text = await resp.text();
    if (text) {
      try {
        console.log("Body:", JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        console.log("Body:", text.slice(0, 500));
      }
    } else {
      console.log("Body: (empty)");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main().catch(console.error);
