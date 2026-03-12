import {
  Resend
} from "./chunk-OCSVRKXM.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/resend.ts
init_esm();
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}
__name(getResendClient, "getResendClient");
async function sendNotificationEmail(params) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email notification");
    return;
  }
  const from = process.env.RESEND_FROM ?? "Outsignal <notifications@outsignal.ai>";
  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html
  });
}
__name(sendNotificationEmail, "sendNotificationEmail");

export {
  sendNotificationEmail
};
//# sourceMappingURL=chunk-HSFGK6GU.mjs.map
