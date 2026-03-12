import {
  anthropic,
  external_exports,
  generateObject
} from "./chunk-TEXX5UGW.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/classification/classify-reply.ts
init_esm();

// src/lib/classification/types.ts
init_esm();
var INTENTS = [
  "interested",
  "meeting_booked",
  "objection",
  "referral",
  "not_now",
  "unsubscribe",
  "out_of_office",
  "auto_reply",
  "not_relevant"
];
var SENTIMENTS = ["positive", "neutral", "negative"];
var OBJECTION_SUBTYPES = [
  "budget",
  "timing",
  "competitor",
  "authority",
  "need",
  "trust"
];

// src/lib/classification/classify-reply.ts
var ClassificationSchema = external_exports.object({
  intent: external_exports.enum(INTENTS),
  sentiment: external_exports.enum(SENTIMENTS),
  objectionSubtype: external_exports.enum(OBJECTION_SUBTYPES).nullable().describe("Only set when intent is 'objection', null otherwise"),
  summary: external_exports.string().max(200).describe("One sentence explaining the classification reasoning")
});
async function classifyReply(params) {
  const outboundContext = params.outboundSubject ? `
ORIGINAL OUTBOUND EMAIL:
Subject: ${params.outboundSubject}
Body: ${params.outboundBody ?? "(unavailable)"}` : "";
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: ClassificationSchema,
    prompt: `Classify this email reply from a cold outreach campaign.

REPLY:
From: ${params.senderName ?? "Unknown"}
Subject: ${params.subject ?? "(no subject)"}
Body: ${params.bodyText}
${outboundContext}

INTENT DEFINITIONS:
- interested: Prospect expresses interest in learning more, wants a call, asks questions about the offering
- meeting_booked: Prospect explicitly confirms or proposes a specific meeting time
- objection: Prospect raises a specific concern (budget, timing, competitor, authority, need, trust)
- referral: Prospect redirects to another person or department
- not_now: Prospect explicitly says timing is wrong but does not rule out the future
- unsubscribe: Prospect asks to be removed from the list or stop receiving emails
- out_of_office: Auto-generated OOO reply with return date
- auto_reply: Any automated response (delivery receipt, ticket confirmation, DSN bounce)
- not_relevant: Reply that does not fit any other category (spam, confused, wrong person)

RULES:
1. For multi-intent replies, choose the PRIMARY intent (the most actionable one for a sales team).
2. For very short replies (under 10 words), classify based on the likely meaning in a sales outreach context.
3. For non-English text, classify based on your best understanding of the content.
4. Set objectionSubtype ONLY when intent is "objection". Otherwise it MUST be null.
5. Sentiment should reflect the prospect's attitude: positive (warm, open), neutral (factual, no emotion), negative (hostile, annoyed, dismissive).`
  });
  return object;
}
__name(classifyReply, "classifyReply");

export {
  classifyReply
};
//# sourceMappingURL=chunk-UHMZHQCT.mjs.map
