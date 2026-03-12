# Google Postmaster Tools API - Research

**Researched:** 2026-03-12
**Domain:** Email deliverability monitoring via Google Postmaster Tools API + Microsoft SNDS
**Confidence:** HIGH (primary API docs verified), MEDIUM (Microsoft SNDS - limited API)

## Summary

Google provides the **Gmail Postmaster Tools API** -- a RESTful API that exposes email deliverability metrics for mail sent to Gmail users. It covers spam rates, domain/IP reputation, SPF/DKIM/DMARC pass rates, and delivery errors. Data is daily granularity, per-domain, and requires domains to be verified in Postmaster Tools first. A minimum of ~100-200 daily emails to Gmail recipients is needed for data to appear.

The API is transitioning from **v1** to **v2**. v1 is stable and has full Node.js support. v2 (currently v2beta) adds date-range queries, batch domain queries, and a compliance status endpoint. There is no announced v1 sunset date yet, but building on v1 now with a plan to migrate to v2 is the pragmatic approach.

Microsoft has **SNDS (Smart Network Data Services)** for Outlook/Hotmail consumer deliverability data, but it has no proper REST API -- only an authenticated CSV data feed URL. It also only covers consumer Microsoft mail (Outlook.com/Hotmail), NOT Office 365 enterprise. For O365 message tracing, a separate Exchange Online Reporting API exists but provides message-level trace data, not aggregate deliverability metrics.

**Primary recommendation:** Integrate Google Postmaster Tools API v1 now (with `@googleapis/gmailpostmastertools` npm package), using OAuth2 with refresh tokens stored encrypted in the database. Run a daily cron to pull previous day's stats. For Microsoft, implement SNDS CSV scraping as a secondary data source. Do not expect parity between Google and Microsoft data.

---

## 1. Google Postmaster Tools API

### API Basics

| Property | Value |
|----------|-------|
| Base URL | `https://gmailpostmastertools.googleapis.com` |
| Current stable version | v1 |
| Next version | v2beta (available now) |
| Node.js package | `@googleapis/gmailpostmastertools` or `googleapis` |
| Auth | OAuth 2.0 only (no API keys, no service accounts without delegation) |
| Data granularity | Daily, per verified domain |
| Data availability | ~2 day lag (data for day N appears on day N+2) |

### OAuth Scopes

| Scope | Access |
|-------|--------|
| `https://www.googleapis.com/auth/postmaster.readonly` | Read-only access to all Postmaster data (RECOMMENDED) |
| `https://www.googleapis.com/auth/postmaster.traffic.readonly` | Read-only traffic statistics only |
| `https://www.googleapis.com/auth/postmaster.domain` | Read-only domain information |
| `https://www.googleapis.com/auth/postmaster` | Full read/write (unnecessary for monitoring) |

**Use `postmaster.readonly`** -- it covers both domain listing and traffic stats.

### Authentication: OAuth2 Only (No Service Account Shortcut)

The API requires OAuth 2.0 user consent flow. A human user who has verified domains in Google Postmaster Tools must authorize the app. This means:

1. Create a Google Cloud project
2. Enable the "Gmail Postmaster Tools API"
3. Create OAuth 2.0 credentials (client ID + secret)
4. The domain owner (you/Jonathan) completes the OAuth consent flow once
5. Store the refresh token securely (encrypted in DB or env var)
6. Use refresh token to get access tokens for API calls

**Service accounts** do NOT work directly -- Postmaster Tools requires a user who has verified the domain. Domain-wide delegation could theoretically work if you have Google Workspace admin access, but the standard approach is a one-time OAuth consent flow per user.

**Implication for Outsignal:** You'll do the OAuth flow once from the admin dashboard, store the refresh token, and the daily cron uses it. If the token is revoked, you'll need to re-auth (add a health check for this).

### Domain Verification Requirement

Domains MUST be verified in Google Postmaster Tools before any data is available via the API. Verification options:

1. **DNS TXT record** (primary): Google provides a `google-site-verification=XXXX` value to add as a TXT record
2. **CNAME record** (alternative): Google provides a CNAME host/target pair

The domain to verify is your **DKIM signing domain** (d= domain) or **SPF domain** (Return-Path domain). For Outsignal's sending domains (outsignalio.com, outsignalai.com, outsignalgo.com, limerecuk.co.uk), each must be verified individually.

Verification takes seconds to 72 hours depending on DNS propagation.

### Minimum Volume Threshold

Google does not publish an exact number, but community consensus is:

- **~100-200 daily emails to Gmail recipients** = minimum to see any data
- **Below 100/day** = dashboards show empty ("no data")
- **5,000+/day** = you're classified as a "bulk sender" (different compliance rules apply)
- Google may suppress data on low-volume days to protect user privacy

**For Outsignal:** Cold email campaigns likely hit 100+ Gmail recipients per domain per day during active campaigns, but may drop below on quiet days. Expect intermittent data gaps.

### TrafficStats Resource Fields (v1)

The `TrafficStats` resource contains **all the metrics you want**:

| Field | Type | What it tells you |
|-------|------|-------------------|
| `name` | string | Resource ID: `domains/{domain}/trafficStats/{date}` |
| `userReportedSpamRatio` | number | Spam rate (0.0-1.0) -- THE key metric |
| `userReportedSpamRatioLowerBound` | number | Confidence interval lower bound |
| `userReportedSpamRatioUpperBound` | number | Confidence interval upper bound |
| `domainReputation` | enum | `HIGH`, `MEDIUM`, `LOW`, `BAD` |
| `ipReputations[]` | array | IP reputation entries with category + sample IPs |
| `spfSuccessRatio` | number | SPF pass rate (0.0-1.0) |
| `dkimSuccessRatio` | number | DKIM pass rate (0.0-1.0) |
| `dmarcSuccessRatio` | number | DMARC alignment pass rate (0.0-1.0) |
| `outboundEncryptionRatio` | number | TLS success for outbound |
| `inboundEncryptionRatio` | number | TLS success for inbound |
| `deliveryErrors[]` | array | Error entries with class + type + ratio |
| `spammyFeedbackLoops[]` | array | FBL identifiers with spam rates |

**Reputation enum values:** `HIGH`, `MEDIUM`, `LOW`, `BAD`, `REPUTATION_CATEGORY_UNSPECIFIED`

**Delivery error types:**
- `RATE_LIMIT_EXCEEDED`, `SUSPECTED_SPAM`, `CONTENT_SPAMMY`
- `BAD_ATTACHMENT`, `BAD_DMARC_POLICY`
- `LOW_IP_REPUTATION`, `LOW_DOMAIN_REPUTATION`
- `IP_IN_RBL`, `DOMAIN_IN_RBL`, `BAD_PTR_RECORD`

**Delivery error classes:** `PERMANENT_ERROR`, `TEMPORARY_ERROR`

### API Methods (v1)

```
GET /v1/domains                              -- List all verified domains
GET /v1/{name=domains/*}                     -- Get single domain info
GET /v1/{parent=domains/*}/trafficStats      -- List traffic stats (with date range params)
GET /v1/{name=domains/*/trafficStats/*}      -- Get traffic stats for specific date
```

**trafficStats.list parameters:**
- `parent` (required): `domains/{domain}`
- `startDate.year`, `startDate.month`, `startDate.day`
- `endDate.year`, `endDate.month`, `endDate.day`
- `pageSize`, `pageToken` (pagination)

### v2 API Changes (Future-Proofing)

v2 replaces `trafficStats` with `domainStats`:

| v1 | v2 |
|----|-----|
| `domains.trafficStats.get` | `domains.domainStats.query` (POST with date range) |
| `domains.trafficStats.list` | `domains.domainStats.query` (POST with date range) |
| N/A | `domains.domainStats.batchQuery` (multiple domains) |
| N/A | `domains.getComplianceStatus` (SPF/DKIM/DMARC compliance check) |

v2 improvements:
- Date range queries instead of per-day fetching
- Batch queries across multiple domains in one call
- Compliance status endpoint (quick SPF/DKIM/DMARC check)

**No v1 deprecation date announced yet.** Build on v1, plan to migrate to v2 when it reaches GA.

### Rate Limits

Google does not publish specific rate limits for the Postmaster Tools API. Standard Google API behavior applies:
- Default project quotas visible in Google Cloud Console
- Likely in the range of 1,000-10,000 requests/day (typical for low-volume Google APIs)
- A daily cron pulling stats for ~4-6 domains will be well within any limits

### Node.js Implementation

**Install:**
```bash
npm install @googleapis/gmailpostmastertools
# OR use the monolithic package:
npm install googleapis
```

**Usage pattern:**
```typescript
import { google } from 'googleapis';

// Setup OAuth2 client with stored refresh token
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_POSTMASTER_CLIENT_ID,
  process.env.GOOGLE_POSTMASTER_CLIENT_SECRET,
  'https://admin.outsignal.ai/api/auth/google-postmaster/callback'
);
oauth2Client.setCredentials({
  refresh_token: storedRefreshToken, // from DB
});

const postmaster = google.gmailpostmastertools({ version: 'v1', auth: oauth2Client });

// List verified domains
const { data: domainList } = await postmaster.domains.list();

// Get traffic stats for a domain over a date range
const { data: stats } = await postmaster.domains.trafficStats.list({
  parent: 'domains/outsignalio.com',
  'startDate.year': 2026,
  'startDate.month': 3,
  'startDate.day': 1,
  'endDate.year': 2026,
  'endDate.month': 3,
  'endDate.day': 12,
});

// Each entry in stats.trafficStats[] has:
// - userReportedSpamRatio
// - domainReputation
// - spfSuccessRatio, dkimSuccessRatio, dmarcSuccessRatio
// - deliveryErrors[]
// - ipReputations[]
```

### Architecture for Outsignal Integration

```
src/
  lib/
    postmaster/
      client.ts          # OAuth2 setup, token management
      types.ts           # TypeScript types for API responses
      sync.ts            # Daily sync logic
  app/
    api/
      auth/
        google-postmaster/
          route.ts       # OAuth consent initiation
          callback/
            route.ts     # OAuth callback, store refresh token
      cron/
        postmaster-sync/
          route.ts       # Daily cron: pull stats, store in DB
    (admin)/
      domain-health/
        page.tsx         # Dashboard showing Postmaster data
```

**Database model (Prisma):**
```prisma
model PostmasterStats {
  id                String   @id @default(cuid())
  domain            String
  date              DateTime @db.Date
  spamRate          Float?
  spamRateLower     Float?
  spamRateUpper     Float?
  domainReputation  String?  // HIGH, MEDIUM, LOW, BAD
  spfSuccessRatio   Float?
  dkimSuccessRatio  Float?
  dmarcSuccessRatio Float?
  outboundEncryptionRatio Float?
  deliveryErrors    Json?    // Array of error objects
  ipReputations     Json?    // Array of IP reputation objects
  rawData           Json?    // Full API response for reference
  createdAt         DateTime @default(now())

  @@unique([domain, date])
  @@index([domain])
  @@index([date])
}

model PostmasterAuth {
  id            String   @id @default(cuid())
  userId        String   // Admin user who authorized
  refreshToken  String   // Encrypted
  accessToken   String?  // Short-lived, can be null
  expiresAt     DateTime?
  scopes        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Common Pitfalls

1. **"No data" panic**: Data requires 100+ daily Gmail recipients AND a ~2-day lag. Don't assume something is broken when stats are empty.

2. **Token expiry/revocation**: Google refresh tokens can be revoked by the user or expire if the app is in "testing" mode in Google Cloud (tokens expire after 7 days for unverified apps). **Must** publish the OAuth consent screen or at minimum keep it in "internal" mode if using Workspace.

3. **Domain mismatch**: You must verify the exact domain used in DKIM/SPF, not just your primary domain. If EmailBison signs with a different d= domain, you need THAT domain verified.

4. **Spam rate interpretation**: `userReportedSpamRatio` is user-reported spam (people clicking "Report Spam"), NOT algorithmic classification. A ratio of 0.001 (0.1%) is the danger threshold per Google's sender guidelines.

5. **v1 to v2 migration**: Don't build deep abstractions around v1's per-day model. The v2 API uses date ranges, so design your sync to be adaptable.

6. **OAuth consent screen verification**: For external users, Google requires app verification (security review). Since only your admin account needs access, configure the consent screen as "Internal" (Google Workspace) or add your email as a test user.

---

## 2. Microsoft SNDS (Smart Network Data Services)

### Overview

| Property | Value |
|----------|-------|
| URL | `https://sendersupport.olc.protection.outlook.com/snds/` |
| Coverage | Consumer Outlook.com / Hotmail ONLY (NOT Office 365) |
| API | No REST API. Authenticated CSV data feed via URL |
| Auth | Microsoft account login, then generate automated access key |
| Data | Per-IP, NOT per-domain |
| Minimum volume | ~100+ daily messages per IP |

### What SNDS Provides

| Metric | Description |
|--------|-------------|
| Filter Results | Green/Yellow/Red status per IP |
| Complaint Rate | % of users reporting spam |
| Trap Hits | Messages hitting spam traps (count) |
| RCPT Commands | Volume of recipient commands |
| DATA Commands | Volume of data commands |
| Sample Messages | One sample per IP per violation type per day |

### What SNDS Does NOT Provide

- Domain reputation (it's IP-based only)
- SPF/DKIM/DMARC pass rates
- Delivery error breakdown
- Office 365 / Microsoft 365 enterprise data
- A proper REST API

### Automated Data Access

SNDS provides an authenticated URL for programmatic data retrieval:

```
https://sendersupport.olc.protection.outlook.com/snds/data.aspx?key=YOUR_UNIQUE_KEY
```

- The key is generated from your SNDS account settings
- Returns CSV data
- **Keys expire after 30 days** (as of Jan 2026 update) -- must be regenerated
- Requires initial manual setup via the SNDS web portal

### Integration Approach for Outsignal

Since there's no real REST API, integration requires:

1. Manual SNDS account setup and IP registration
2. Generate automated data access key
3. Build a simple HTTP fetch + CSV parser that hits the data URL
4. Store the key in env vars (with a reminder to regenerate every 30 days)
5. Parse the CSV response into structured data

```typescript
// Rough approach
const response = await fetch(
  `https://sendersupport.olc.protection.outlook.com/snds/data.aspx?key=${process.env.SNDS_DATA_KEY}`
);
const csvText = await response.text();
// Parse CSV rows: IP, activity start, activity end, RCPT commands, DATA commands,
//                 filter result, complaint rate, trap hits, sample HELO, sample MAIL FROM
```

### Limitations for Cold Email Use Case

- **IP-based**: EmailBison/Google Workspace sends from Google's IPs, not your own. You likely can't register Google's SMTP IPs in SNDS.
- **Consumer only**: If your targets use Microsoft 365 (business), SNDS data doesn't cover them.
- **30-day key expiry**: Automated access keys now expire, requiring periodic manual renewal.

**Verdict: SNDS has limited utility for Outsignal's use case.** Your mail goes through Google Workspace SMTP (Google's IPs) and EmailBison's infrastructure. You don't own the sending IPs, so you likely can't register them in SNDS. This is really only useful if you operate your own mail servers.

---

## 3. Microsoft 365 Message Trace API (Alternative)

For Office 365 enterprise deliverability data, Microsoft offers the **Exchange Online Reporting API**:

```
https://reports.office365.com/ecp/ReportingWebService/Reporting.svc/MessageTrace
```

However, this is for **your own tenant's outbound/inbound mail** -- it shows message-level trace data (delivered, rejected, deferred) for mail flowing through your O365 tenant. It does NOT provide:
- Recipient-side reputation data
- Spam rates from the recipient's perspective
- Aggregate deliverability metrics

**Not useful for monitoring how recipients at Microsoft see your mail.** Only useful if you wanted to trace individual message delivery paths through your own O365 infrastructure.

---

## 4. Recommendations for Outsignal

### Priority 1: Google Postmaster Tools API (HIGH value)

- Google is the dominant inbox (~60%+ of consumer email)
- API provides exactly the metrics you need
- Daily cron is simple to implement
- OAuth setup is a one-time manual step

### Priority 2: Skip SNDS for Now (LOW value)

- You don't own the sending IPs (EmailBison/Google Workspace does)
- Data covers only consumer Outlook/Hotmail (not O365 enterprise)
- No proper API, keys expire every 30 days
- Revisit only if you move to dedicated IP sending

### Priority 3: Existing DNSBL Monitoring (ALREADY DONE)

- You already have domain health monitoring (Phase 29-30)
- DNSBL checks cover blacklist status across both Google and Microsoft
- This remains your best signal for Microsoft-side deliverability issues

### Future Consideration: Third-Party Deliverability APIs

If you need Microsoft inbox placement data, consider third-party services:
- **Google Postmaster + your existing DNSBL checks** cover 90% of the need
- Services like GlockApps, MailMonitor, or 250ok provide cross-provider inbox placement testing (but are paid SaaS)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 token management | Custom token refresh logic | `google-auth-library` (bundled with googleapis) | Handles refresh, expiry, retry automatically |
| CSV parsing for SNDS | Regex-based parser | `csv-parse` npm package | Edge cases with quoting, encoding |
| Postmaster API client | Raw HTTP calls | `@googleapis/gmailpostmastertools` | Type-safe, handles pagination, auth |

---

## Sources

### Primary (HIGH confidence)
- [Gmail Postmaster Tools API Reference](https://developers.google.com/workspace/gmail/postmaster/reference/rest) - REST resources, methods
- [TrafficStats Resource](https://developers.google.com/gmail/postmaster/reference/rest/v1/domains.trafficStats) - All field definitions, enum types
- [API Setup Guide](https://developers.google.com/gmail/postmaster/guides/setup) - OAuth scopes, auth flow
- [v1 to v2 Migration Guide](https://developers.google.com/workspace/gmail/postmaster/guides/migration-v2) - v2 changes
- [Node.js API Docs](https://googleapis.dev/nodejs/googleapis/latest/gmailpostmastertools/classes/Resource$Domains$Trafficstats.html) - Method signatures

### Secondary (MEDIUM confidence)
- [Microsoft SNDS Portal](https://sendersupport.olc.protection.outlook.com/snds/index) - SNDS overview and FAQ
- [Mailtrap SNDS Tutorial 2026](https://mailtrap.io/blog/microsoft-snds/) - SNDS capabilities and limitations
- [@googleapis/gmailpostmastertools npm](https://www.npmjs.com/package/@googleapis/gmailpostmastertools) - Package info
- [Google Sender Guidelines](https://support.google.com/a/answer/81126?hl=en) - Volume thresholds

### Tertiary (LOW confidence)
- Minimum volume threshold (~100-200/day) - community consensus, not officially documented by Google
- Rate limits - not publicly documented, estimated from similar Google APIs
