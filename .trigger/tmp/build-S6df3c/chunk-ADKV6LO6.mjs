import {
  require_dist
} from "./chunk-I7EJTL45.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/slack.ts
init_esm();
var import_web_api = __toESM(require_dist());
function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new import_web_api.WebClient(token);
}
__name(getSlackClient, "getSlackClient");
async function postMessage(channelId, text, blocks) {
  const slack = getSlackClient();
  if (!slack) {
    console.warn("SLACK_BOT_TOKEN not set, skipping message");
    return;
  }
  await slack.chat.postMessage({
    channel: channelId,
    text,
    blocks
  });
}
__name(postMessage, "postMessage");

export {
  postMessage
};
//# sourceMappingURL=chunk-ADKV6LO6.mjs.map
