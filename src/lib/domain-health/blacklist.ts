/**
 * DNSBL (DNS-based Blackhole List) blacklist checker.
 * Checks sending domains against domain-based DNSBLs used by Gmail/Outlook and major MTAs.
 *
 * Architecture:
 * - Domain-based DNSBLs only: query {domain}.{dnsbl}
 * - All 3 checks run in parallel via Promise.allSettled
 * - 3s timeout per query — graceful failure on DNS errors/timeouts
 *
 * Note: IP-based DNSBLs removed (2026-03) — EmailBison sends via SMTP auth
 * through Google/Microsoft, so delivering IPs belong to those providers, not us.
 * Removed IP lists: Spamhaus ZEN, Barracuda, SpamCop, CBL, PSBL, UBL, GBUdb,
 * UCEPROTECT, Mailspike, Invaluement.
 */

import { Resolver } from "dns/promises";

const BLACKLIST_TIMEOUT_MS = 3000;
const LOG_PREFIX = "[domain-health/blacklist]";

export interface DnsblEntry {
  /** Hostname of the DNSBL to query */
  host: string;
  /** Display name */
  name: string;
  /** critical = Gmail/Outlook actually check these; warning = others that matter */
  tier: "critical" | "warning";
  /** Link to self-service delisting */
  delistUrl?: string;
}

export interface BlacklistHit {
  list: string;
  tier: "critical" | "warning";
  delistUrl?: string;
}

export interface BlacklistResult {
  domain: string;
  hits: BlacklistHit[];
  checkedAt: Date;
}

/**
 * Domain-based DNSBLs — the 3 lists that matter for domain reputation.
 * Critical = Spamhaus DBL (Gmail and Outlook actively check this).
 * Warning = SURBL + URIBL (used by major spam filters).
 */
// Defunct/low-value lists removed (2026-03): SORBS x3, WPBL, iX NiXSpam (shutdown),
// SpamEatingMonkey, JustSpam, TTK PTE, s5h.net, SpamRATS (low impact)
// IP-based lists removed (2026-03): EB sends via Google/Microsoft SMTP — IPs are theirs, not ours
export const DNSBL_LIST: DnsblEntry[] = [
  {
    host: "dbl.spamhaus.org",
    name: "Spamhaus DBL (Domain Block List)",
    tier: "critical",
    delistUrl: "https://check.spamhaus.org/listed/",
  },
  {
    host: "multi.surbl.org",
    name: "SURBL Multi",
    tier: "warning",
    delistUrl: "https://surbl.org/surbl-analysis",
  },
  {
    host: "multi.uribl.com",
    name: "URIBL Multi",
    tier: "warning",
    delistUrl: "https://lookup.uribl.com/",
  },
];

// Per-DNSBL error IPs: some DNSBLs return specific IPs to signal resolver errors,
// not actual listings. These vary by provider and must be filtered per-host.
// - Spamhaus: 127.255.255.x = error (252=excessive queries, 254=public resolver, 255=general)
// - URIBL: 127.0.0.1 = public/cloud resolver blocked (NOT a real listing)
// - SURBL: 127.0.0.1 = public/cloud resolver blocked
const GLOBAL_ERROR_IPS = new Set([
  "127.255.255.252",
  "127.255.255.254",
  "127.255.255.255",
]);
const PER_HOST_ERROR_IPS: Record<string, Set<string>> = {
  "multi.uribl.com": new Set(["127.0.0.1"]),
  "multi.surbl.org": new Set(["127.0.0.1"]),
};

/**
 * Check a single DNSBL for a given domain.
 * Returns the DNSBL entry if listed, null if clean or on error.
 */
async function checkSingleDnsbl(
  resolver: Resolver,
  domain: string,
  entry: DnsblEntry,
): Promise<DnsblEntry | null> {
  const lookupHost = `${domain}.${entry.host}`;
  try {
    const addresses = await resolver.resolve4(lookupHost);
    // Filter out DNSBL error responses (not actual listings)
    const hostErrors = PER_HOST_ERROR_IPS[entry.host];
    const realHits = addresses.filter(
      (ip) => !GLOBAL_ERROR_IPS.has(ip) && !hostErrors?.has(ip),
    );
    if (realHits.length === 0) {
      console.warn(
        `${LOG_PREFIX} ${lookupHost}: DNSBL error response (${addresses.join(",")}), not a real listing`,
      );
      return null;
    }
    return entry;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    // ENOTFOUND = not listed (NXDOMAIN), ENODATA = no A records = not listed
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return null;
    }
    // Other errors (timeout, ESERVFAIL, etc.) — log and treat as unknown (not listed)
    if (code !== "ETIMEOUT" && code !== "ESERVFAIL") {
      console.warn(
        `${LOG_PREFIX} DNS error checking ${lookupHost}: ${(err as Error).message}`,
      );
    }
    return null;
  }
}

/**
 * Check a domain against all domain-based DNSBLs.
 * All checks run in parallel. DNS errors are logged but don't fail the overall check.
 */
export async function checkBlacklists(
  domain: string,
): Promise<BlacklistResult> {
  const resolver = new Resolver({ timeout: BLACKLIST_TIMEOUT_MS });

  const checks = DNSBL_LIST.map((entry) =>
    checkSingleDnsbl(resolver, domain, entry),
  );

  const results = await Promise.allSettled(checks);

  const hits: BlacklistHit[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const entry = DNSBL_LIST[i];

    if (result.status === "fulfilled" && result.value !== null) {
      hits.push({
        list: entry.name,
        tier: entry.tier,
        delistUrl:
          getDelistUrl(entry.host, domain) ?? entry.delistUrl,
      });
    } else if (result.status === "rejected") {
      console.error(
        `${LOG_PREFIX} Unexpected error checking ${entry.host} for ${domain}:`,
        result.reason,
      );
    }
  }

  if (hits.length > 0) {
    console.warn(
      `${LOG_PREFIX} Domain ${domain} listed on ${hits.length} DNSBL(s): ${hits.map((h) => h.list).join(", ")}`,
    );
  }

  return {
    domain,
    hits,
    checkedAt: new Date(),
  };
}

/**
 * Generate a pre-filled delist URL for a specific domain on a given DNSBL.
 */
export function getDelistUrl(
  dnsblHost: string,
  domain: string,
): string | undefined {
  switch (dnsblHost) {
    case "dbl.spamhaus.org":
      return `https://check.spamhaus.org/listed/?searchterm=${domain}`;
    case "multi.surbl.org":
      return `https://surbl.org/surbl-analysis?d=${domain}`;
    case "multi.uribl.com":
      return `https://lookup.uribl.com/?domain=${domain}`;
    default:
      return undefined;
  }
}
