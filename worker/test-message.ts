/**
 * Local test script for Voyager dash messaging API.
 * Run: cd worker && WORKER_API_SECRET=<secret> npx tsx test-message.ts
 */
async function main() {
  const API_BASE = "https://cold-outbound-dashboard.vercel.app";
  const senderId = "cmm3v06jj0001jo04mwi5uo1g";

  const secret = process.env.WORKER_API_SECRET!;
  if (!secret) throw new Error("WORKER_API_SECRET env var required");

  // Load cookies
  const cookieRes = await fetch(`${API_BASE}/api/linkedin/senders/${senderId}/cookies`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const cookieData = await cookieRes.json() as any;
  const voyagerEntry = cookieData.cookies?.find((e: any) => e?.type === "voyager");
  if (!voyagerEntry) throw new Error("No voyager cookies found");

  const liAt = voyagerEntry.liAt;
  const jsessionId = voyagerEntry.jsessionId;
  const csrfToken = jsessionId.replace(/"/g, "");

  console.log("li_at:", liAt?.substring(0, 20) + "...");
  console.log("csrf-token:", csrfToken);

  const baseUrl = "https://www.linkedin.com/voyager/api";
  const stdHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/vnd.linkedin.normalized+json+2.1",
    "Accept-Language": "en-US,en;q=0.9",
    "csrf-token": csrfToken,
    "x-restli-protocol-version": "2.0.0",
    "x-li-lang": "en_US",
    Cookie: `li_at=${liAt}; JSESSIONID="${jsessionId}"`,
  };

  // Step 1: Get sender's own URN via /me
  console.log("\n--- Step 1: Get selfUrn via /me ---");
  const meRes = await fetch(`${baseUrl}/me`, { headers: stdHeaders });
  console.log("/me status:", meRes.status);
  const meData = await meRes.json() as any;

  // Extract selfUrn from included[].dashEntityUrn or *miniProfile field
  let selfUrn: string | undefined;
  if (meData?.included) {
    for (const item of meData.included) {
      if (item.dashEntityUrn?.startsWith("urn:li:fsd_profile:")) {
        selfUrn = item.dashEntityUrn;
        break;
      }
    }
  }
  if (!selfUrn) {
    const miniProfileUrn = meData?.data?.["*miniProfile"] as string | undefined;
    if (miniProfileUrn) {
      const id = miniProfileUrn.split(":").pop();
      if (id) selfUrn = `urn:li:fsd_profile:${id}`;
    }
  }

  console.log("selfUrn:", selfUrn);
  if (!selfUrn?.startsWith("urn:li:fsd_profile:")) {
    console.error("Could not extract selfUrn! Response:", JSON.stringify(meData).substring(0, 500));
    return;
  }

  // Step 2: View profile to get recipient memberUrn
  const profileId = "cl%C3%A9ment-desrues";
  console.log("\n--- Step 2: View profile ---");
  const profileRes = await fetch(
    `${baseUrl}/identity/dash/profiles?q=memberIdentity&memberIdentity=${profileId}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-6`,
    { headers: stdHeaders }
  );
  console.log("Profile status:", profileRes.status);
  const profileData = await profileRes.json() as any;
  const elements = profileData.data?.["*elements"] ?? [];
  const entityUrn = elements[0] ?? null;
  const memberUrn = entityUrn?.replace("urn:li:fsd_profile:", "") ?? null;
  console.log("memberUrn (bare):", memberUrn);

  if (!memberUrn) {
    console.error("Could not extract memberUrn!");
    return;
  }

  // Step 3: Send message via dash endpoint
  const recipientUrn = `urn:li:fsd_profile:${memberUrn}`;
  const trackingBytes = new Uint8Array(16);
  crypto.getRandomValues(trackingBytes);
  const trackingId = String.fromCharCode(...trackingBytes);

  const body = {
    dedupeByClientGeneratedToken: false,
    hostRecipientUrns: [recipientUrn],
    mailboxUrn: selfUrn,
    message: {
      body: { attributes: [], text: "Great to connect Clément" },
      originToken: crypto.randomUUID(),
      renderContentUnions: [],
    },
    trackingId,
  };

  console.log("\n--- Step 3: Send message ---");
  console.log("Recipient:", recipientUrn);
  console.log("Payload:", JSON.stringify(body, null, 2));

  const res = await fetch(
    `${baseUrl}/voyagerMessagingDashMessengerMessages?action=createMessage`,
    {
      method: "POST",
      headers: { ...stdHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 500));

  if (res.status === 200 || res.status === 201) {
    console.log("\n✅ SUCCESS!");
  } else {
    console.log("\n❌ FAILED");
  }
}

main().catch(console.error);
