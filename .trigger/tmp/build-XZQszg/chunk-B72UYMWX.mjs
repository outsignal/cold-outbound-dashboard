import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/domain-health/blacklist.ts
init_esm();
import { Resolver } from "dns/promises";
var BLACKLIST_TIMEOUT_MS = 3e3;
var LOG_PREFIX = "[domain-health/blacklist]";
var DNSBL_LIST = [
  {
    host: "dbl.spamhaus.org",
    name: "Spamhaus DBL (Domain Block List)",
    tier: "critical",
    delistUrl: "https://check.spamhaus.org/listed/"
  },
  {
    host: "multi.surbl.org",
    name: "SURBL Multi",
    tier: "warning",
    delistUrl: "https://surbl.org/surbl-analysis"
  },
  {
    host: "multi.uribl.com",
    name: "URIBL Multi",
    tier: "warning",
    delistUrl: "https://lookup.uribl.com/"
  }
];
var GLOBAL_ERROR_IPS = /* @__PURE__ */ new Set([
  "127.255.255.252",
  "127.255.255.254",
  "127.255.255.255"
]);
var PER_HOST_ERROR_IPS = {
  "multi.uribl.com": /* @__PURE__ */ new Set(["127.0.0.1"]),
  "multi.surbl.org": /* @__PURE__ */ new Set(["127.0.0.1"])
};
async function checkSingleDnsbl(resolver, domain, entry) {
  const lookupHost = `${domain}.${entry.host}`;
  try {
    const addresses = await resolver.resolve4(lookupHost);
    const hostErrors = PER_HOST_ERROR_IPS[entry.host];
    const realHits = addresses.filter(
      (ip) => !GLOBAL_ERROR_IPS.has(ip) && !hostErrors?.has(ip)
    );
    if (realHits.length === 0) {
      console.warn(
        `${LOG_PREFIX} ${lookupHost}: DNSBL error response (${addresses.join(",")}), not a real listing`
      );
      return null;
    }
    return entry;
  } catch (err) {
    const code = err.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return null;
    }
    if (code !== "ETIMEOUT" && code !== "ESERVFAIL") {
      console.warn(
        `${LOG_PREFIX} DNS error checking ${lookupHost}: ${err.message}`
      );
    }
    return null;
  }
}
__name(checkSingleDnsbl, "checkSingleDnsbl");
async function checkBlacklists(domain) {
  const resolver = new Resolver({ timeout: BLACKLIST_TIMEOUT_MS });
  const checks = DNSBL_LIST.map(
    (entry) => checkSingleDnsbl(resolver, domain, entry)
  );
  const results = await Promise.allSettled(checks);
  const hits = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const entry = DNSBL_LIST[i];
    if (result.status === "fulfilled" && result.value !== null) {
      hits.push({
        list: entry.name,
        tier: entry.tier,
        delistUrl: getDelistUrl(entry.host, domain) ?? entry.delistUrl
      });
    } else if (result.status === "rejected") {
      console.error(
        `${LOG_PREFIX} Unexpected error checking ${entry.host} for ${domain}:`,
        result.reason
      );
    }
  }
  if (hits.length > 0) {
    console.warn(
      `${LOG_PREFIX} Domain ${domain} listed on ${hits.length} DNSBL(s): ${hits.map((h) => h.list).join(", ")}`
    );
  }
  return {
    domain,
    hits,
    checkedAt: /* @__PURE__ */ new Date()
  };
}
__name(checkBlacklists, "checkBlacklists");
function getDelistUrl(dnsblHost, domain) {
  switch (dnsblHost) {
    case "dbl.spamhaus.org":
      return `https://check.spamhaus.org/listed/?searchterm=${domain}`;
    case "multi.surbl.org":
      return `https://surbl.org/surbl-analysis?d=${domain}`;
    case "multi.uribl.com":
      return `https://lookup.uribl.com/?domain=${domain}`;
    default:
      return void 0;
  }
}
__name(getDelistUrl, "getDelistUrl");

export {
  DNSBL_LIST,
  checkBlacklists,
  getDelistUrl
};
//# sourceMappingURL=chunk-B72UYMWX.mjs.map
