# Inbox Placement Testing - Research

**Researched:** 2026-03-12
**Domain:** Email deliverability / inbox placement testing APIs
**Confidence:** HIGH (existing implementation verified + API docs reviewed)

## Summary

The Outsignal project already has a fully working mail-tester.com integration built in Phase 30. The implementation covers: requesting a test address via API, sending a realistic campaign email through EmailBison's dedicated IP endpoint, polling for results, storing scores in a PlacementTest model, updating EmailSenderHealth status, and sending Slack/email notifications on warning/critical scores.

Mail-tester.com remains the best option for this use case: cheapest per-test cost ($0.10 at the 500-credit tier), simple REST API with no SDK needed, and the integration is already live. The main pending item is purchasing the $50/500-credit pack and setting the `MAILTESTER_API_KEY` env var on Vercel.

**Primary recommendation:** Purchase the mail-tester.com credits ($50/500), set the env var, and the existing code is ready to go. No alternative service is needed.

---

## mail-tester.com API - Complete Reference

### How It Works (3-Step Flow)

1. **Get test address:** `GET https://www.mail-tester.com/api?key={apiKey}&format=json`
   - Returns: `{ "address": "test-xxx@srv1.mail-tester.com", "id": "test-xxx" }`
   - Each call consumes 1 credit

2. **Send your email** to that test address (via your normal sending infrastructure)
   - For Outsignal: uses EmailBison `POST https://dedi.emailbison.com/api/replies/new` with `use_dedicated_ips: true`

3. **Fetch results:** `GET https://www.mail-tester.com/api?key={apiKey}&id={testId}&format=json`
   - Returns 404/202 if not ready yet; poll every ~10s
   - Returns full JSON when ready (typically 15-45 seconds after sending)

### Authentication

- API key passed as query parameter: `?key={apiKey}`
- No OAuth, no headers, no SDK - plain REST
- Key obtained after purchasing credits at https://www.mail-tester.com/manager/

### Response Data Structure

The API returns 6 main categories:

| Category | Key Fields | What It Tells You |
|----------|-----------|-------------------|
| **Main** | `score` (0-10), `id`, comments | Overall deliverability score |
| **messageInfo** | subject, reception date, bounce address | Message metadata |
| **spamAssassin** | rules array (code, score, suggestion per rule) | Content spam analysis |
| **signature** | SPF pass/fail, DKIM pass/fail, DMARC pass/fail, rDNS | Authentication checks |
| **body** | HTML/text ratio, forbidden tags | Content structure analysis |
| **blacklists** | listed domains/IPs, clean domains/IPs | DNSBL check results |

Optional parameters:
- `&test=key` - Get specific test only (e.g., `&test=signature`)
- `&lang=fr-fr` - Change response language
- `&format=dbug` - Debug visualization instead of JSON

### Pricing (Confirmed from official site)

| Credits | Cost | Per Test |
|---------|------|----------|
| 500 | $50 | $0.10 |
| 1,000 | $80 | $0.08 |
| 5,000 | $250 | $0.05 |
| 20,000 | $700 | $0.035 |
| 100,000 | $2,500 | $0.025 |

- Credits never expire
- No monthly subscription required
- API access included at all tiers
- No rate limit documented (but reasonable usage expected)

### Node.js Integration

- No official SDK - REST-only
- Standard `fetch()` works perfectly (already implemented in project)
- No npm package needed

### Limitations

- **Not true inbox placement testing** - mail-tester.com checks spam score, authentication (SPF/DKIM/DMARC), content quality, and blacklists. It does NOT test actual inbox vs spam folder placement across Gmail, Outlook, Yahoo, etc.
- It answers "would this email likely land in spam?" not "did this email actually land in inbox?"
- For actual inbox placement testing, you need a seed list service (GlockApps, Mailreach, etc.)

---

## Existing Implementation in Outsignal

The project already has a complete mail-tester.com integration (Phase 30):

| File | Purpose |
|------|---------|
| `src/lib/placement/mailtester.ts` | API client: `getTestAddress()`, `fetchTestResults()`, `pollForResults()`, `classifyScore()` |
| `src/lib/placement/types.ts` | Types: `MailTesterResponse`, `MailTesterDetails`, thresholds (7=good, 5=warning) |
| `src/lib/placement/send-test.ts` | Sends test email via EmailBison dedicated IP endpoint |
| `src/lib/placement/recommended.ts` | Identifies senders needing tests (>3% bounce, 20+ sends) |
| `src/lib/placement/notifications.ts` | Slack + email alerts on warning/critical scores |
| `src/app/api/placement-tests/route.ts` | API endpoint: POST (trigger test), GET (fetch history + re-fetch pending) |

### Current Flow
1. Admin calls `POST /api/placement-tests` with `{ senderEmail, workspaceSlug }`
2. System looks up sender in EmailBison, gets test address from mail-tester.com
3. Sends realistic cold email via EmailBison dedicated IP
4. Polls mail-tester.com for up to 60s (Vercel function timeout)
5. If results arrive: stores score + details, updates EmailSenderHealth, sends notifications
6. If still pending after 60s: returns 202, admin can re-fetch via `GET ?refetch=true`

### What's Missing
- `MAILTESTER_API_KEY` not yet set on Vercel (need to purchase credits first)
- No cron-based automated testing (deferred to future phase)
- No dashboard UI (was Phase 32 scope)

---

## Alternatives Comparison

### GlockApps - True Inbox Placement Testing

**What it does differently:** Sends to a seed list of real mailboxes across Gmail, Outlook, Yahoo, AOL, etc. and checks actual inbox/spam/missing placement per provider.

| Plan | Monthly | Spam Test Credits | API Access |
|------|---------|-------------------|------------|
| Free | $0 | 2 | No |
| Essential | $59 | 360 | No |
| Growth | $99 | 1,080 | No |
| Enterprise | $129 | 1,800 | Yes (GET only) |
| Large Enterprise | Custom | Custom | Full API (GET + POST) |

**Verdict:** API only on Enterprise ($129/mo) or Large Enterprise. Much more expensive than mail-tester.com. Overkill for current needs (9 clients, ~100 senders). The per-test cost works out to ~$0.07-0.36 depending on plan, but you're paying monthly regardless.

### Mailreach

**What it does:** Warmup service with inbox placement testing. Sends to seed list of 35+ accounts across providers.

| Feature | Details |
|---------|---------|
| Pricing | $25/mailbox/month (warmup) + spam test credits from $19.50/20 credits |
| Per test cost | ~$0.98/test |
| API | Available for warmup; placement test automation unclear |
| Seed list size | 35+ accounts |

**Verdict:** Expensive per test. Better suited as a warmup tool than a placement testing API. Not a good fit for automated testing at scale.

### Mailosaur

**What it does:** Developer-focused email testing API (QA/testing, not deliverability).

**Verdict:** Wrong tool. Designed for testing email sends in development/QA, not inbox placement analysis. No spam scoring or deliverability metrics.

### DIY Seed List Approach (FREE)

**How it works:**
1. Create 15-25 personal email accounts across Gmail, Outlook, Yahoo, AOL
2. Send test emails to all seed accounts
3. Check each inbox manually (or build IMAP checker) to see inbox vs spam placement

**Pros:** Free, tests actual placement, provider-specific results
**Cons:** Manual maintenance, accounts may get deactivated, building IMAP checker is significant work, doesn't scale

**Verdict:** Not practical for automation. Could work as a one-off manual check but defeats the purpose of API-driven testing.

### SpamAssassin (Self-hosted, FREE)

**What it does:** Open-source spam filter. Can score emails locally against the same rules mail servers use.

**Verdict:** Only covers content/header analysis. No authentication checks (SPF/DKIM/DMARC require actual email delivery), no blacklist checks, no inbox placement. mail-tester.com does this plus more for $0.10/test.

---

## Recommendation Matrix

| Need | Best Option | Cost | Notes |
|------|-------------|------|-------|
| Spam score + auth checks + blacklists | **mail-tester.com** (already built) | $0.10/test | Current implementation, just needs API key |
| True inbox placement (inbox vs spam per provider) | GlockApps Enterprise | $129/mo | Only needed if mail-tester.com scores don't correlate with actual placement |
| Email warmup | Mailreach or InboxAlly | $25+/mailbox/mo | Different problem - warmup is separate from testing |
| Free option | DIY seed list | $0 | Manual only, not automatable |

### Bottom Line

Mail-tester.com at $0.10/test is the right call for current scale. It tests everything except actual inbox/spam folder placement (which requires seed lists at 10-100x the cost). The score correlates well with deliverability since it checks the same signals mail servers use (SpamAssassin rules, authentication, blacklists, content).

If you later find that senders score 8+/10 on mail-tester.com but still land in spam, that's when GlockApps Enterprise ($129/mo) becomes worth considering for true seed-list placement testing.

---

## Can This Be Fully Automated in a Cron Job?

**Yes, with caveats:**

1. **Vercel 60s timeout** - The current polling approach (6 attempts x 10s = 60s max) fits within Vercel's hobby plan function timeout. If results arrive within 60s (typical), it works end-to-end in a single request.

2. **For cron automation** - A cron job would:
   - Call `getRecommendedForTesting()` to find at-risk senders
   - For each sender: trigger a placement test
   - Due to the 60s timeout, you'd want to batch (1-2 senders per cron run) or split into trigger + collect phases

3. **Two-phase approach for reliability:**
   - **Phase A (trigger):** Cron sends test emails, creates pending PlacementTest records
   - **Phase B (collect):** Separate cron (5 min later) fetches results for pending tests
   - This avoids timeout issues entirely

4. **Credit budgeting:** At $0.10/test, testing all ~100 senders weekly = $10/week = ~$40/month. Testing only recommended (high-bounce) senders = much less.

---

## Sources

### Primary (HIGH confidence)
- [mail-tester.com API Documentation](https://www.mail-tester.com/manager/api-documentation.html) - Full API reference
- [mail-tester.com Pricing](https://www.mail-tester.com/manager/) - Credit tiers confirmed
- Existing project code at `src/lib/placement/` - Verified working implementation

### Secondary (MEDIUM confidence)
- [GlockApps Pricing](https://glockapps.com/pricing/) - Plan details and API tier requirements
- [GlockApps API Documentation](https://glockapps.com/api-documentation-v2/) - Enterprise-only API access confirmed
- [Mailreach Pricing](https://www.mailreach.co/pricing) - Per-mailbox and credit pricing
- [Woodpecker mail-tester review](https://woodpecker.co/blog/mailtester-review/) - Feature overview

### Tertiary (LOW confidence)
- DIY seed list approach details from multiple blog posts - general patterns, not verified firsthand
