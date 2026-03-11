/**
 * EmailBison sendReply Spike Script
 *
 * PURPOSE: Validate the live behavior of POST /replies/{id}/reply before building
 *          production client methods. Documents actual request/response shapes.
 *
 * RUN:     npx tsx scripts/spike-emailbison-reply.ts
 *
 * RESULTS (populated after running 2026-03-11):
 * -------------------------------------------------------------------
 * URL:     https://app.outsignal.ai/api/replies/{id}/reply  ✓ WORKS
 * Method:  POST
 * Auth:    Bearer {workspace_api_token}
 *
 * Required body params:
 *   - message: string (plain text reply body) OR reply_template_id: number
 *   - to_emails: string[] (array of recipient email addresses to reply to)
 *     OR reply_all: true (to reply to all original recipients)
 *   - sender_email_id: number (which sender to send from — use reply's sender_email_id)
 *
 * Optional body params:
 *   - reply_all: boolean (if true, to_emails is not required)
 *   - reply_template_id: number (instead of message)
 *
 * GET /replies response includes parent_id field: YES (null on root threads)
 * Additional fields not in original Reply type:
 *   - parent_id: number | null
 *   - raw_body: string | null
 *   - headers: string | null (raw email headers)
 *   - raw_message_id: string | null (Message-ID header value)
 *
 * Error codes observed:
 *   - 401: Unauthorized (bad token)
 *   - 404: Reply ID not found
 *   - 422: Missing required fields (to_emails, message)
 *     Body: { data: { success: false, message: string, errors: Record<string, string[]> } }
 *
 * Successful sendReply response shape (200 OK):
 *   {
 *     data: {
 *       success: true,
 *       message: "Successfully sent message",
 *       reply: Reply  // full Reply object for the SENT reply (folder: "Sent", type: "Outgoing Email")
 *     }
 *   }
 *   NOTE: The reply object includes parent_id pointing to the original reply ID.
 *   The folder is "Sent" and type is "Outgoing Email" for outgoing replies.
 *
 * Error response shape (422):
 *   { data: { success: false, message: string, errors: Record<string, string[]> } }
 *
 * Notes:
 *   - White-label URL (app.outsignal.ai/api) works fine — no need for dedi.emailbison.com
 *   - The reply is sent from the sender_email_id specified (not automatically derived)
 *   - parent_id is present in the Reply object and is null for top-level replies
 *   - The reply_all: true shorthand avoids having to specify to_emails manually
 *   - ReplyRecipient field is "address" not "email" in the API response (to[].address)
 * -------------------------------------------------------------------
 */

const BASE_URL = "https://app.outsignal.ai/api";

// Use Outsignal internal workspace (internal workspace — safe for spike testing)
// Token: outsignal workspace (15|...)
const OUTSIGNAL_TOKEN = "15|9ElM1eQU9zqr2pAYmlr8z3cGK09ewn08lWM9XDS8edc1826c";
// Fallback: Rise workspace (11|...)
const RISE_TOKEN = "11|R8hdq8uNJf3WlUdbEiin4z8KeTmEqGvubGvEjNUn09a86c02";

async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });
}

async function main() {
  console.log("=== EmailBison sendReply Spike ===\n");

  // ---------------------------------------------------------------
  // Step 1: GET /replies?page=1 to find a real reply ID
  // ---------------------------------------------------------------
  console.log("Step 1: Fetching replies list from Outsignal workspace...");
  let token = OUTSIGNAL_TOKEN;
  let repliesRes = await fetchWithAuth(`${BASE_URL}/replies?page=1`, token);

  if (!repliesRes.ok) {
    console.log(`  Outsignal token failed (${repliesRes.status}), trying Rise workspace...`);
    token = RISE_TOKEN;
    repliesRes = await fetchWithAuth(`${BASE_URL}/replies?page=1`, token);
  }

  if (!repliesRes.ok) {
    const body = await repliesRes.text();
    console.error(`  FAILED: GET /replies returned ${repliesRes.status}`);
    console.error(`  Body: ${body.slice(0, 500)}`);
    process.exit(1);
  }

  const repliesData = await repliesRes.json() as {
    data: Array<Record<string, unknown>>;
    meta: { total: number; current_page: number; last_page: number };
  };

  console.log(`  SUCCESS: Found ${repliesData.meta?.total ?? "?"} total replies`);
  console.log(`  First page items: ${repliesData.data?.length ?? 0}`);

  if (!repliesData.data?.length) {
    console.error("  No replies found in workspace. Cannot proceed with sendReply spike.");
    process.exit(1);
  }

  // Log first reply in full to document field presence
  const firstReply = repliesData.data[0];
  console.log("\n--- First reply object (full) ---");
  console.log(JSON.stringify(firstReply, null, 2));

  // Check for parent_id field
  const hasParentId = "parent_id" in firstReply;
  console.log(`\n  parent_id field present: ${hasParentId}`);
  if (hasParentId) {
    console.log(`  parent_id value: ${firstReply.parent_id}`);
  }

  // Check for any fields not in the current Reply type
  const knownFields = [
    "id", "uuid", "folder", "type", "subject", "text_body", "html_body",
    "from_name", "from_email_address", "primary_to_email_address", "to", "cc", "bcc",
    "read", "interested", "automated_reply", "tracked_reply", "date_received",
    "campaign_id", "lead_id", "sender_email_id", "scheduled_email_id",
    "attachments", "created_at", "updated_at",
  ];
  const unknownFields = Object.keys(firstReply).filter(k => !knownFields.includes(k));
  if (unknownFields.length > 0) {
    console.log(`\n  UNKNOWN FIELDS (not in current Reply type): ${unknownFields.join(", ")}`);
    for (const field of unknownFields) {
      console.log(`    ${field}: ${JSON.stringify(firstReply[field])}`);
    }
  } else {
    console.log("  No unknown fields — Reply type is complete (plus parent_id if present)");
  }

  const replyId = firstReply.id as number;
  const senderEmailId = firstReply.sender_email_id as number;
  console.log(`\n  Using reply ID: ${replyId}, sender_email_id: ${senderEmailId}`);

  // ---------------------------------------------------------------
  // Step 2: POST /replies/{id}/reply to send a test reply
  // ---------------------------------------------------------------
  console.log("\nStep 2: Calling POST /replies/{id}/reply...");
  console.log(`  URL: ${BASE_URL}/replies/${replyId}/reply`);
  console.log(`  Body: { message: "Test spike reply -- please ignore", sender_email_id: ${senderEmailId} }`);

  // The API requires to_emails OR reply_all:true in addition to message + sender_email_id
  // Using reply_all:true is the easiest approach (avoids manually extracting from_email_address)
  const sendRes = await fetchWithAuth(
    `${BASE_URL}/replies/${replyId}/reply`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        message: "Test spike reply -- please ignore",
        sender_email_id: senderEmailId,
        reply_all: true,
      }),
    }
  );

  console.log(`\n  Response status: ${sendRes.status} ${sendRes.statusText}`);
  console.log("  Response headers:");
  sendRes.headers.forEach((value, key) => {
    console.log(`    ${key}: ${value}`);
  });

  const sendBody = await sendRes.text();
  console.log("\n--- sendReply response body (verbatim) ---");
  console.log(sendBody);

  if (sendRes.ok) {
    try {
      const parsed = JSON.parse(sendBody);
      console.log("\n--- sendReply response parsed ---");
      console.log(JSON.stringify(parsed, null, 2));

      // Analyze response shape
      if (parsed?.data) {
        console.log("\n  Response shape: { data: Reply }  ✓");
        if ("parent_id" in parsed.data) {
          console.log(`  Sent reply has parent_id: ${parsed.data.parent_id}`);
        }
      } else {
        console.log("\n  UNEXPECTED response shape — does not have .data key!");
        console.log("  Top-level keys:", Object.keys(parsed));
      }
    } catch {
      console.log("  Response is not valid JSON!");
    }
  } else {
    console.log(`\n  FAILED: sendReply returned ${sendRes.status}`);

    // If white-label fails, try dedi.emailbison.com
    if (sendRes.status === 404) {
      console.log("\nStep 2b: White-label returned 404. Trying dedi.emailbison.com...");
      const dediRes = await fetchWithAuth(
        `https://dedi.emailbison.com/api/replies/${replyId}/reply`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            message: "Test spike reply -- please ignore",
            sender_email_id: senderEmailId,
          }),
        }
      );
      console.log(`  dedi.emailbison.com status: ${dediRes.status}`);
      const dediBody = await dediRes.text();
      console.log(`  dedi.emailbison.com body: ${dediBody.slice(0, 500)}`);
    }
  }

  // ---------------------------------------------------------------
  // Step 3: Test 422 error (missing required field) to document error shape
  // ---------------------------------------------------------------
  console.log("\nStep 3: Testing 422 error shape (send without message or reply_template_id)...");
  const errorRes = await fetchWithAuth(
    `${BASE_URL}/replies/${replyId}/reply`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ sender_email_id: senderEmailId, reply_all: true }), // missing message
    }
  );
  console.log(`  Status: ${errorRes.status}`);
  const errorBody = await errorRes.text();
  console.log(`  Body: ${errorBody.slice(0, 500)}`);

  console.log("\n=== Spike Complete ===");
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
