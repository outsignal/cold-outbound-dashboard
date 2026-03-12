import {
  require_package
} from "../../../chunk-WOEI4MCZ.mjs";
import {
  ZodFirstPartyTypeKind,
  anthropic,
  external_exports,
  generateObject
} from "../../../chunk-QQDFUQQM.mjs";
import "../../../chunk-W7HBEXJ4.mjs";
import {
  require_follow_redirects,
  require_form_data,
  require_proxy_from_env
} from "../../../chunk-I775ELQ2.mjs";
import {
  prisma
} from "../../../chunk-6UNNRELO.mjs";
import {
  require_default
} from "../../../chunk-6DNKPBNV.mjs";
import {
  schedules_exports
} from "../../../chunk-ZD6M6VDX.mjs";
import "../../../chunk-4GNBCTMK.mjs";
import {
  __export,
  __name,
  __toESM,
  init_esm
} from "../../../chunk-QA7U3GQ6.mjs";

// trigger/enrichment-job-processor.ts
init_esm();
var import_client = __toESM(require_default());

// src/lib/enrichment/queue.ts
init_esm();
async function processNextChunk(onProcess) {
  const job = await prisma.enrichmentJob.findFirst({
    where: {
      OR: [
        { status: "pending" },
        { status: "paused", resumeAt: { lte: /* @__PURE__ */ new Date() } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });
  if (!job) return null;
  await prisma.enrichmentJob.update({
    where: { id: job.id },
    data: { status: "running" }
  });
  try {
    const allIds = JSON.parse(job.entityIds);
    const chunkStart = job.processedCount;
    const chunk = allIds.slice(chunkStart, chunkStart + job.chunkSize);
    const errors = [];
    let processedInChunk = 0;
    for (const entityId of chunk) {
      if (onProcess) {
        try {
          await onProcess(entityId, {
            entityType: job.entityType,
            provider: job.provider,
            workspaceSlug: job.workspaceSlug
          });
          processedInChunk++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg === "DAILY_CAP_HIT") {
            const tomorrow = /* @__PURE__ */ new Date();
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);
            await prisma.enrichmentJob.update({
              where: { id: job.id },
              data: {
                status: "paused",
                resumeAt: tomorrow,
                processedCount: chunkStart + processedInChunk
              }
            });
            return {
              jobId: job.id,
              processed: processedInChunk,
              total: job.totalCount,
              done: false,
              status: "paused"
            };
          }
          errors.push({ entityId, error: errMsg });
          processedInChunk++;
        }
      }
    }
    const newProcessedCount = chunkStart + chunk.length;
    const done = newProcessedCount >= job.totalCount;
    let existingErrors = [];
    if (job.errorLog) {
      try {
        existingErrors = JSON.parse(job.errorLog);
      } catch {
      }
    }
    const allErrors = [...existingErrors, ...errors];
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        processedCount: newProcessedCount,
        status: done ? "complete" : "pending",
        errorLog: allErrors.length > 0 ? JSON.stringify(allErrors) : null
      }
    });
    return {
      jobId: job.id,
      processed: chunk.length,
      total: job.totalCount,
      done,
      status: done ? "complete" : "pending"
    };
  } catch (error) {
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorLog: JSON.stringify([
          { entityId: "system", error: error instanceof Error ? error.message : String(error) }
        ])
      }
    });
    throw error;
  }
}
__name(processNextChunk, "processNextChunk");

// src/lib/enrichment/waterfall.ts
init_esm();

// src/lib/enrichment/dedup.ts
init_esm();
async function shouldEnrich(entityId, entityType, provider) {
  const successfulRun = await prisma.enrichmentLog.findFirst({
    where: { entityId, entityType, provider, status: "success" },
    select: { id: true }
  });
  return successfulRun === null;
}
__name(shouldEnrich, "shouldEnrich");

// src/lib/enrichment/log.ts
init_esm();
async function recordEnrichment(params) {
  await prisma.enrichmentLog.create({
    data: {
      entityId: params.entityId,
      entityType: params.entityType,
      provider: params.provider,
      status: params.status ?? "success",
      fieldsWritten: params.fieldsWritten ? JSON.stringify(params.fieldsWritten) : null,
      costUsd: params.costUsd ?? null,
      rawResponse: params.rawResponse ? JSON.stringify(params.rawResponse) : null,
      errorMessage: params.errorMessage ?? null,
      workspaceSlug: params.workspaceSlug ?? null
    }
  });
}
__name(recordEnrichment, "recordEnrichment");

// src/lib/enrichment/costs.ts
init_esm();
var PROVIDER_COSTS = {
  prospeo: 2e-3,
  leadmagic: 5e-3,
  "leadmagic-verify": 0.05,
  // Email verification — $0.05 per valid/invalid/valid_catch_all result
  findymail: 1e-3,
  aiark: 3e-3,
  firecrawl: 1e-3,
  // Discovery source costs
  "apollo-search": 0,
  // Apollo search is free
  "prospeo-search": 2e-3,
  // 1 credit per search request
  "aiark-search": 3e-3,
  // Same as enrichment per-call cost
  "serper-web": 1e-3,
  // 1 credit per search
  "serper-maps": 1e-3,
  // 1 credit per search
  "serper-social": 1e-3,
  // 1 credit per search
  "firecrawl-extract": 1e-3,
  // 1 credit per extract
  "apify-leads-finder": 2e-3,
  // ~$2/1K leads, charged per lead
  "builtwith": 2e-3,
  // ~$0.002 per URL checked (Apify compute)
  "google-maps": 5e-3,
  // ~$0.005 per search (Apify compute)
  "ecommerce-stores": 4e-3
  // ~$0.0039 per lead (pay-per-result)
};
var DEFAULT_DAILY_CAP_USD = 10;
function getDailyCap() {
  return parseFloat(process.env.ENRICHMENT_DAILY_CAP_USD ?? String(DEFAULT_DAILY_CAP_USD));
}
__name(getDailyCap, "getDailyCap");
function todayUtc() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayUtc, "todayUtc");
async function checkDailyCap() {
  const today = todayUtc();
  const record = await prisma.dailyCostTotal.findUnique({ where: { date: today } });
  return (record?.totalUsd ?? 0) >= getDailyCap();
}
__name(checkDailyCap, "checkDailyCap");
async function incrementDailySpend(provider, costUsd) {
  const today = todayUtc();
  await prisma.dailyCostTotal.upsert({
    where: { date: today },
    update: { totalUsd: { increment: costUsd } },
    create: { date: today, totalUsd: costUsd }
  });
}
__name(incrementDailySpend, "incrementDailySpend");

// src/lib/enrichment/merge.ts
init_esm();
async function mergePersonData(personId, data) {
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
  const updates = {};
  const fieldsWritten = [];
  for (const [key, value] of Object.entries(data)) {
    if (value != null && value !== "" && person[key] == null) {
      updates[key] = value;
      fieldsWritten.push(key);
    }
  }
  if (Object.keys(updates).length > 0) {
    await prisma.person.update({ where: { id: personId }, data: updates });
  }
  return fieldsWritten;
}
__name(mergePersonData, "mergePersonData");
async function mergeCompanyData(domain, data) {
  const company = await prisma.company.findUniqueOrThrow({ where: { domain } });
  const updates = {};
  const fieldsWritten = [];
  for (const [key, value] of Object.entries(data)) {
    if (value != null && value !== "" && company[key] == null) {
      updates[key] = value;
      fieldsWritten.push(key);
    }
  }
  if (Object.keys(updates).length > 0) {
    await prisma.company.update({ where: { domain }, data: updates });
  }
  return fieldsWritten;
}
__name(mergeCompanyData, "mergeCompanyData");

// src/lib/enrichment/providers/prospeo.ts
init_esm();
var PROSPEO_ENDPOINT = "https://api.prospeo.io/enrich-person";
var TIMEOUT_MS = 1e4;
function getApiKey() {
  const key = process.env.PROSPEO_API_KEY;
  if (!key) throw new Error("PROSPEO_API_KEY environment variable is not set");
  return key;
}
__name(getApiKey, "getApiKey");
var ProspeoResponseSchema = external_exports.object({
  error: external_exports.boolean(),
  person: external_exports.object({
    email: external_exports.object({
      email: external_exports.string().nullable().optional()
    }).optional()
  }).optional()
});
var prospeoAdapter = /* @__PURE__ */ __name(async (input) => {
  const hasLinkedin = Boolean(input.linkedinUrl);
  const hasNameAndCompany = Boolean(input.firstName) && Boolean(input.lastName) && Boolean(input.companyName ?? input.companyDomain);
  if (!hasLinkedin && !hasNameAndCompany) {
    return {
      email: null,
      source: "prospeo",
      rawResponse: { skipped: "insufficient input" },
      costUsd: 0
    };
  }
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let raw;
  try {
    const body = hasLinkedin ? { data: { linkedin_url: input.linkedinUrl } } : {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        company_website: input.companyDomain
      }
    };
    const res = await fetch(PROSPEO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      if (res.status === 429) {
        const err = new Error(`Prospeo rate-limited: HTTP 429`);
        err.status = 429;
        throw err;
      }
      if (res.status === 404 || res.status === 422) {
        const err = new Error(`Prospeo returned HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      throw new Error(`Prospeo HTTP error: ${res.status} ${res.statusText}`);
    }
    raw = await res.json();
  } finally {
    clearTimeout(timeout);
  }
  const parsed = ProspeoResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[prospeoAdapter] Zod validation failed:", parsed.error.message, "rawResponse:", raw);
    return {
      email: null,
      source: "prospeo",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.prospeo
    };
  }
  const email = parsed.data.person?.email?.email ?? null;
  return {
    email,
    source: "prospeo",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.prospeo
  };
}, "prospeoAdapter");

// src/lib/enrichment/providers/leadmagic.ts
init_esm();
var EMAIL_FINDER_ENDPOINT = "https://api.leadmagic.io/v1/people/email-finder";
var PROFILE_SEARCH_ENDPOINT = "https://api.leadmagic.io/v1/people/profile-search";
var TIMEOUT_MS2 = 1e4;
function getApiKey2() {
  const key = process.env.LEADMAGIC_API_KEY;
  if (!key) throw new Error("LEADMAGIC_API_KEY environment variable is not set");
  return key;
}
__name(getApiKey2, "getApiKey");
var EmailFinderResponseSchema = external_exports.object({
  email: external_exports.string().nullable().optional(),
  status: external_exports.string().optional(),
  credits_consumed: external_exports.number().optional(),
  first_name: external_exports.string().optional(),
  last_name: external_exports.string().optional(),
  domain: external_exports.string().optional(),
  mx_record: external_exports.string().optional(),
  mx_provider: external_exports.string().optional(),
  mx_security_gateway: external_exports.boolean().optional(),
  has_mx: external_exports.boolean().optional(),
  company_name: external_exports.string().optional(),
  company_industry: external_exports.string().nullable().optional(),
  message: external_exports.string().optional()
});
var ProfileSearchResponseSchema = external_exports.object({
  profile_url: external_exports.string().optional(),
  credits_consumed: external_exports.number().optional(),
  first_name: external_exports.string().optional(),
  last_name: external_exports.string().optional(),
  full_name: external_exports.string().optional(),
  professional_title: external_exports.string().optional(),
  company_name: external_exports.string().optional(),
  company_website: external_exports.string().optional(),
  work_experience: external_exports.array(external_exports.unknown()).optional(),
  education: external_exports.array(external_exports.unknown()).optional()
});
async function callLeadMagic(endpoint, body, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS2);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      if (res.status === 429) {
        const err = new Error(`LeadMagic rate-limited: HTTP 429`);
        err.status = 429;
        throw err;
      }
      if (res.status === 404 || res.status === 422) {
        const err = new Error(`LeadMagic returned HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      throw new Error(`LeadMagic HTTP error: ${res.status} ${res.statusText}`);
    }
    const raw = await res.json();
    return { raw, res };
  } finally {
    clearTimeout(timeout);
  }
}
__name(callLeadMagic, "callLeadMagic");
async function emailFinderDirect(firstName, lastName, companyName, companyDomain, apiKey) {
  const body = {
    first_name: firstName,
    last_name: lastName
  };
  if (companyDomain) {
    body.domain = companyDomain;
  } else if (companyName) {
    body.company_name = companyName;
  }
  const { raw } = await callLeadMagic(EMAIL_FINDER_ENDPOINT, body, apiKey);
  const parsed = EmailFinderResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[leadmagicAdapter] email-finder Zod validation failed:",
      parsed.error.message,
      "rawResponse:",
      raw
    );
    return {
      email: null,
      source: "leadmagic",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.leadmagic
    };
  }
  return {
    email: parsed.data.email ?? null,
    source: "leadmagic",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.leadmagic
  };
}
__name(emailFinderDirect, "emailFinderDirect");
async function profileSearchThenEmailFinder(linkedinUrl, apiKey) {
  const { raw: profileRaw } = await callLeadMagic(
    PROFILE_SEARCH_ENDPOINT,
    { profile_url: linkedinUrl },
    apiKey
  );
  const profileParsed = ProfileSearchResponseSchema.safeParse(profileRaw);
  if (!profileParsed.success) {
    console.warn(
      "[leadmagicAdapter] profile-search Zod validation failed:",
      profileParsed.error.message,
      "rawResponse:",
      profileRaw
    );
    return {
      email: null,
      source: "leadmagic",
      rawResponse: profileRaw,
      costUsd: PROVIDER_COSTS.leadmagic
      // 1 credit consumed for profile-search
    };
  }
  const profile = profileParsed.data;
  const firstName = profile.first_name;
  const lastName = profile.last_name;
  const companyName = profile.company_name;
  const companyDomain = profile.company_website;
  if (!firstName || !lastName || !companyName && !companyDomain) {
    console.warn(
      "[leadmagicAdapter] profile-search returned insufficient data for email-finder:",
      { firstName, lastName, companyName, companyDomain }
    );
    return {
      email: null,
      firstName: firstName ?? void 0,
      lastName: lastName ?? void 0,
      source: "leadmagic",
      rawResponse: profileRaw,
      costUsd: PROVIDER_COSTS.leadmagic
      // 1 credit consumed for profile-search
    };
  }
  const emailResult = await emailFinderDirect(
    firstName,
    lastName,
    companyName,
    companyDomain,
    apiKey
  );
  return {
    ...emailResult,
    firstName,
    lastName,
    rawResponse: { profileSearch: profileRaw, emailFinder: emailResult.rawResponse },
    costUsd: PROVIDER_COSTS.leadmagic * 2
    // 2 credits total
  };
}
__name(profileSearchThenEmailFinder, "profileSearchThenEmailFinder");
var leadmagicAdapter = /* @__PURE__ */ __name(async (input) => {
  const hasName = Boolean(input.firstName && input.lastName);
  const hasCompany = Boolean(input.companyName || input.companyDomain);
  if (hasName && hasCompany) {
    const apiKey = getApiKey2();
    return emailFinderDirect(
      input.firstName,
      input.lastName,
      input.companyName,
      input.companyDomain,
      apiKey
    );
  }
  if (input.linkedinUrl) {
    const apiKey = getApiKey2();
    return profileSearchThenEmailFinder(input.linkedinUrl, apiKey);
  }
  return {
    email: null,
    source: "leadmagic",
    rawResponse: { skipped: "insufficient input: need name+company or linkedin url" },
    costUsd: 0
  };
}, "leadmagicAdapter");

// src/lib/enrichment/providers/findymail.ts
init_esm();
var FINDYMAIL_ENDPOINT = "https://app.findymail.com/api/search/linkedin";
var TIMEOUT_MS3 = 1e4;
function getApiKey3() {
  const key = process.env.FINDYMAIL_API_KEY;
  if (!key) throw new Error("FINDYMAIL_API_KEY environment variable is not set");
  return key;
}
__name(getApiKey3, "getApiKey");
var FindyMailResponseSchema = external_exports.object({
  email: external_exports.string().nullable().optional()
}).passthrough();
var findymailAdapter = /* @__PURE__ */ __name(async (input) => {
  if (!input.linkedinUrl) {
    return {
      email: null,
      source: "findymail",
      rawResponse: { skipped: "no linkedin url" },
      costUsd: 0
    };
  }
  const apiKey = getApiKey3();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS3);
  let raw;
  try {
    const res = await fetch(FINDYMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      // Field name "linkedin_url" is best guess — may differ from actual API
      body: JSON.stringify({ linkedin_url: input.linkedinUrl }),
      signal: controller.signal
    });
    if (!res.ok) {
      if (res.status === 429) {
        const err = new Error(`FindyMail rate-limited: HTTP 429`);
        err.status = 429;
        throw err;
      }
      if (res.status === 404 || res.status === 422) {
        const err = new Error(`FindyMail returned HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      throw new Error(`FindyMail HTTP error: ${res.status} ${res.statusText}`);
    }
    raw = await res.json();
  } finally {
    clearTimeout(timeout);
  }
  console.log("[findymailAdapter] rawResponse:", JSON.stringify(raw));
  const parsed = FindyMailResponseSchema.safeParse(raw);
  const email = parsed.success ? parsed.data.email ?? null : raw?.email ?? raw?.data?.email ?? raw?.verified_email ?? null;
  if (!parsed.success) {
    console.warn("[findymailAdapter] Zod validation failed:", parsed.error.message, "rawResponse:", raw);
  }
  return {
    email,
    source: "findymail",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.findymail
  };
}, "findymailAdapter");

// src/lib/enrichment/providers/aiark.ts
init_esm();
var AIARK_ENDPOINT = "https://api.ai-ark.com/api/developer-portal/v1/companies";
var AUTH_HEADER_NAME = "X-TOKEN";
var REQUEST_TIMEOUT_MS = 1e4;
function getApiKey4() {
  const key = process.env.AIARK_API_KEY;
  if (!key) {
    throw new Error("AIARK_API_KEY environment variable is not set");
  }
  return key;
}
__name(getApiKey4, "getApiKey");
var AiArkCompanySchema = external_exports.object({
  name: external_exports.string().optional(),
  description: external_exports.string().optional(),
  industry: external_exports.string().optional(),
  staff: external_exports.object({ total: external_exports.number().optional() }).optional(),
  links: external_exports.object({ website: external_exports.string().optional() }).optional(),
  headquarter: external_exports.string().optional(),
  founded_year: external_exports.number().optional()
}).passthrough();
function extractCompanies(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw;
    if (obj.data !== void 0) {
      return Array.isArray(obj.data) ? obj.data : [obj.data];
    }
  }
  return [raw];
}
__name(extractCompanies, "extractCompanies");
function mapToResult(company, raw) {
  return {
    name: company.name,
    industry: company.industry,
    headcount: company.staff?.total,
    description: company.description,
    website: company.links?.website,
    location: company.headquarter,
    yearFounded: company.founded_year,
    source: "aiark",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.aiark
  };
}
__name(mapToResult, "mapToResult");
var aiarkAdapter = /* @__PURE__ */ __name(async (domain) => {
  const apiKey = getApiKey4();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let raw;
  try {
    const response = await fetch(AIARK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER_NAME]: apiKey
      },
      body: JSON.stringify({
        account: { domain: { include: [domain] } }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.status === 401 || response.status === 403) {
      console.warn(
        `AI Ark auth failed (${response.status}) — verify AUTH_HEADER_NAME in aiark.ts matches API docs. Currently using "${AUTH_HEADER_NAME}". Check https://ai-ark.com/docs for the correct header name.`
      );
      throw new Error(`AI Ark auth error: HTTP ${response.status}`);
    }
    if (response.status === 429) {
      throw Object.assign(new Error("AI Ark rate limit exceeded"), { status: 429 });
    }
    if (response.status === 404 || response.status === 422) {
      throw Object.assign(new Error(`AI Ark error: HTTP ${response.status}`), {
        status: response.status
      });
    }
    if (!response.ok) {
      throw Object.assign(new Error(`AI Ark unexpected error: HTTP ${response.status}`), {
        status: response.status
      });
    }
    raw = await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
  const companies = extractCompanies(raw);
  const firstCompany = companies[0];
  if (!firstCompany) {
    return {
      source: "aiark",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.aiark
    };
  }
  const parsed = AiArkCompanySchema.safeParse(firstCompany);
  if (!parsed.success) {
    console.warn("AI Ark response failed validation:", parsed.error.message);
    return {
      source: "aiark",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.aiark
    };
  }
  return mapToResult(parsed.data, raw);
}, "aiarkAdapter");

// src/lib/enrichment/providers/aiark-person.ts
init_esm();
var AIARK_PEOPLE_ENDPOINT = "https://api.ai-ark.com/api/developer-portal/v1/people";
var AUTH_HEADER_NAME2 = "X-TOKEN";
var REQUEST_TIMEOUT_MS2 = 1e4;
function getApiKey5() {
  const key = process.env.AIARK_API_KEY;
  if (!key) {
    throw new Error("AIARK_API_KEY environment variable is not set");
  }
  return key;
}
__name(getApiKey5, "getApiKey");
var AiArkPersonSchema = external_exports.object({
  first_name: external_exports.string().optional(),
  last_name: external_exports.string().optional(),
  title: external_exports.string().optional(),
  linkedin_url: external_exports.string().optional(),
  email: external_exports.string().optional(),
  location: external_exports.string().optional(),
  company: external_exports.object({
    name: external_exports.string().optional(),
    domain: external_exports.string().optional()
  }).optional()
}).passthrough();
function extractPeople(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw;
    if (obj.data !== void 0) {
      return Array.isArray(obj.data) ? obj.data : [obj.data];
    }
  }
  return [raw];
}
__name(extractPeople, "extractPeople");
function mapToResult2(person, raw) {
  return {
    firstName: person.first_name,
    lastName: person.last_name,
    jobTitle: person.title,
    linkedinUrl: person.linkedin_url,
    email: person.email,
    location: person.location,
    company: person.company?.name,
    companyDomain: person.company?.domain,
    source: "aiark",
    rawResponse: raw,
    costUsd: PROVIDER_COSTS.aiark
  };
}
__name(mapToResult2, "mapToResult");
function buildRequestBody(input) {
  if (input.linkedinUrl) {
    return { linkedin_url: input.linkedinUrl };
  }
  if (input.firstName && input.lastName && (input.companyName || input.companyDomain)) {
    return {
      first_name: input.firstName,
      last_name: input.lastName,
      company: input.companyName ?? input.companyDomain
    };
  }
  return null;
}
__name(buildRequestBody, "buildRequestBody");
var aiarkPersonAdapter = /* @__PURE__ */ __name(async (input) => {
  const requestBody = buildRequestBody(input);
  if (!requestBody) {
    return {
      source: "aiark",
      rawResponse: null,
      costUsd: 0
      // No API call made, no cost
    };
  }
  const apiKey = getApiKey5();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS2);
  let raw;
  try {
    const response = await fetch(AIARK_PEOPLE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER_NAME2]: apiKey
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.status === 401 || response.status === 403) {
      console.warn(
        `AI Ark people auth failed (${response.status}) — verify AUTH_HEADER_NAME in aiark-person.ts matches API docs. Currently using "${AUTH_HEADER_NAME2}". Check https://ai-ark.com/docs for the correct header name.`
      );
      throw new Error(`AI Ark people auth error: HTTP ${response.status}`);
    }
    if (response.status === 429) {
      throw Object.assign(new Error("AI Ark rate limit exceeded"), { status: 429 });
    }
    if (response.status === 404 || response.status === 422) {
      throw Object.assign(new Error(`AI Ark people error: HTTP ${response.status}`), {
        status: response.status
      });
    }
    if (!response.ok) {
      throw Object.assign(new Error(`AI Ark people unexpected error: HTTP ${response.status}`), {
        status: response.status
      });
    }
    raw = await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
  const people = extractPeople(raw);
  const firstPerson = people[0];
  if (!firstPerson) {
    return {
      source: "aiark",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.aiark
    };
  }
  const parsed = AiArkPersonSchema.safeParse(firstPerson);
  if (!parsed.success) {
    console.warn("AI Ark people response failed validation:", parsed.error.message);
    return {
      source: "aiark",
      rawResponse: raw,
      costUsd: PROVIDER_COSTS.aiark
    };
  }
  return mapToResult2(parsed.data, raw);
}, "aiarkPersonAdapter");

// src/lib/enrichment/providers/firecrawl-company.ts
init_esm();

// node_modules/@mendable/firecrawl-js/dist/index.js
init_esm();

// node_modules/axios/index.js
init_esm();

// node_modules/axios/lib/axios.js
init_esm();

// node_modules/axios/lib/utils.js
init_esm();

// node_modules/axios/lib/helpers/bind.js
init_esm();
function bind(fn, thisArg) {
  return /* @__PURE__ */ __name(function wrap() {
    return fn.apply(thisArg, arguments);
  }, "wrap");
}
__name(bind, "bind");

// node_modules/axios/lib/utils.js
var { toString } = Object.prototype;
var { getPrototypeOf } = Object;
var { iterator, toStringTag } = Symbol;
var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
var kindOfTest = /* @__PURE__ */ __name((type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
}, "kindOfTest");
var typeOfTest = /* @__PURE__ */ __name((type) => (thing) => typeof thing === type, "typeOfTest");
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
__name(isBuffer, "isBuffer");
var isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
__name(isArrayBufferView, "isArrayBufferView");
var isString = typeOfTest("string");
var isFunction = typeOfTest("function");
var isNumber = typeOfTest("number");
var isObject = /* @__PURE__ */ __name((thing) => thing !== null && typeof thing === "object", "isObject");
var isBoolean = /* @__PURE__ */ __name((thing) => thing === true || thing === false, "isBoolean");
var isPlainObject = /* @__PURE__ */ __name((val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
}, "isPlainObject");
var isEmptyObject = /* @__PURE__ */ __name((val) => {
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e2) {
    return false;
  }
}, "isEmptyObject");
var isDate = kindOfTest("Date");
var isFile = kindOfTest("File");
var isBlob = kindOfTest("Blob");
var isFileList = kindOfTest("FileList");
var isStream = /* @__PURE__ */ __name((val) => isObject(val) && isFunction(val.pipe), "isStream");
var isFormData = /* @__PURE__ */ __name((thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
  kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
}, "isFormData");
var isURLSearchParams = kindOfTest("URLSearchParams");
var [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
var trim = /* @__PURE__ */ __name((str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""), "trim");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
__name(forEach, "forEach");
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
__name(findKey, "findKey");
var _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
var isContextDefined = /* @__PURE__ */ __name((context) => !isUndefined(context) && context !== _global, "isContextDefined");
function merge() {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = /* @__PURE__ */ __name((val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  }, "assignValue");
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
__name(merge, "merge");
var extend = /* @__PURE__ */ __name((a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(
    b,
    (val, key) => {
      if (thisArg && isFunction(val)) {
        Object.defineProperty(a, key, {
          value: bind(val, thisArg),
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(a, key, {
          value: val,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    },
    { allOwnKeys }
  );
  return a;
}, "extend");
var stripBOM = /* @__PURE__ */ __name((content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
}, "stripBOM");
var inherits = /* @__PURE__ */ __name((constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(
    superConstructor.prototype,
    descriptors
  );
  Object.defineProperty(constructor.prototype, "constructor", {
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
}, "inherits");
var toFlatObject = /* @__PURE__ */ __name((sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
}, "toFlatObject");
var endsWith = /* @__PURE__ */ __name((str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}, "endsWith");
var toArray = /* @__PURE__ */ __name((thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
}, "toArray");
var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
var forEachEntry = /* @__PURE__ */ __name((obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
}, "forEachEntry");
var matchAll = /* @__PURE__ */ __name((regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
}, "matchAll");
var isHTMLForm = kindOfTest("HTMLFormElement");
var toCamelCase = /* @__PURE__ */ __name((str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, /* @__PURE__ */ __name(function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  }, "replacer"));
}, "toCamelCase");
var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
var isRegExp = kindOfTest("RegExp");
var reduceDescriptors = /* @__PURE__ */ __name((obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
}, "reduceDescriptors");
var freezeMethods = /* @__PURE__ */ __name((obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
}, "freezeMethods");
var toObjectSet = /* @__PURE__ */ __name((arrayOrString, delimiter) => {
  const obj = {};
  const define = /* @__PURE__ */ __name((arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  }, "define");
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
}, "toObjectSet");
var noop = /* @__PURE__ */ __name(() => {
}, "noop");
var toFiniteNumber = /* @__PURE__ */ __name((value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
}, "toFiniteNumber");
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
__name(isSpecCompliantForm, "isSpecCompliantForm");
var toJSONObject = /* @__PURE__ */ __name((obj) => {
  const stack = new Array(10);
  const visit = /* @__PURE__ */ __name((source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (isBuffer(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = void 0;
        return target;
      }
    }
    return source;
  }, "visit");
  return visit(obj, 0);
}, "toJSONObject");
var isAsyncFn = kindOfTest("AsyncFunction");
var isThenable = /* @__PURE__ */ __name((thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch), "isThenable");
var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener(
      "message",
      ({ source, data }) => {
        if (source === _global && data === token) {
          callbacks.length && callbacks.shift()();
        }
      },
      false
    );
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction(_global.postMessage));
var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
var isIterable = /* @__PURE__ */ __name((thing) => thing != null && isFunction(thing[iterator]), "isIterable");
var utils_default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};

// node_modules/axios/lib/core/Axios.js
init_esm();

// node_modules/axios/lib/helpers/buildURL.js
init_esm();

// node_modules/axios/lib/helpers/AxiosURLSearchParams.js
init_esm();

// node_modules/axios/lib/helpers/toFormData.js
init_esm();

// node_modules/axios/lib/core/AxiosError.js
init_esm();
var AxiosError = class _AxiosError extends Error {
  static {
    __name(this, "AxiosError");
  }
  static from(error, code, config, request, response, customProps) {
    const axiosError = new _AxiosError(error.message, code || error.code, config, request, response);
    axiosError.cause = error;
    axiosError.name = error.name;
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(message, code, config, request, response) {
    super(message);
    this.name = "AxiosError";
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils_default.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
};
AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError.ECONNABORTED = "ECONNABORTED";
AxiosError.ETIMEDOUT = "ETIMEDOUT";
AxiosError.ERR_NETWORK = "ERR_NETWORK";
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError.ERR_CANCELED = "ERR_CANCELED";
AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
var AxiosError_default = AxiosError;

// node_modules/axios/lib/platform/node/classes/FormData.js
init_esm();
var import_form_data = __toESM(require_form_data(), 1);
var FormData_default = import_form_data.default;

// node_modules/axios/lib/helpers/toFormData.js
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
__name(isVisitable, "isVisitable");
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
__name(removeBrackets, "removeBrackets");
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(/* @__PURE__ */ __name(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }, "each")).join(dots ? "." : "");
}
__name(renderKey, "renderKey");
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
__name(isFlatArray, "isFlatArray");
var predicates = utils_default.toFlatObject(utils_default, {}, null, /* @__PURE__ */ __name(function filter(prop) {
  return /^is[A-Z]/.test(prop);
}, "filter"));
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData_default || FormData)();
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, /* @__PURE__ */ __name(function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  }, "defined"));
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (utils_default.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  __name(convertValue, "convertValue");
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(/* @__PURE__ */ __name(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        }, "each"));
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  __name(defaultVisitor, "defaultVisitor");
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils_default.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, /* @__PURE__ */ __name(function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(
        formData,
        el,
        utils_default.isString(key) ? key.trim() : key,
        path,
        exposedHelpers
      );
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    }, "each"));
    stack.pop();
  }
  __name(build, "build");
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
__name(toFormData, "toFormData");
var toFormData_default = toFormData;

// node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, /* @__PURE__ */ __name(function replacer(match) {
    return charMap[match];
  }, "replacer"));
}
__name(encode, "encode");
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
__name(AxiosURLSearchParams, "AxiosURLSearchParams");
var prototype = AxiosURLSearchParams.prototype;
prototype.append = /* @__PURE__ */ __name(function append(name, value) {
  this._pairs.push([name, value]);
}, "append");
prototype.toString = /* @__PURE__ */ __name(function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode);
  } : encode;
  return this._pairs.map(/* @__PURE__ */ __name(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "each"), "").join("&");
}, "toString");
var AxiosURLSearchParams_default = AxiosURLSearchParams;

// node_modules/axios/lib/helpers/buildURL.js
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
__name(encode2, "encode");
function buildURL(url2, params, options) {
  if (!params) {
    return url2;
  }
  const _encode = options && options.encode || encode2;
  const _options = utils_default.isFunction(options) ? {
    serialize: options
  } : options;
  const serializeFn = _options && _options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
}
__name(buildURL, "buildURL");

// node_modules/axios/lib/core/InterceptorManager.js
init_esm();
var InterceptorManager = class {
  static {
    __name(this, "InterceptorManager");
  }
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils_default.forEach(this.handlers, /* @__PURE__ */ __name(function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    }, "forEachHandler"));
  }
};
var InterceptorManager_default = InterceptorManager;

// node_modules/axios/lib/core/dispatchRequest.js
init_esm();

// node_modules/axios/lib/core/transformData.js
init_esm();

// node_modules/axios/lib/defaults/index.js
init_esm();

// node_modules/axios/lib/defaults/transitional.js
init_esm();
var transitional_default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true
};

// node_modules/axios/lib/helpers/toURLEncodedForm.js
init_esm();

// node_modules/axios/lib/platform/index.js
init_esm();

// node_modules/axios/lib/platform/node/index.js
init_esm();
import crypto from "crypto";

// node_modules/axios/lib/platform/node/classes/URLSearchParams.js
init_esm();
import url from "url";
var URLSearchParams_default = url.URLSearchParams;

// node_modules/axios/lib/platform/node/index.js
var ALPHA = "abcdefghijklmnopqrstuvwxyz";
var DIGIT = "0123456789";
var ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
var generateString = /* @__PURE__ */ __name((size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  const randomValues = new Uint32Array(size);
  crypto.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }
  return str;
}, "generateString");
var node_default = {
  isNode: true,
  classes: {
    URLSearchParams: URLSearchParams_default,
    FormData: FormData_default,
    Blob: typeof Blob !== "undefined" && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"]
};

// node_modules/axios/lib/platform/common/utils.js
var utils_exports = {};
__export(utils_exports, {
  hasBrowserEnv: () => hasBrowserEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  navigator: () => _navigator,
  origin: () => origin
});
init_esm();
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = typeof navigator === "object" && navigator || void 0;
var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
var origin = hasBrowserEnv && window.location.href || "http://localhost";

// node_modules/axios/lib/platform/index.js
var platform_default = {
  ...utils_exports,
  ...node_default
};

// node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams(), {
    visitor: /* @__PURE__ */ __name(function(value, key, path, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }, "visitor"),
    ...options
  });
}
__name(toURLEncodedForm, "toURLEncodedForm");

// node_modules/axios/lib/helpers/formDataToJSON.js
init_esm();
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
__name(parsePropPath, "parsePropPath");
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
__name(arrayToObject, "arrayToObject");
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  __name(buildPath, "buildPath");
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
__name(formDataToJSON, "formDataToJSON");
var formDataToJSON_default = formDataToJSON;

// node_modules/axios/lib/defaults/index.js
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e2) {
      if (e2.name !== "SyntaxError") {
        throw e2;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
__name(stringifySafely, "stringifySafely");
var defaults = {
  transitional: transitional_default,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [/* @__PURE__ */ __name(function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils_default.isObject(data);
    if (isObjectPayload && utils_default.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils_default.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
    }
    if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (utils_default.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils_default.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData_default(
          isFileList2 ? { "files[]": data } : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }, "transformRequest")],
  transformResponse: [/* @__PURE__ */ __name(function transformResponse(data) {
    const transitional2 = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data, this.parseReviver);
      } catch (e2) {
        if (strictJSONParsing) {
          if (e2.name === "SyntaxError") {
            throw AxiosError_default.from(e2, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e2;
        }
      }
    }
    return data;
  }, "transformResponse")],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform_default.classes.FormData,
    Blob: platform_default.classes.Blob
  },
  validateStatus: /* @__PURE__ */ __name(function validateStatus(status) {
    return status >= 200 && status < 300;
  }, "validateStatus"),
  headers: {
    common: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
var defaults_default = defaults;

// node_modules/axios/lib/core/AxiosHeaders.js
init_esm();

// node_modules/axios/lib/helpers/parseHeaders.js
init_esm();
var ignoreDuplicateOf = utils_default.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
var parseHeaders_default = /* @__PURE__ */ __name((rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(/* @__PURE__ */ __name(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  }, "parser"));
  return parsed;
}, "default");

// node_modules/axios/lib/core/AxiosHeaders.js
var $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
__name(normalizeHeader, "normalizeHeader");
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
__name(normalizeValue, "normalizeValue");
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
__name(parseTokens, "parseTokens");
var isValidHeaderName = /* @__PURE__ */ __name((str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim()), "isValidHeaderName");
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value)) return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
__name(matchHeaderValue, "matchHeaderValue");
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
__name(formatHeader, "formatHeader");
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: /* @__PURE__ */ __name(function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      }, "value"),
      configurable: true
    });
  });
}
__name(buildAccessors, "buildAccessors");
var AxiosHeaders = class {
  static {
    __name(this, "AxiosHeaders");
  }
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils_default.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    __name(setHeader, "setHeader");
    const setHeaders = /* @__PURE__ */ __name((headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite)), "setHeaders");
    if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders_default(header), valueOrRewrite);
    } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils_default.isArray(entry)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils_default.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils_default.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils_default.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    __name(deleteHeader, "deleteHeader");
    if (utils_default.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils_default.forEach(this, (value, header) => {
      const key = utils_default.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils_default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    __name(defineAccessor, "defineAccessor");
    utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: /* @__PURE__ */ __name(() => value, "get"),
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils_default.freezeMethods(AxiosHeaders);
var AxiosHeaders_default = AxiosHeaders;

// node_modules/axios/lib/core/transformData.js
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, /* @__PURE__ */ __name(function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  }, "transform"));
  headers.normalize();
  return data;
}
__name(transformData, "transformData");

// node_modules/axios/lib/cancel/isCancel.js
init_esm();
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
__name(isCancel, "isCancel");

// node_modules/axios/lib/cancel/CanceledError.js
init_esm();
var CanceledError = class extends AxiosError_default {
  static {
    __name(this, "CanceledError");
  }
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
};
var CanceledError_default = CanceledError;

// node_modules/axios/lib/adapters/adapters.js
init_esm();

// node_modules/axios/lib/adapters/http.js
init_esm();

// node_modules/axios/lib/core/settle.js
init_esm();
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError_default(
      "Request failed with status code " + response.status,
      [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}
__name(settle, "settle");

// node_modules/axios/lib/core/buildFullPath.js
init_esm();

// node_modules/axios/lib/helpers/isAbsoluteURL.js
init_esm();
function isAbsoluteURL(url2) {
  if (typeof url2 !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}
__name(isAbsoluteURL, "isAbsoluteURL");

// node_modules/axios/lib/helpers/combineURLs.js
init_esm();
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
__name(combineURLs, "combineURLs");

// node_modules/axios/lib/core/buildFullPath.js
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
__name(buildFullPath, "buildFullPath");

// node_modules/axios/lib/adapters/http.js
var import_proxy_from_env = __toESM(require_proxy_from_env(), 1);
var import_follow_redirects = __toESM(require_follow_redirects(), 1);
import http from "http";
import https from "https";
import http2 from "http2";
import util2 from "util";
import zlib from "zlib";

// node_modules/axios/lib/env/data.js
init_esm();
var VERSION = "1.13.5";

// node_modules/axios/lib/helpers/fromDataURI.js
init_esm();

// node_modules/axios/lib/helpers/parseProtocol.js
init_esm();
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
  return match && match[1] || "";
}
__name(parseProtocol, "parseProtocol");

// node_modules/axios/lib/helpers/fromDataURI.js
var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform_default.classes.Blob;
  const protocol = parseProtocol(uri);
  if (asBlob === void 0 && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    const match = DATA_URL_PATTERN.exec(uri);
    if (!match) {
      throw new AxiosError_default("Invalid URL", AxiosError_default.ERR_INVALID_URL);
    }
    const mime = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError_default("Blob is not supported", AxiosError_default.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime });
    }
    return buffer;
  }
  throw new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_NOT_SUPPORT);
}
__name(fromDataURI, "fromDataURI");

// node_modules/axios/lib/adapters/http.js
import stream3 from "stream";

// node_modules/axios/lib/helpers/AxiosTransformStream.js
init_esm();
import stream from "stream";
var kInternals = Symbol("internals");
var AxiosTransformStream = class extends stream.Transform {
  static {
    __name(this, "AxiosTransformStream");
  }
  constructor(options) {
    options = utils_default.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils_default.isUndefined(source[prop]);
    });
    super({
      readableHighWaterMark: options.chunkSize
    });
    const internals = this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }
  _read(size) {
    const internals = this[kInternals];
    if (internals.onReadCallback) {
      internals.onReadCallback();
    }
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;
    const readableHighWaterMark = this.readableHighWaterMark;
    const timeWindow = internals.timeWindow;
    const divider = 1e3 / timeWindow;
    const bytesThreshold = maxRate / divider;
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    const pushChunk = /* @__PURE__ */ __name((_chunk, _callback) => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      internals.isCaptured && this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    }, "pushChunk");
    const transformChunk = /* @__PURE__ */ __name((_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        const now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0) {
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }
        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : _callback);
    }, "transformChunk");
    transformChunk(chunk, /* @__PURE__ */ __name(function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }
      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    }, "transformNextChunk"));
  }
};
var AxiosTransformStream_default = AxiosTransformStream;

// node_modules/axios/lib/adapters/http.js
import { EventEmitter } from "events";

// node_modules/axios/lib/helpers/formDataToStream.js
init_esm();
import util from "util";
import { Readable } from "stream";

// node_modules/axios/lib/helpers/readBlob.js
init_esm();
var { asyncIterator } = Symbol;
var readBlob = /* @__PURE__ */ __name(async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
}, "readBlob");
var readBlob_default = readBlob;

// node_modules/axios/lib/helpers/formDataToStream.js
var BOUNDARY_ALPHABET = platform_default.ALPHABET.ALPHA_DIGIT + "-_";
var textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util.TextEncoder();
var CRLF = "\r\n";
var CRLF_BYTES = textEncoder.encode(CRLF);
var CRLF_BYTES_COUNT = 2;
var FormDataPart = class {
  static {
    __name(this, "FormDataPart");
  }
  constructor(name, value) {
    const { escapeName } = this.constructor;
    const isStringValue = utils_default.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async *encode() {
    yield this.headers;
    const { value } = this;
    if (utils_default.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob_default(value);
    }
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(/[\r\n"]/g, (match) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[match]);
  }
};
var formDataToStream = /* @__PURE__ */ __name((form, headersHandler, options) => {
  const {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform_default.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};
  if (!utils_default.isFormData(form)) {
    throw TypeError("FormData instance required");
  }
  if (boundary.length < 1 || boundary.length > 70) {
    throw Error("boundary must be 10-70 characters long");
  }
  const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
  let contentLength = footerBytes.byteLength;
  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils_default.toFiniteNumber(contentLength);
  const computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  };
  if (Number.isFinite(contentLength)) {
    computedHeaders["Content-Length"] = contentLength;
  }
  headersHandler && headersHandler(computedHeaders);
  return Readable.from(async function* () {
    for (const part of parts) {
      yield boundaryBytes;
      yield* part.encode();
    }
    yield footerBytes;
  }());
}, "formDataToStream");
var formDataToStream_default = formDataToStream;

// node_modules/axios/lib/helpers/ZlibHeaderTransformStream.js
init_esm();
import stream2 from "stream";
var ZlibHeaderTransformStream = class extends stream2.Transform {
  static {
    __name(this, "ZlibHeaderTransformStream");
  }
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        const header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
};
var ZlibHeaderTransformStream_default = ZlibHeaderTransformStream;

// node_modules/axios/lib/helpers/callbackify.js
init_esm();
var callbackify = /* @__PURE__ */ __name((fn, reducer) => {
  return utils_default.isAsyncFn(fn) ? function(...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
}, "callbackify");
var callbackify_default = callbackify;

// node_modules/axios/lib/helpers/progressEventReducer.js
init_esm();

// node_modules/axios/lib/helpers/speedometer.js
init_esm();
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return /* @__PURE__ */ __name(function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  }, "push");
}
__name(speedometer, "speedometer");
var speedometer_default = speedometer;

// node_modules/axios/lib/helpers/throttle.js
init_esm();
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = /* @__PURE__ */ __name((args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  }, "invoke");
  const throttled = /* @__PURE__ */ __name((...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  }, "throttled");
  const flush = /* @__PURE__ */ __name(() => lastArgs && invoke(lastArgs), "flush");
  return [throttled, flush];
}
__name(throttle, "throttle");
var throttle_default = throttle;

// node_modules/axios/lib/helpers/progressEventReducer.js
var progressEventReducer = /* @__PURE__ */ __name((listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer_default(50, 250);
  return throttle_default((e2) => {
    const loaded = e2.loaded;
    const total = e2.lengthComputable ? e2.total : void 0;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
      event: e2,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
}, "progressEventReducer");
var progressEventDecorator = /* @__PURE__ */ __name((total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
}, "progressEventDecorator");
var asyncDecorator = /* @__PURE__ */ __name((fn) => (...args) => utils_default.asap(() => fn(...args)), "asyncDecorator");

// node_modules/axios/lib/helpers/estimateDataURLDecodedBytes.js
init_esm();
function estimateDataURLDecodedBytes(url2) {
  if (!url2 || typeof url2 !== "string") return 0;
  if (!url2.startsWith("data:")) return 0;
  const comma = url2.indexOf(",");
  if (comma < 0) return 0;
  const meta = url2.slice(5, comma);
  const body = url2.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    let effectiveLen = body.length;
    const len = body.length;
    for (let i = 0; i < len; i++) {
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        const a = body.charCodeAt(i + 1);
        const b = body.charCodeAt(i + 2);
        const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
        if (isHex) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    }
    let pad = 0;
    let idx = len - 1;
    const tailIsPct3D = /* @__PURE__ */ __name((j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
    body.charCodeAt(j - 1) === 51 && // '3'
    (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100), "tailIsPct3D");
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
      } else if (tailIsPct3D(idx)) {
        pad++;
      }
    }
    const groups = Math.floor(effectiveLen / 4);
    const bytes = groups * 3 - (pad || 0);
    return bytes > 0 ? bytes : 0;
  }
  return Buffer.byteLength(body, "utf8");
}
__name(estimateDataURLDecodedBytes, "estimateDataURLDecodedBytes");

// node_modules/axios/lib/adapters/http.js
var zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH
};
var brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
};
var isBrotliSupported = utils_default.isFunction(zlib.createBrotliDecompress);
var { http: httpFollow, https: httpsFollow } = import_follow_redirects.default;
var isHttps = /https:?/;
var supportedProtocols = platform_default.protocols.map((protocol) => {
  return protocol + ":";
});
var flushOnFinish = /* @__PURE__ */ __name((stream4, [throttled, flush]) => {
  stream4.on("end", flush).on("error", flush);
  return throttled;
}, "flushOnFinish");
var Http2Sessions = class {
  static {
    __name(this, "Http2Sessions");
  }
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(authority, options) {
    options = Object.assign({
      sessionTimeout: 1e3
    }, options);
    let authoritySessions = this.sessions[authority];
    if (authoritySessions) {
      let len = authoritySessions.length;
      for (let i = 0; i < len; i++) {
        const [sessionHandle, sessionOptions] = authoritySessions[i];
        if (!sessionHandle.destroyed && !sessionHandle.closed && util2.isDeepStrictEqual(sessionOptions, options)) {
          return sessionHandle;
        }
      }
    }
    const session = http2.connect(authority, options);
    let removed;
    const removeSession = /* @__PURE__ */ __name(() => {
      if (removed) {
        return;
      }
      removed = true;
      let entries = authoritySessions, len = entries.length, i = len;
      while (i--) {
        if (entries[i][0] === session) {
          if (len === 1) {
            delete this.sessions[authority];
          } else {
            entries.splice(i, 1);
          }
          return;
        }
      }
    }, "removeSession");
    const originalRequestFn = session.request;
    const { sessionTimeout } = options;
    if (sessionTimeout != null) {
      let timer;
      let streamsCount = 0;
      session.request = function() {
        const stream4 = originalRequestFn.apply(this, arguments);
        streamsCount++;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        stream4.once("close", () => {
          if (!--streamsCount) {
            timer = setTimeout(() => {
              timer = null;
              removeSession();
            }, sessionTimeout);
          }
        });
        return stream4;
      };
    }
    session.once("close", removeSession);
    let entry = [
      session,
      options
    ];
    authoritySessions ? authoritySessions.push(entry) : authoritySessions = this.sessions[authority] = [entry];
    return session;
  }
};
var http2Sessions = new Http2Sessions();
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}
__name(dispatchBeforeRedirect, "dispatchBeforeRedirect");
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = import_proxy_from_env.default.getProxyForUrl(location);
    if (proxyUrl) {
      proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    if (proxy.username) {
      proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    }
    if (proxy.auth) {
      const validProxyAuth = Boolean(proxy.auth.username || proxy.auth.password);
      if (validProxyAuth) {
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      } else if (typeof proxy.auth === "object") {
        throw new AxiosError_default("Invalid proxy authorization", AxiosError_default.ERR_BAD_OPTION, { proxy });
      }
      const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
    }
  }
  options.beforeRedirects.proxy = /* @__PURE__ */ __name(function beforeRedirect(redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  }, "beforeRedirect");
}
__name(setProxy, "setProxy");
var isHttpAdapterSupported = typeof process !== "undefined" && utils_default.kindOf(process) === "process";
var wrapAsync = /* @__PURE__ */ __name((asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;
    const done = /* @__PURE__ */ __name((value, isRejected) => {
      if (isDone) return;
      isDone = true;
      onDone && onDone(value, isRejected);
    }, "done");
    const _resolve = /* @__PURE__ */ __name((value) => {
      done(value);
      resolve(value);
    }, "_resolve");
    const _reject = /* @__PURE__ */ __name((reason) => {
      done(reason, true);
      reject(reason);
    }, "_reject");
    asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
  });
}, "wrapAsync");
var resolveFamily = /* @__PURE__ */ __name(({ address, family }) => {
  if (!utils_default.isString(address)) {
    throw TypeError("address must be a string");
  }
  return {
    address,
    family: family || (address.indexOf(".") < 0 ? 6 : 4)
  };
}, "resolveFamily");
var buildAddressEntry = /* @__PURE__ */ __name((address, family) => resolveFamily(utils_default.isObject(address) ? address : { address, family }), "buildAddressEntry");
var http2Transport = {
  request(options, cb) {
    const authority = options.protocol + "//" + options.hostname + ":" + (options.port || (options.protocol === "https:" ? 443 : 80));
    const { http2Options, headers } = options;
    const session = http2Sessions.getSession(authority, http2Options);
    const {
      HTTP2_HEADER_SCHEME,
      HTTP2_HEADER_METHOD,
      HTTP2_HEADER_PATH,
      HTTP2_HEADER_STATUS
    } = http2.constants;
    const http2Headers = {
      [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
      [HTTP2_HEADER_METHOD]: options.method,
      [HTTP2_HEADER_PATH]: options.path
    };
    utils_default.forEach(headers, (header, name) => {
      name.charAt(0) !== ":" && (http2Headers[name] = header);
    });
    const req = session.request(http2Headers);
    req.once("response", (responseHeaders) => {
      const response = req;
      responseHeaders = Object.assign({}, responseHeaders);
      const status = responseHeaders[HTTP2_HEADER_STATUS];
      delete responseHeaders[HTTP2_HEADER_STATUS];
      response.headers = responseHeaders;
      response.statusCode = +status;
      cb(response);
    });
    return req;
  }
};
var http_default = isHttpAdapterSupported && /* @__PURE__ */ __name(function httpAdapter(config) {
  return wrapAsync(/* @__PURE__ */ __name(async function dispatchHttpRequest(resolve, reject, onDone) {
    let { data, lookup, family, httpVersion = 1, http2Options } = config;
    const { responseType, responseEncoding } = config;
    const method = config.method.toUpperCase();
    let isDone;
    let rejected = false;
    let req;
    httpVersion = +httpVersion;
    if (Number.isNaN(httpVersion)) {
      throw TypeError(`Invalid protocol version: '${config.httpVersion}' is not a number`);
    }
    if (httpVersion !== 1 && httpVersion !== 2) {
      throw TypeError(`Unsupported protocol version '${httpVersion}'`);
    }
    const isHttp2 = httpVersion === 2;
    if (lookup) {
      const _lookup = callbackify_default(lookup, (value) => utils_default.isArray(value) ? value : [value]);
      lookup = /* @__PURE__ */ __name((hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) {
            return cb(err);
          }
          const addresses = utils_default.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
        });
      }, "lookup");
    }
    const abortEmitter = new EventEmitter();
    function abort(reason) {
      try {
        abortEmitter.emit("abort", !reason || reason.type ? new CanceledError_default(null, config, req) : reason);
      } catch (err) {
        console.warn("emit error", err);
      }
    }
    __name(abort, "abort");
    abortEmitter.once("abort", reject);
    const onFinished = /* @__PURE__ */ __name(() => {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort);
      }
      if (config.signal) {
        config.signal.removeEventListener("abort", abort);
      }
      abortEmitter.removeAllListeners();
    }, "onFinished");
    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort);
      if (config.signal) {
        config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
      }
    }
    onDone((response, isRejected) => {
      isDone = true;
      if (isRejected) {
        rejected = true;
        onFinished();
        return;
      }
      const { data: data2 } = response;
      if (data2 instanceof stream3.Readable || data2 instanceof stream3.Duplex) {
        const offListeners = stream3.finished(data2, () => {
          offListeners();
          onFinished();
        });
      } else {
        onFinished();
      }
    });
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    const parsed = new URL(fullPath, platform_default.hasBrowserEnv ? platform_default.origin : void 0);
    const protocol = parsed.protocol || supportedProtocols[0];
    if (protocol === "data:") {
      if (config.maxContentLength > -1) {
        const dataUrl = String(config.url || fullPath || "");
        const estimated = estimateDataURLDecodedBytes(dataUrl);
        if (estimated > config.maxContentLength) {
          return reject(new AxiosError_default(
            "maxContentLength size of " + config.maxContentLength + " exceeded",
            AxiosError_default.ERR_BAD_RESPONSE,
            config
          ));
        }
      }
      let convertedData;
      if (method !== "GET") {
        return settle(resolve, reject, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config
        });
      }
      try {
        convertedData = fromDataURI(config.url, responseType === "blob", {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError_default.from(err, AxiosError_default.ERR_BAD_REQUEST, config);
      }
      if (responseType === "text") {
        convertedData = convertedData.toString(responseEncoding);
        if (!responseEncoding || responseEncoding === "utf8") {
          convertedData = utils_default.stripBOM(convertedData);
        }
      } else if (responseType === "stream") {
        convertedData = stream3.Readable.from(convertedData);
      }
      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders_default(),
        config
      });
    }
    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(new AxiosError_default(
        "Unsupported protocol " + protocol,
        AxiosError_default.ERR_BAD_REQUEST,
        config
      ));
    }
    const headers = AxiosHeaders_default.from(config.headers).normalize();
    headers.set("User-Agent", "axios/" + VERSION, false);
    const { onUploadProgress, onDownloadProgress } = config;
    const maxRate = config.maxRate;
    let maxUploadRate = void 0;
    let maxDownloadRate = void 0;
    if (utils_default.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
      data = formDataToStream_default(data, (formHeaders) => {
        headers.set(formHeaders);
      }, {
        tag: `axios-${VERSION}-boundary`,
        boundary: userBoundary && userBoundary[1] || void 0
      });
    } else if (utils_default.isFormData(data) && utils_default.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders());
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util2.promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
        } catch (e2) {
        }
      }
    } else if (utils_default.isBlob(data) || utils_default.isFile(data)) {
      data.size && headers.setContentType(data.type || "application/octet-stream");
      headers.setContentLength(data.size || 0);
      data = stream3.Readable.from(readBlob_default(data));
    } else if (data && !utils_default.isStream(data)) {
      if (Buffer.isBuffer(data)) {
      } else if (utils_default.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils_default.isString(data)) {
        data = Buffer.from(data, "utf-8");
      } else {
        return reject(new AxiosError_default(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          AxiosError_default.ERR_BAD_REQUEST,
          config
        ));
      }
      headers.setContentLength(data.length, false);
      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        return reject(new AxiosError_default(
          "Request body larger than maxBodyLength limit",
          AxiosError_default.ERR_BAD_REQUEST,
          config
        ));
      }
    }
    const contentLength = utils_default.toFiniteNumber(headers.getContentLength());
    if (utils_default.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }
    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils_default.isStream(data)) {
        data = stream3.Readable.from(data, { objectMode: false });
      }
      data = stream3.pipeline([data, new AxiosTransformStream_default({
        maxRate: utils_default.toFiniteNumber(maxUploadRate)
      })], utils_default.noop);
      onUploadProgress && data.on("progress", flushOnFinish(
        data,
        progressEventDecorator(
          contentLength,
          progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
        )
      ));
    }
    let auth = void 0;
    if (config.auth) {
      const username = config.auth.username || "";
      const password = config.auth.password || "";
      auth = username + ":" + password;
    }
    if (!auth && parsed.username) {
      const urlUsername = parsed.username;
      const urlPassword = parsed.password;
      auth = urlUsername + ":" + urlPassword;
    }
    auth && headers.delete("authorization");
    let path;
    try {
      path = buildURL(
        parsed.pathname + parsed.search,
        config.params,
        config.paramsSerializer
      ).replace(/^\?/, "");
    } catch (err) {
      const customErr = new Error(err.message);
      customErr.config = config;
      customErr.url = config.url;
      customErr.exists = true;
      return reject(customErr);
    }
    headers.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
      false
    );
    const options = {
      path,
      method,
      headers: headers.toJSON(),
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {},
      http2Options
    };
    !utils_default.isUndefined(lookup) && (options.lookup = lookup);
    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
      options.port = parsed.port;
      setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
    }
    let transport;
    const isHttpsRequest = isHttps.test(options.protocol);
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
    if (isHttp2) {
      transport = http2Transport;
    } else {
      if (config.transport) {
        transport = config.transport;
      } else if (config.maxRedirects === 0) {
        transport = isHttpsRequest ? https : http;
      } else {
        if (config.maxRedirects) {
          options.maxRedirects = config.maxRedirects;
        }
        if (config.beforeRedirect) {
          options.beforeRedirects.config = config.beforeRedirect;
        }
        transport = isHttpsRequest ? httpsFollow : httpFollow;
      }
    }
    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    } else {
      options.maxBodyLength = Infinity;
    }
    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }
    req = transport.request(options, /* @__PURE__ */ __name(function handleResponse(res) {
      if (req.destroyed) return;
      const streams = [res];
      const responseLength = utils_default.toFiniteNumber(res.headers["content-length"]);
      if (onDownloadProgress || maxDownloadRate) {
        const transformStream = new AxiosTransformStream_default({
          maxRate: utils_default.toFiniteNumber(maxDownloadRate)
        });
        onDownloadProgress && transformStream.on("progress", flushOnFinish(
          transformStream,
          progressEventDecorator(
            responseLength,
            progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
          )
        ));
        streams.push(transformStream);
      }
      let responseStream = res;
      const lastRequest = res.req || req;
      if (config.decompress !== false && res.headers["content-encoding"]) {
        if (method === "HEAD" || res.statusCode === 204) {
          delete res.headers["content-encoding"];
        }
        switch ((res.headers["content-encoding"] || "").toLowerCase()) {
          /*eslint default-case:0*/
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "deflate":
            streams.push(new ZlibHeaderTransformStream_default());
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "br":
            if (isBrotliSupported) {
              streams.push(zlib.createBrotliDecompress(brotliOptions));
              delete res.headers["content-encoding"];
            }
        }
      }
      responseStream = streams.length > 1 ? stream3.pipeline(streams, utils_default.noop) : streams[0];
      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders_default(res.headers),
        config,
        request: lastRequest
      };
      if (responseType === "stream") {
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;
        responseStream.on("data", /* @__PURE__ */ __name(function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            rejected = true;
            responseStream.destroy();
            abort(new AxiosError_default(
              "maxContentLength size of " + config.maxContentLength + " exceeded",
              AxiosError_default.ERR_BAD_RESPONSE,
              config,
              lastRequest
            ));
          }
        }, "handleStreamData"));
        responseStream.on("aborted", /* @__PURE__ */ __name(function handlerStreamAborted() {
          if (rejected) {
            return;
          }
          const err = new AxiosError_default(
            "stream has been aborted",
            AxiosError_default.ERR_BAD_RESPONSE,
            config,
            lastRequest
          );
          responseStream.destroy(err);
          reject(err);
        }, "handlerStreamAborted"));
        responseStream.on("error", /* @__PURE__ */ __name(function handleStreamError(err) {
          if (req.destroyed) return;
          reject(AxiosError_default.from(err, null, config, lastRequest));
        }, "handleStreamError"));
        responseStream.on("end", /* @__PURE__ */ __name(function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== "arraybuffer") {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === "utf8") {
                responseData = utils_default.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError_default.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        }, "handleStreamEnd"));
      }
      abortEmitter.once("abort", (err) => {
        if (!responseStream.destroyed) {
          responseStream.emit("error", err);
          responseStream.destroy();
        }
      });
    }, "handleResponse"));
    abortEmitter.once("abort", (err) => {
      if (req.close) {
        req.close();
      } else {
        req.destroy(err);
      }
    });
    req.on("error", /* @__PURE__ */ __name(function handleRequestError(err) {
      reject(AxiosError_default.from(err, null, config, req));
    }, "handleRequestError"));
    req.on("socket", /* @__PURE__ */ __name(function handleRequestSocket(socket) {
      socket.setKeepAlive(true, 1e3 * 60);
    }, "handleRequestSocket"));
    if (config.timeout) {
      const timeout = parseInt(config.timeout, 10);
      if (Number.isNaN(timeout)) {
        abort(new AxiosError_default(
          "error trying to parse `config.timeout` to int",
          AxiosError_default.ERR_BAD_OPTION_VALUE,
          config,
          req
        ));
        return;
      }
      req.setTimeout(timeout, /* @__PURE__ */ __name(function handleRequestTimeout() {
        if (isDone) return;
        let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
        const transitional2 = config.transitional || transitional_default;
        if (config.timeoutErrorMessage) {
          timeoutErrorMessage = config.timeoutErrorMessage;
        }
        abort(new AxiosError_default(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
          config,
          req
        ));
      }, "handleRequestTimeout"));
    } else {
      req.setTimeout(0);
    }
    if (utils_default.isStream(data)) {
      let ended = false;
      let errored = false;
      data.on("end", () => {
        ended = true;
      });
      data.once("error", (err) => {
        errored = true;
        req.destroy(err);
      });
      data.on("close", () => {
        if (!ended && !errored) {
          abort(new CanceledError_default("Request stream has been aborted", config, req));
        }
      });
      data.pipe(req);
    } else {
      data && req.write(data);
      req.end();
    }
  }, "dispatchHttpRequest"));
}, "httpAdapter");

// node_modules/axios/lib/adapters/xhr.js
init_esm();

// node_modules/axios/lib/helpers/resolveConfig.js
init_esm();

// node_modules/axios/lib/helpers/isURLSameOrigin.js
init_esm();
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
  url2 = new URL(url2, platform_default.origin);
  return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
})(
  new URL(platform_default.origin),
  platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)
) : () => true;

// node_modules/axios/lib/helpers/cookies.js
init_esm();
var cookies_default = platform_default.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure, sameSite) {
      if (typeof document === "undefined") return;
      const cookie = [`${name}=${encodeURIComponent(value)}`];
      if (utils_default.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils_default.isString(path)) {
        cookie.push(`path=${path}`);
      }
      if (utils_default.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push("secure");
      }
      if (utils_default.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }
      document.cookie = cookie.join("; ");
    },
    read(name) {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);

// node_modules/axios/lib/core/mergeConfig.js
init_esm();
var headersToObject = /* @__PURE__ */ __name((thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing, "headersToObject");
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  __name(getMergedValue, "getMergedValue");
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  __name(mergeDeepProperties, "mergeDeepProperties");
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  __name(valueFromConfig2, "valueFromConfig2");
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  __name(defaultToConfig2, "defaultToConfig2");
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(void 0, a);
    }
  }
  __name(mergeDirectKeys, "mergeDirectKeys");
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: /* @__PURE__ */ __name((a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true), "headers")
  };
  utils_default.forEach(
    Object.keys({ ...config1, ...config2 }),
    /* @__PURE__ */ __name(function computeConfigValue(prop) {
      if (prop === "__proto__" || prop === "constructor" || prop === "prototype")
        return;
      const merge2 = utils_default.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
      const configValue = merge2(config1[prop], config2[prop], prop);
      utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
    }, "computeConfigValue")
  );
  return config;
}
__name(mergeConfig, "mergeConfig");

// node_modules/axios/lib/helpers/resolveConfig.js
var resolveConfig_default = /* @__PURE__ */ __name((config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) {
    headers.set(
      "Authorization",
      "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
    );
  }
  if (utils_default.isFormData(data)) {
    if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(void 0);
    } else if (utils_default.isFunction(data.getHeaders)) {
      const formHeaders = data.getHeaders();
      const allowedHeaders = ["content-type", "content-length"];
      Object.entries(formHeaders).forEach(([key, val]) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
          headers.set(key, val);
        }
      });
    }
  }
  if (platform_default.hasStandardBrowserEnv) {
    withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
}, "default");

// node_modules/axios/lib/adapters/xhr.js
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhr_default = isXHRAdapterSupported && function(config) {
  return new Promise(/* @__PURE__ */ __name(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig_default(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    __name(done, "done");
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders_default.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(/* @__PURE__ */ __name(function _resolve(value) {
        resolve(value);
        done();
      }, "_resolve"), /* @__PURE__ */ __name(function _reject(err) {
        reject(err);
        done();
      }, "_reject"), response);
      request = null;
    }
    __name(onloadend, "onloadend");
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = /* @__PURE__ */ __name(function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      }, "handleLoad");
    }
    request.onabort = /* @__PURE__ */ __name(function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
      request = null;
    }, "handleAbort");
    request.onerror = /* @__PURE__ */ __name(function handleError(event) {
      const msg = event && event.message ? event.message : "Network Error";
      const err = new AxiosError_default(msg, AxiosError_default.ERR_NETWORK, config, request);
      err.event = event || null;
      reject(err);
      request = null;
    }, "handleError");
    request.ontimeout = /* @__PURE__ */ __name(function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitional_default;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError_default(
        timeoutErrorMessage,
        transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
        config,
        request
      ));
      request = null;
    }, "handleTimeout");
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils_default.forEach(requestHeaders.toJSON(), /* @__PURE__ */ __name(function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      }, "setRequestHeader"));
    }
    if (!utils_default.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = /* @__PURE__ */ __name((cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
        request.abort();
        request = null;
      }, "onCanceled");
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  }, "dispatchXhrRequest"));
};

// node_modules/axios/lib/adapters/fetch.js
init_esm();

// node_modules/axios/lib/helpers/composeSignals.js
init_esm();
var composeSignals = /* @__PURE__ */ __name((signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    const onabort = /* @__PURE__ */ __name(function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
      }
    }, "onabort");
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError_default(`timeout of ${timeout}ms exceeded`, AxiosError_default.ETIMEDOUT));
    }, timeout);
    const unsubscribe = /* @__PURE__ */ __name(() => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    }, "unsubscribe");
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils_default.asap(unsubscribe);
    return signal;
  }
}, "composeSignals");
var composeSignals_default = composeSignals;

// node_modules/axios/lib/helpers/trackStream.js
init_esm();
var streamChunk = /* @__PURE__ */ __name(function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
}, "streamChunk");
var readBytes = /* @__PURE__ */ __name(async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
}, "readBytes");
var readStream = /* @__PURE__ */ __name(async function* (stream4) {
  if (stream4[Symbol.asyncIterator]) {
    yield* stream4;
    return;
  }
  const reader = stream4.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
}, "readStream");
var trackStream = /* @__PURE__ */ __name((stream4, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream4, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = /* @__PURE__ */ __name((e2) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e2);
    }
  }, "_onFinish");
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator2.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator2.return();
    }
  }, {
    highWaterMark: 2
  });
}, "trackStream");

// node_modules/axios/lib/adapters/fetch.js
var DEFAULT_CHUNK_SIZE = 64 * 1024;
var { isFunction: isFunction2 } = utils_default;
var globalFetchAPI = (({ Request, Response }) => ({
  Request,
  Response
}))(utils_default.global);
var {
  ReadableStream: ReadableStream2,
  TextEncoder: TextEncoder2
} = utils_default.global;
var test = /* @__PURE__ */ __name((fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e2) {
    return false;
  }
}, "test");
var factory = /* @__PURE__ */ __name((env) => {
  env = utils_default.merge.call({
    skipUndefined: true
  }, globalFetchAPI, env);
  const { fetch: envFetch, Request, Response } = env;
  const isFetchSupported = envFetch ? isFunction2(envFetch) : typeof fetch === "function";
  const isRequestSupported = isFunction2(Request);
  const isResponseSupported = isFunction2(Response);
  if (!isFetchSupported) {
    return false;
  }
  const isReadableStreamSupported = isFetchSupported && isFunction2(ReadableStream2);
  const encodeText = isFetchSupported && (typeof TextEncoder2 === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder2()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;
    const hasContentType = new Request(platform_default.origin, {
      body: new ReadableStream2(),
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      }
    }).headers.has("Content-Type");
    return duplexAccessed && !hasContentType;
  });
  const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };
  isFetchSupported && (() => {
    ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];
        if (method) {
          return method.call(res);
        }
        throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
      });
    });
  })();
  const getBodyLength = /* @__PURE__ */ __name(async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils_default.isBlob(body)) {
      return body.size;
    }
    if (utils_default.isSpecCompliantForm(body)) {
      const _request = new Request(platform_default.origin, {
        method: "POST",
        body
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils_default.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils_default.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  }, "getBodyLength");
  const resolveBodyLength = /* @__PURE__ */ __name(async (headers, body) => {
    const length = utils_default.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  }, "resolveBodyLength");
  return async (config) => {
    let {
      url: url2,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = "same-origin",
      fetchOptions
    } = resolveConfig_default(config);
    let _fetch = envFetch || fetch;
    responseType = responseType ? (responseType + "").toLowerCase() : "text";
    let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
    let request = null;
    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });
    let requestContentLength;
    try {
      if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
        let _request = new Request(url2, {
          method: "POST",
          body: data,
          duplex: "half"
        });
        let contentTypeHeader;
        if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
          headers.setContentType(contentTypeHeader);
        }
        if (_request.body) {
          const [onProgress, flush] = progressEventDecorator(
            requestContentLength,
            progressEventReducer(asyncDecorator(onUploadProgress))
          );
          data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
        }
      }
      if (!utils_default.isString(withCredentials)) {
        withCredentials = withCredentials ? "include" : "omit";
      }
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
      const resolvedOptions = {
        ...fetchOptions,
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: headers.normalize().toJSON(),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : void 0
      };
      request = isRequestSupported && new Request(url2, resolvedOptions);
      let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url2, resolvedOptions));
      const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
      if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
        const options = {};
        ["status", "statusText", "headers"].forEach((prop) => {
          options[prop] = response[prop];
        });
        const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
          responseContentLength,
          progressEventReducer(asyncDecorator(onDownloadProgress), true)
        ) || [];
        response = new Response(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }
      responseType = responseType || "text";
      let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
      !isStreamResponse && unsubscribe && unsubscribe();
      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders_default.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();
      if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
        throw Object.assign(
          new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request, err && err.response),
          {
            cause: err.cause || err
          }
        );
      }
      throw AxiosError_default.from(err, err && err.code, config, request, err && err.response);
    }
  };
}, "factory");
var seedCache = /* @__PURE__ */ new Map();
var getFetch = /* @__PURE__ */ __name((config) => {
  let env = config && config.env || {};
  const { fetch: fetch2, Request, Response } = env;
  const seeds = [
    Request,
    Response,
    fetch2
  ];
  let len = seeds.length, i = len, seed, target, map2 = seedCache;
  while (i--) {
    seed = seeds[i];
    target = map2.get(seed);
    target === void 0 && map2.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
    map2 = target;
  }
  return target;
}, "getFetch");
var adapter = getFetch();

// node_modules/axios/lib/adapters/adapters.js
var knownAdapters = {
  http: http_default,
  xhr: xhr_default,
  fetch: {
    get: getFetch
  }
};
utils_default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e2) {
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});
var renderReason = /* @__PURE__ */ __name((reason) => `- ${reason}`, "renderReason");
var isResolvedHandle = /* @__PURE__ */ __name((adapter2) => utils_default.isFunction(adapter2) || adapter2 === null || adapter2 === false, "isResolvedHandle");
function getAdapter(adapters, config) {
  adapters = utils_default.isArray(adapters) ? adapters : [adapters];
  const { length } = adapters;
  let nameOrAdapter;
  let adapter2;
  const rejectedReasons = {};
  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters[i];
    let id;
    adapter2 = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter2 = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter2 === void 0) {
        throw new AxiosError_default(`Unknown adapter '${id}'`);
      }
    }
    if (adapter2 && (utils_default.isFunction(adapter2) || (adapter2 = adapter2.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter2;
  }
  if (!adapter2) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
    );
    let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError_default(
      `There is no suitable adapter to dispatch the request ` + s,
      "ERR_NOT_SUPPORT"
    );
  }
  return adapter2;
}
__name(getAdapter, "getAdapter");
var adapters_default = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters
};

// node_modules/axios/lib/core/dispatchRequest.js
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
__name(throwIfCancellationRequested, "throwIfCancellationRequested");
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(
    config,
    config.transformRequest
  );
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter2 = adapters_default.getAdapter(config.adapter || defaults_default.adapter, config);
  return adapter2(config).then(/* @__PURE__ */ __name(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, "onAdapterResolution"), /* @__PURE__ */ __name(function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  }, "onAdapterRejection"));
}
__name(dispatchRequest, "dispatchRequest");

// node_modules/axios/lib/helpers/validator.js
init_esm();
var validators = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators[type] = /* @__PURE__ */ __name(function validator(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  }, "validator");
});
var deprecatedWarnings = {};
validators.transitional = /* @__PURE__ */ __name(function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  __name(formatMessage, "formatMessage");
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError_default(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError_default.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator ? validator(value, opt, opts) : true;
  };
}, "transitional");
validators.spelling = /* @__PURE__ */ __name(function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
}, "spelling");
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === void 0 || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
__name(assertOptions, "assertOptions");
var validator_default = {
  assertOptions,
  validators
};

// node_modules/axios/lib/core/Axios.js
var validators2 = validator_default.validators;
var Axios = class {
  static {
    __name(this, "Axios");
  }
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager_default(),
      response: new InterceptorManager_default()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += "\n" + stack;
          }
        } catch (e2) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator_default.assertOptions(transitional2, {
        silentJSONParsing: validators2.transitional(validators2.boolean),
        forcedJSONParsing: validators2.transitional(validators2.boolean),
        clarifyTimeoutError: validators2.transitional(validators2.boolean),
        legacyInterceptorReqResOrdering: validators2.transitional(validators2.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils_default.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator_default.assertOptions(paramsSerializer, {
          encode: validators2.function,
          serialize: validators2.function
        }, true);
      }
    }
    if (config.allowAbsoluteUrls !== void 0) {
    } else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator_default.assertOptions(config, {
      baseUrl: validators2.spelling("baseURL"),
      withXsrfToken: validators2.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils_default.merge(
      headers.common,
      headers[config.method]
    );
    headers && utils_default.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (method) => {
        delete headers[method];
      }
    );
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(/* @__PURE__ */ __name(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      const transitional3 = config.transitional || transitional_default;
      const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    }, "unshiftRequestInterceptors"));
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(/* @__PURE__ */ __name(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    }, "pushResponseInterceptors"));
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils_default.forEach(["delete", "get", "head", "options"], /* @__PURE__ */ __name(function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url2, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url: url2,
      data: (config || {}).data
    }));
  };
}, "forEachMethodNoData"));
utils_default.forEach(["post", "put", "patch"], /* @__PURE__ */ __name(function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return /* @__PURE__ */ __name(function httpMethod(url2, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: url2,
        data
      }));
    }, "httpMethod");
  }
  __name(generateHTTPMethod, "generateHTTPMethod");
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
}, "forEachMethodWithData"));
var Axios_default = Axios;

// node_modules/axios/lib/cancel/CancelToken.js
init_esm();
var CancelToken = class _CancelToken {
  static {
    __name(this, "CancelToken");
  }
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(/* @__PURE__ */ __name(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    }, "promiseExecutor"));
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = /* @__PURE__ */ __name(function reject() {
        token.unsubscribe(_resolve);
      }, "reject");
      return promise;
    };
    executor(/* @__PURE__ */ __name(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    }, "cancel"));
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = /* @__PURE__ */ __name((err) => {
      controller.abort(err);
    }, "abort");
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new _CancelToken(/* @__PURE__ */ __name(function executor(c) {
      cancel = c;
    }, "executor"));
    return {
      token,
      cancel
    };
  }
};
var CancelToken_default = CancelToken;

// node_modules/axios/lib/helpers/spread.js
init_esm();
function spread(callback) {
  return /* @__PURE__ */ __name(function wrap(arr) {
    return callback.apply(null, arr);
  }, "wrap");
}
__name(spread, "spread");

// node_modules/axios/lib/helpers/isAxiosError.js
init_esm();
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}
__name(isAxiosError, "isAxiosError");

// node_modules/axios/lib/helpers/HttpStatusCode.js
init_esm();
var HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var HttpStatusCode_default = HttpStatusCode;

// node_modules/axios/lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = /* @__PURE__ */ __name(function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  }, "create");
  return instance;
}
__name(createInstance, "createInstance");
var axios = createInstance(defaults_default);
axios.Axios = Axios_default;
axios.CanceledError = CanceledError_default;
axios.CancelToken = CancelToken_default;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData_default;
axios.AxiosError = AxiosError_default;
axios.Cancel = axios.CanceledError;
axios.all = /* @__PURE__ */ __name(function all(promises) {
  return Promise.all(promises);
}, "all");
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders_default;
axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode_default;
axios.default = axios;
var axios_default = axios;

// node_modules/axios/index.js
var {
  Axios: Axios2,
  AxiosError: AxiosError2,
  CanceledError: CanceledError2,
  isCancel: isCancel2,
  CancelToken: CancelToken2,
  VERSION: VERSION2,
  all: all2,
  Cancel,
  isAxiosError: isAxiosError2,
  spread: spread2,
  toFormData: toFormData2,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode: HttpStatusCode2,
  formToJSON,
  getAdapter: getAdapter2,
  mergeConfig: mergeConfig2
} = axios_default;

// node_modules/zod-to-json-schema/dist/esm/index.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/Options.js
init_esm();
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref",
  openAiAnyTypeName: "OpenAiAnyType"
};
var getDefaultOptions = /* @__PURE__ */ __name((options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
}, "getDefaultOptions");

// node_modules/zod-to-json-schema/dist/esm/Refs.js
init_esm();
var getRefs = /* @__PURE__ */ __name((options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    flags: { hasReferencedOpenAiAnyType: false },
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
}, "getRefs");

// node_modules/zod-to-json-schema/dist/esm/errorMessages.js
init_esm();
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
__name(addErrorMessage, "addErrorMessage");
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}
__name(setResponseValueAndErrors, "setResponseValueAndErrors");

// node_modules/zod-to-json-schema/dist/esm/getRelativePath.js
init_esm();
var getRelativePath = /* @__PURE__ */ __name((pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
}, "getRelativePath");

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/selectParser.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/any.js
init_esm();
function parseAnyDef(refs) {
  if (refs.target !== "openAi") {
    return {};
  }
  const anyDefinitionPath = [
    ...refs.basePath,
    refs.definitionPath,
    refs.openAiAnyTypeName
  ];
  refs.flags.hasReferencedOpenAiAnyType = true;
  return {
    $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
  };
}
__name(parseAnyDef, "parseAnyDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/array.js
init_esm();
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}
__name(parseArrayDef, "parseArrayDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
init_esm();
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
__name(parseBigintDef, "parseBigintDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
init_esm();
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}
__name(parseBooleanDef, "parseBooleanDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
init_esm();
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}
__name(parseBrandedDef, "parseBrandedDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
init_esm();
var parseCatchDef = /* @__PURE__ */ __name((def, refs) => {
  return parseDef(def.innerType._def, refs);
}, "parseCatchDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/date.js
init_esm();
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
__name(parseDateDef, "parseDateDef");
var integerDateParser = /* @__PURE__ */ __name((def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
}, "integerDateParser");

// node_modules/zod-to-json-schema/dist/esm/parsers/default.js
init_esm();
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}
__name(parseDefaultDef, "parseDefaultDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
init_esm();
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}
__name(parseEffectsDef, "parseEffectsDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
init_esm();
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
__name(parseEnumDef, "parseEnumDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
init_esm();
var isJsonSchema7AllOfType = /* @__PURE__ */ __name((type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
}, "isJsonSchema7AllOfType");
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}
__name(parseIntersectionDef, "parseIntersectionDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
init_esm();
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}
__name(parseLiteralDef, "parseLiteralDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/string.js
init_esm();
var emojiRegex = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: /* @__PURE__ */ __name(() => {
    if (emojiRegex === void 0) {
      emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex;
  }, "emoji"),
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
__name(parseStringDef, "parseStringDef");
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
__name(escapeLiteralCheckValue, "escapeLiteralCheckValue");
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
__name(escapeNonAlphaNumeric, "escapeNonAlphaNumeric");
function addFormat(schema, value, message, refs) {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
__name(addFormat, "addFormat");
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
__name(addPattern, "addPattern");
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
}
__name(stringifyRegExpWithFlags, "stringifyRegExpWithFlags");

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
function parseRecordDef(def, refs) {
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? parseAnyDef(refs)
      }), {}),
      additionalProperties: refs.rejectedAdditionalProperties
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? refs.allowedAdditionalProperties
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}
__name(parseRecordDef, "parseRecordDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef(refs);
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef(refs);
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}
__name(parseMapDef, "parseMapDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
init_esm();
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
__name(parseNativeEnumDef, "parseNativeEnumDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/never.js
init_esm();
function parseNeverDef(refs) {
  return refs.target === "openAi" ? void 0 : {
    not: parseAnyDef({
      ...refs,
      currentPath: [...refs.currentPath, "not"]
    })
  };
}
__name(parseNeverDef, "parseNeverDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/null.js
init_esm();
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}
__name(parseNullDef, "parseNullDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/union.js
init_esm();
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [
        ...acc,
        ...x._def.values.filter((x2) => !acc.includes(x2))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
__name(parseUnionDef, "parseUnionDef");
var asAnyOf = /* @__PURE__ */ __name((def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
}, "asAnyOf");

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
__name(parseNullableDef, "parseNullableDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/number.js
init_esm();
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
__name(parseNumberDef, "parseNumberDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/object.js
init_esm();
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
  const result = {
    type: "object",
    properties: {}
  };
  const required = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    let propOptional = safeIsOptional(propDef);
    if (propOptional && forceOptionalIntoNullable) {
      if (propDef._def.typeName === "ZodOptional") {
        propDef = propDef._def.innerType;
      }
      if (!propDef.isNullable()) {
        propDef = propDef.nullable();
      }
      propOptional = false;
    }
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required.push(propName);
    }
  }
  if (required.length) {
    result.required = required;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
__name(parseObjectDef, "parseObjectDef");
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
__name(decideAdditionalProperties, "decideAdditionalProperties");
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch {
    return true;
  }
}
__name(safeIsOptional, "safeIsOptional");

// node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
init_esm();
var parseOptionalDef = /* @__PURE__ */ __name((def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: parseAnyDef(refs)
      },
      innerSchema
    ]
  } : parseAnyDef(refs);
}, "parseOptionalDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
init_esm();
var parsePipelineDef = /* @__PURE__ */ __name((def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
}, "parsePipelineDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
init_esm();
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}
__name(parsePromiseDef, "parsePromiseDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/set.js
init_esm();
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}
__name(parseSetDef, "parseSetDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
init_esm();
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}
__name(parseTupleDef, "parseTupleDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
init_esm();
function parseUndefinedDef(refs) {
  return {
    not: parseAnyDef(refs)
  };
}
__name(parseUndefinedDef, "parseUndefinedDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
init_esm();
function parseUnknownDef(refs) {
  return parseAnyDef(refs);
}
__name(parseUnknownDef, "parseUnknownDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
init_esm();
var parseReadonlyDef = /* @__PURE__ */ __name((def, refs) => {
  return parseDef(def.innerType._def, refs);
}, "parseReadonlyDef");

// node_modules/zod-to-json-schema/dist/esm/selectParser.js
var selectParser = /* @__PURE__ */ __name((def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef(refs);
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef(refs);
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef(refs);
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef(refs);
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)(typeName);
  }
}, "selectParser");

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
function parseDef(def, refs, forceResolution = false) {
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema, def, refs);
    newItem.jsonSchema = jsonSchema;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
__name(parseDef, "parseDef");
var get$ref = /* @__PURE__ */ __name((item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return parseAnyDef(refs);
      }
      return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
    }
  }
}, "get$ref");
var addMeta = /* @__PURE__ */ __name((def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
}, "addMeta");

// node_modules/zod-to-json-schema/dist/esm/parseTypes.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
init_esm();
var zodToJsonSchema = /* @__PURE__ */ __name((schema, options) => {
  const refs = getRefs(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
    ...acc,
    [name2]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name2]
    }, true) ?? parseAnyDef(refs)
  }), {}) : void 0;
  const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? parseAnyDef(refs);
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  if (refs.flags.hasReferencedOpenAiAnyType) {
    if (!definitions) {
      definitions = {};
    }
    if (!definitions[refs.openAiAnyTypeName]) {
      definitions[refs.openAiAnyTypeName] = {
        // Skipping "object" as no properties can be defined and additionalProperties must be "false"
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref: refs.$refStrategy === "relative" ? "1" : [
            ...refs.basePath,
            refs.definitionPath,
            refs.openAiAnyTypeName
          ].join("/")
        }
      };
    }
  }
  const combined = name === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
}, "zodToJsonSchema");

// node_modules/@mendable/firecrawl-js/dist/index.js
import { EventEmitter as EventEmitter2 } from "events";
function getVersion() {
  try {
    if (typeof process !== "undefined" && process.env && process.env.npm_package_version) {
      return process.env.npm_package_version;
    }
    const pkg = require_package();
    return pkg?.version || "3.x.x";
  } catch {
    return "3.x.x";
  }
}
__name(getVersion, "getVersion");
var HttpClient = class {
  static {
    __name(this, "HttpClient");
  }
  instance;
  apiKey;
  apiUrl;
  maxRetries;
  backoffFactor;
  constructor(options) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl.replace(/\/$/, "");
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffFactor = options.backoffFactor ?? 0.5;
    this.instance = axios_default.create({
      baseURL: this.apiUrl,
      timeout: options.timeoutMs ?? 3e5,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      transitional: { clarifyTimeoutError: true }
    });
  }
  getApiUrl() {
    return this.apiUrl;
  }
  getApiKey() {
    return this.apiKey;
  }
  async request(config) {
    const version = getVersion();
    config.headers = {
      ...config.headers || {}
    };
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const cfg = { ...config };
        if (cfg.method && ["post", "put", "patch"].includes(cfg.method.toLowerCase())) {
          const data = cfg.data ?? {};
          cfg.data = { ...data, origin: typeof data.origin === "string" && data.origin.includes("mcp") ? data.origin : `js-sdk@${version}` };
          if (typeof data.timeout === "number") {
            cfg.timeout = data.timeout + 5e3;
          }
        }
        const res = await this.instance.request(cfg);
        if (res.status === 502 && attempt < this.maxRetries - 1) {
          await this.sleep(this.backoffFactor * Math.pow(2, attempt));
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 502 && attempt < this.maxRetries - 1) {
          await this.sleep(this.backoffFactor * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastError ?? new Error("Unexpected HTTP client error");
  }
  sleep(seconds) {
    return new Promise((r) => setTimeout(r, seconds * 1e3));
  }
  post(endpoint, body, headers) {
    return this.request({ method: "post", url: endpoint, data: body, headers });
  }
  get(endpoint, headers) {
    return this.request({ method: "get", url: endpoint, headers });
  }
  delete(endpoint, headers) {
    return this.request({ method: "delete", url: endpoint, headers });
  }
  prepareHeaders(idempotencyKey) {
    const headers = {};
    if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey;
    return headers;
  }
};
var SdkError = class extends Error {
  static {
    __name(this, "SdkError");
  }
  status;
  code;
  details;
  jobId;
  constructor(message, status, code, details, jobId) {
    super(message);
    this.name = "FirecrawlSdkError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.jobId = jobId;
  }
};
var JobTimeoutError = class extends SdkError {
  static {
    __name(this, "JobTimeoutError");
  }
  timeoutSeconds;
  constructor(jobId, timeoutSeconds, jobType = "batch") {
    const jobTypeLabel = jobType === "batch" ? "batch scrape" : "crawl";
    super(
      `${jobTypeLabel.charAt(0).toUpperCase() + jobTypeLabel.slice(1)} job ${jobId} did not complete within ${timeoutSeconds} seconds`,
      void 0,
      "JOB_TIMEOUT",
      void 0,
      jobId
    );
    this.name = "JobTimeoutError";
    this.timeoutSeconds = timeoutSeconds;
  }
};
function isZodSchema(value) {
  if (!value || typeof value !== "object") return false;
  const schema = value;
  const hasV3Markers = "_def" in schema && (typeof schema.safeParse === "function" || typeof schema.parse === "function");
  const hasV4Markers = "_zod" in schema && typeof schema._zod === "object";
  return hasV3Markers || hasV4Markers;
}
__name(isZodSchema, "isZodSchema");
function isZodV4Schema(schema) {
  if (!schema || typeof schema !== "object") return false;
  return "_zod" in schema && typeof schema._zod === "object";
}
__name(isZodV4Schema, "isZodV4Schema");
function tryZodV4Conversion(schema) {
  if (!isZodV4Schema(schema)) return null;
  try {
    const zodModule = schema.constructor?.prototype?.constructor;
    if (zodModule && typeof zodModule.toJSONSchema === "function") {
      return zodModule.toJSONSchema(schema);
    }
  } catch {
  }
  return null;
}
__name(tryZodV4Conversion, "tryZodV4Conversion");
function zodSchemaToJsonSchema(schema) {
  if (!isZodSchema(schema)) {
    return schema;
  }
  const v4Result = tryZodV4Conversion(schema);
  if (v4Result) {
    return v4Result;
  }
  try {
    return zodToJsonSchema(schema);
  } catch {
    return schema;
  }
}
__name(zodSchemaToJsonSchema, "zodSchemaToJsonSchema");
function looksLikeZodShape(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const values = Object.values(obj);
  if (values.length === 0) return false;
  return values.some(
    (v) => v && typeof v === "object" && v._def && typeof v.safeParse === "function"
  );
}
__name(looksLikeZodShape, "looksLikeZodShape");
function ensureValidFormats(formats) {
  if (!formats) return;
  for (const fmt of formats) {
    if (typeof fmt === "string") {
      if (fmt === "json") {
        throw new Error("json format must be an object with { type: 'json', prompt, schema }");
      }
      continue;
    }
    if (fmt.type === "json") {
      const j = fmt;
      if (!j.prompt && !j.schema) {
        throw new Error("json format requires either 'prompt' or 'schema' (or both)");
      }
      const maybeSchema = j.schema;
      if (isZodSchema(maybeSchema)) {
        j.schema = zodSchemaToJsonSchema(maybeSchema);
      } else if (looksLikeZodShape(maybeSchema)) {
        throw new Error(
          "json format schema appears to be a Zod schema's .shape property. Pass the Zod schema directly (e.g., `schema: MySchema`) instead of `schema: MySchema.shape`. The SDK will automatically convert Zod schemas to JSON Schema format."
        );
      }
      continue;
    }
    if (fmt.type === "changeTracking") {
      const ct = fmt;
      const maybeSchema = ct.schema;
      if (isZodSchema(maybeSchema)) {
        ct.schema = zodSchemaToJsonSchema(maybeSchema);
      } else if (looksLikeZodShape(maybeSchema)) {
        throw new Error(
          "changeTracking format schema appears to be a Zod schema's .shape property. Pass the Zod schema directly (e.g., `schema: MySchema`) instead of `schema: MySchema.shape`. The SDK will automatically convert Zod schemas to JSON Schema format."
        );
      }
      continue;
    }
    if (fmt.type === "screenshot") {
      const s = fmt;
      if (s.quality != null && (typeof s.quality !== "number" || s.quality < 0)) {
        throw new Error("screenshot.quality must be a non-negative number");
      }
    }
  }
}
__name(ensureValidFormats, "ensureValidFormats");
function ensureValidScrapeOptions(options) {
  if (!options) return;
  if (options.timeout != null && options.timeout <= 0) {
    throw new Error("timeout must be positive");
  }
  if (options.waitFor != null && options.waitFor < 0) {
    throw new Error("waitFor must be non-negative");
  }
  ensureValidFormats(options.formats);
}
__name(ensureValidScrapeOptions, "ensureValidScrapeOptions");
function throwForBadResponse(resp, action) {
  const status = resp.status;
  const body = resp.data || {};
  const msg = body?.error || body?.message || `Request failed (${status}) while trying to ${action}`;
  throw new SdkError(msg, status, void 0, body?.details);
}
__name(throwForBadResponse, "throwForBadResponse");
function normalizeAxiosError(err, action) {
  const status = err.response?.status;
  const body = err.response?.data;
  const message = body?.error || err.message || `Request failed${status ? ` (${status})` : ""} while trying to ${action}`;
  const code = body?.code || err.code;
  throw new SdkError(message, status, code, body?.details ?? body);
}
__name(normalizeAxiosError, "normalizeAxiosError");
function isRetryableError(err) {
  if (err instanceof JobTimeoutError) {
    return false;
  }
  if (err instanceof SdkError || err && typeof err === "object" && "status" in err) {
    const status = err.status;
    if (status && status >= 400 && status < 500) {
      return false;
    }
    if (status && status >= 500) {
      return true;
    }
  }
  if (err?.isAxiosError && !err.response) {
    return true;
  }
  if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
    return true;
  }
  return true;
}
__name(isRetryableError, "isRetryableError");
async function scrape(http3, url2, options) {
  if (!url2 || !url2.trim()) {
    throw new Error("URL cannot be empty");
  }
  if (options) ensureValidScrapeOptions(options);
  const payload = { url: url2.trim() };
  if (options) Object.assign(payload, options);
  try {
    const res = await http3.post("/v2/scrape", payload);
    if (res.status !== 200 || !res.data?.success) {
      throwForBadResponse(res, "scrape");
    }
    return res.data.data || {};
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "scrape");
    throw err;
  }
}
__name(scrape, "scrape");
function prepareSearchPayload(req) {
  if (!req.query || !req.query.trim()) throw new Error("Query cannot be empty");
  if (req.limit != null && req.limit <= 0) throw new Error("limit must be positive");
  if (req.timeout != null && req.timeout <= 0) throw new Error("timeout must be positive");
  const payload = {
    query: req.query
  };
  if (req.sources) payload.sources = req.sources;
  if (req.categories) payload.categories = req.categories;
  if (req.limit != null) payload.limit = req.limit;
  if (req.tbs != null) payload.tbs = req.tbs;
  if (req.location != null) payload.location = req.location;
  if (req.ignoreInvalidURLs != null) payload.ignoreInvalidURLs = req.ignoreInvalidURLs;
  if (req.timeout != null) payload.timeout = req.timeout;
  if (req.integration && req.integration.trim()) payload.integration = req.integration.trim();
  if (req.scrapeOptions) {
    ensureValidScrapeOptions(req.scrapeOptions);
    payload.scrapeOptions = req.scrapeOptions;
  }
  return payload;
}
__name(prepareSearchPayload, "prepareSearchPayload");
function transformArray(arr) {
  const results = [];
  for (const item of arr) {
    if (item && typeof item === "object") {
      if ("markdown" in item || "html" in item || "rawHtml" in item || "links" in item || "screenshot" in item || "changeTracking" in item || "summary" in item || "json" in item) {
        results.push(item);
      } else {
        results.push(item);
      }
    } else {
      results.push({ url: item });
    }
  }
  return results;
}
__name(transformArray, "transformArray");
async function search(http3, request) {
  const payload = prepareSearchPayload(request);
  try {
    const res = await http3.post("/v2/search", payload);
    if (res.status !== 200 || !res.data?.success) {
      throwForBadResponse(res, "search");
    }
    const data = res.data.data || {};
    const out = {};
    if (data.web) out.web = transformArray(data.web);
    if (data.news) out.news = transformArray(data.news);
    if (data.images) out.images = transformArray(data.images);
    return out;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "search");
    throw err;
  }
}
__name(search, "search");
function prepareMapPayload(url2, options) {
  if (!url2 || !url2.trim()) throw new Error("URL cannot be empty");
  const payload = { url: url2.trim() };
  if (options) {
    if (options.sitemap != null) payload.sitemap = options.sitemap;
    if (options.search != null) payload.search = options.search;
    if (options.includeSubdomains != null) payload.includeSubdomains = options.includeSubdomains;
    if (options.ignoreQueryParameters != null) payload.ignoreQueryParameters = options.ignoreQueryParameters;
    if (options.limit != null) payload.limit = options.limit;
    if (options.timeout != null) payload.timeout = options.timeout;
    if (options.integration != null && options.integration.trim()) payload.integration = options.integration.trim();
    if (options.location != null) payload.location = options.location;
  }
  return payload;
}
__name(prepareMapPayload, "prepareMapPayload");
async function map(http3, url2, options) {
  const payload = prepareMapPayload(url2, options);
  try {
    const res = await http3.post("/v2/map", payload);
    if (res.status !== 200 || !res.data?.success) {
      throwForBadResponse(res, "map");
    }
    const linksIn = res.data.links || [];
    const links = [];
    for (const item of linksIn) {
      if (typeof item === "string") links.push({ url: item });
      else if (item && typeof item === "object") links.push({ url: item.url, title: item.title, description: item.description });
    }
    return { links };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "map");
    throw err;
  }
}
__name(map, "map");
async function fetchAllPages(http3, nextUrl, initial, pagination) {
  const docs = initial.slice();
  let current = nextUrl;
  let pageCount = 0;
  const maxPages = pagination?.maxPages ?? void 0;
  const maxResults = pagination?.maxResults ?? void 0;
  const maxWaitTime = pagination?.maxWaitTime ?? void 0;
  const started = Date.now();
  while (current) {
    if (maxPages != null && pageCount >= maxPages) break;
    if (maxWaitTime != null && (Date.now() - started) / 1e3 > maxWaitTime) break;
    let payload = null;
    try {
      const res = await http3.get(current);
      payload = res.data;
    } catch {
      break;
    }
    if (!payload?.success) break;
    for (const d of payload.data || []) {
      if (maxResults != null && docs.length >= maxResults) break;
      docs.push(d);
    }
    if (maxResults != null && docs.length >= maxResults) break;
    current = payload.next ?? null;
    pageCount += 1;
  }
  return docs;
}
__name(fetchAllPages, "fetchAllPages");
function prepareCrawlPayload(request) {
  if (!request.url || !request.url.trim()) throw new Error("URL cannot be empty");
  const data = { url: request.url.trim() };
  if (request.prompt) data.prompt = request.prompt;
  if (request.excludePaths) data.excludePaths = request.excludePaths;
  if (request.includePaths) data.includePaths = request.includePaths;
  if (request.maxDiscoveryDepth != null) data.maxDiscoveryDepth = request.maxDiscoveryDepth;
  if (request.sitemap != null) data.sitemap = request.sitemap;
  if (request.ignoreQueryParameters != null) data.ignoreQueryParameters = request.ignoreQueryParameters;
  if (request.deduplicateSimilarURLs != null) data.deduplicateSimilarURLs = request.deduplicateSimilarURLs;
  if (request.limit != null) data.limit = request.limit;
  if (request.crawlEntireDomain != null) data.crawlEntireDomain = request.crawlEntireDomain;
  if (request.allowExternalLinks != null) data.allowExternalLinks = request.allowExternalLinks;
  if (request.allowSubdomains != null) data.allowSubdomains = request.allowSubdomains;
  if (request.delay != null) data.delay = request.delay;
  if (request.maxConcurrency != null) data.maxConcurrency = request.maxConcurrency;
  if (request.regexOnFullURL != null) data.regexOnFullURL = request.regexOnFullURL;
  if (request.webhook != null) data.webhook = request.webhook;
  if (request.integration != null && request.integration.trim()) data.integration = request.integration.trim();
  if (request.scrapeOptions) {
    ensureValidScrapeOptions(request.scrapeOptions);
    data.scrapeOptions = request.scrapeOptions;
  }
  if (request.zeroDataRetention != null) data.zeroDataRetention = request.zeroDataRetention;
  return data;
}
__name(prepareCrawlPayload, "prepareCrawlPayload");
async function startCrawl(http3, request) {
  const payload = prepareCrawlPayload(request);
  try {
    const res = await http3.post("/v2/crawl", payload);
    if (res.status !== 200 || !res.data?.success) {
      throwForBadResponse(res, "start crawl");
    }
    return { id: res.data.id, url: res.data.url };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "start crawl");
    throw err;
  }
}
__name(startCrawl, "startCrawl");
async function getCrawlStatus(http3, jobId, pagination) {
  try {
    const res = await http3.get(`/v2/crawl/${jobId}`);
    if (res.status !== 200 || !res.data?.success) {
      throwForBadResponse(res, "get crawl status");
    }
    const body = res.data;
    const initialDocs = body.data || [];
    const auto = pagination?.autoPaginate ?? true;
    if (!auto || !body.next) {
      return {
        id: jobId,
        status: body.status,
        completed: body.completed ?? 0,
        total: body.total ?? 0,
        creditsUsed: body.creditsUsed,
        expiresAt: body.expiresAt,
        next: body.next ?? null,
        data: initialDocs
      };
    }
    const aggregated = await fetchAllPages(http3, body.next, initialDocs, pagination);
    return {
      id: jobId,
      status: body.status,
      completed: body.completed ?? 0,
      total: body.total ?? 0,
      creditsUsed: body.creditsUsed,
      expiresAt: body.expiresAt,
      next: null,
      data: aggregated
    };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get crawl status");
    throw err;
  }
}
__name(getCrawlStatus, "getCrawlStatus");
async function cancelCrawl(http3, jobId) {
  try {
    const res = await http3.delete(`/v2/crawl/${jobId}`);
    if (res.status !== 200) throwForBadResponse(res, "cancel crawl");
    return res.data?.status === "cancelled";
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "cancel crawl");
    throw err;
  }
}
__name(cancelCrawl, "cancelCrawl");
async function waitForCrawlCompletion(http3, jobId, pollInterval = 2, timeout) {
  const start = Date.now();
  while (true) {
    try {
      const status = await getCrawlStatus(http3, jobId);
      if (["completed", "failed", "cancelled"].includes(status.status)) {
        return status;
      }
    } catch (err) {
      if (!isRetryableError(err)) {
        if (err instanceof SdkError) {
          const errorWithJobId = new SdkError(
            err.message,
            err.status,
            err.code,
            err.details,
            jobId
          );
          throw errorWithJobId;
        }
        throw err;
      }
    }
    if (timeout != null && Date.now() - start > timeout * 1e3) {
      throw new JobTimeoutError(jobId, timeout, "crawl");
    }
    await new Promise((r) => setTimeout(r, Math.max(1e3, pollInterval * 1e3)));
  }
}
__name(waitForCrawlCompletion, "waitForCrawlCompletion");
async function crawl(http3, request, pollInterval = 2, timeout) {
  const started = await startCrawl(http3, request);
  return waitForCrawlCompletion(http3, started.id, pollInterval, timeout);
}
__name(crawl, "crawl");
async function getCrawlErrors(http3, crawlId) {
  try {
    const res = await http3.get(`/v2/crawl/${crawlId}/errors`);
    if (res.status !== 200) throwForBadResponse(res, "get crawl errors");
    const payload = res.data?.data ?? res.data;
    return { errors: payload.errors || [], robotsBlocked: payload.robotsBlocked || [] };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get crawl errors");
    throw err;
  }
}
__name(getCrawlErrors, "getCrawlErrors");
async function getActiveCrawls(http3) {
  try {
    const res = await http3.get(`/v2/crawl/active`);
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get active crawls");
    const crawlsIn = res.data?.crawls || [];
    const crawls = crawlsIn.map((c) => ({ id: c.id, teamId: c.teamId ?? c.team_id, url: c.url, options: c.options ?? null }));
    return { success: true, crawls };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get active crawls");
    throw err;
  }
}
__name(getActiveCrawls, "getActiveCrawls");
async function crawlParamsPreview(http3, url2, prompt) {
  if (!url2 || !url2.trim()) throw new Error("URL cannot be empty");
  if (!prompt || !prompt.trim()) throw new Error("Prompt cannot be empty");
  try {
    const res = await http3.post("/v2/crawl/params-preview", { url: url2.trim(), prompt });
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "crawl params preview");
    const data = res.data.data || {};
    if (res.data.warning) data.warning = res.data.warning;
    return data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "crawl params preview");
    throw err;
  }
}
__name(crawlParamsPreview, "crawlParamsPreview");
async function startBatchScrape(http3, urls, {
  options,
  webhook,
  appendToId,
  ignoreInvalidURLs,
  maxConcurrency,
  zeroDataRetention,
  idempotencyKey,
  integration
} = {}) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("URLs list cannot be empty");
  const payload = { urls };
  if (options) {
    ensureValidScrapeOptions(options);
    Object.assign(payload, options);
  }
  if (webhook != null) payload.webhook = webhook;
  if (appendToId != null) payload.appendToId = appendToId;
  if (ignoreInvalidURLs != null) payload.ignoreInvalidURLs = ignoreInvalidURLs;
  if (maxConcurrency != null) payload.maxConcurrency = maxConcurrency;
  if (zeroDataRetention != null) payload.zeroDataRetention = zeroDataRetention;
  if (integration != null && integration.trim()) payload.integration = integration.trim();
  try {
    const headers = http3.prepareHeaders(idempotencyKey);
    const res = await http3.post("/v2/batch/scrape", payload, headers);
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "start batch scrape");
    return { id: res.data.id, url: res.data.url, invalidURLs: res.data.invalidURLs || void 0 };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "start batch scrape");
    throw err;
  }
}
__name(startBatchScrape, "startBatchScrape");
async function getBatchScrapeStatus(http3, jobId, pagination) {
  try {
    const res = await http3.get(`/v2/batch/scrape/${jobId}`);
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get batch scrape status");
    const body = res.data;
    const initialDocs = body.data || [];
    const auto = pagination?.autoPaginate ?? true;
    if (!auto || !body.next) {
      return {
        id: jobId,
        status: body.status,
        completed: body.completed ?? 0,
        total: body.total ?? 0,
        creditsUsed: body.creditsUsed,
        expiresAt: body.expiresAt,
        next: body.next ?? null,
        data: initialDocs
      };
    }
    const aggregated = await fetchAllPages(http3, body.next, initialDocs, pagination);
    return {
      id: jobId,
      status: body.status,
      completed: body.completed ?? 0,
      total: body.total ?? 0,
      creditsUsed: body.creditsUsed,
      expiresAt: body.expiresAt,
      next: null,
      data: aggregated
    };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get batch scrape status");
    throw err;
  }
}
__name(getBatchScrapeStatus, "getBatchScrapeStatus");
async function cancelBatchScrape(http3, jobId) {
  try {
    const res = await http3.delete(`/v2/batch/scrape/${jobId}`);
    if (res.status !== 200) throwForBadResponse(res, "cancel batch scrape");
    return res.data?.status === "cancelled";
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "cancel batch scrape");
    throw err;
  }
}
__name(cancelBatchScrape, "cancelBatchScrape");
async function getBatchScrapeErrors(http3, jobId) {
  try {
    const res = await http3.get(`/v2/batch/scrape/${jobId}/errors`);
    if (res.status !== 200) throwForBadResponse(res, "get batch scrape errors");
    const payload = res.data?.data ?? res.data;
    return { errors: payload.errors || [], robotsBlocked: payload.robotsBlocked || [] };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get batch scrape errors");
    throw err;
  }
}
__name(getBatchScrapeErrors, "getBatchScrapeErrors");
async function waitForBatchCompletion(http3, jobId, pollInterval = 2, timeout) {
  const start = Date.now();
  while (true) {
    try {
      const status = await getBatchScrapeStatus(http3, jobId);
      if (["completed", "failed", "cancelled"].includes(status.status)) {
        return status;
      }
    } catch (err) {
      if (!isRetryableError(err)) {
        if (err instanceof SdkError) {
          const errorWithJobId = new SdkError(
            err.message,
            err.status,
            err.code,
            err.details,
            jobId
          );
          throw errorWithJobId;
        }
        throw err;
      }
    }
    if (timeout != null && Date.now() - start > timeout * 1e3) {
      throw new JobTimeoutError(jobId, timeout, "batch");
    }
    await new Promise((r) => setTimeout(r, Math.max(1e3, pollInterval * 1e3)));
  }
}
__name(waitForBatchCompletion, "waitForBatchCompletion");
async function batchScrape(http3, urls, opts = {}) {
  const start = await startBatchScrape(http3, urls, opts);
  return waitForBatchCompletion(http3, start.id, opts.pollInterval ?? 2, opts.timeout);
}
__name(batchScrape, "batchScrape");
function prepareExtractPayload(args) {
  const body = {};
  if (args.urls) body.urls = args.urls;
  if (args.prompt != null) body.prompt = args.prompt;
  if (args.schema != null) {
    body.schema = isZodSchema(args.schema) ? zodSchemaToJsonSchema(args.schema) : args.schema;
  }
  if (args.systemPrompt != null) body.systemPrompt = args.systemPrompt;
  if (args.allowExternalLinks != null) body.allowExternalLinks = args.allowExternalLinks;
  if (args.enableWebSearch != null) body.enableWebSearch = args.enableWebSearch;
  if (args.showSources != null) body.showSources = args.showSources;
  if (args.ignoreInvalidURLs != null) body.ignoreInvalidURLs = args.ignoreInvalidURLs;
  if (args.integration && args.integration.trim()) body.integration = args.integration.trim();
  if (args.agent) body.agent = args.agent;
  if (args.scrapeOptions) {
    ensureValidScrapeOptions(args.scrapeOptions);
    body.scrapeOptions = args.scrapeOptions;
  }
  return body;
}
__name(prepareExtractPayload, "prepareExtractPayload");
async function startExtract(http3, args) {
  const payload = prepareExtractPayload(args);
  try {
    const res = await http3.post("/v2/extract", payload);
    if (res.status !== 200) throwForBadResponse(res, "extract");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "extract");
    throw err;
  }
}
__name(startExtract, "startExtract");
async function getExtractStatus(http3, jobId) {
  try {
    const res = await http3.get(`/v2/extract/${jobId}`);
    if (res.status !== 200) throwForBadResponse(res, "extract status");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "extract status");
    throw err;
  }
}
__name(getExtractStatus, "getExtractStatus");
async function waitExtract(http3, jobId, pollInterval = 2, timeout) {
  const start = Date.now();
  while (true) {
    const status = await getExtractStatus(http3, jobId);
    if (["completed", "failed", "cancelled"].includes(status.status || "")) return status;
    if (timeout != null && Date.now() - start > timeout * 1e3) return status;
    await new Promise((r) => setTimeout(r, Math.max(1e3, pollInterval * 1e3)));
  }
}
__name(waitExtract, "waitExtract");
async function extract(http3, args) {
  const started = await startExtract(http3, args);
  const jobId = started.id;
  if (!jobId) return started;
  return waitExtract(http3, jobId, args.pollInterval ?? 2, args.timeout);
}
__name(extract, "extract");
function prepareAgentPayload(args) {
  const body = {};
  if (args.urls) body.urls = args.urls;
  body.prompt = args.prompt;
  if (args.schema != null) {
    body.schema = isZodSchema(args.schema) ? zodSchemaToJsonSchema(args.schema) : args.schema;
  }
  if (args.integration && args.integration.trim()) body.integration = args.integration.trim();
  if (args.maxCredits !== null && args.maxCredits !== void 0) body.maxCredits = args.maxCredits;
  if (args.strictConstrainToURLs !== null && args.strictConstrainToURLs !== void 0) body.strictConstrainToURLs = args.strictConstrainToURLs;
  if (args.model !== null && args.model !== void 0) body.model = args.model;
  if (args.webhook != null) body.webhook = args.webhook;
  return body;
}
__name(prepareAgentPayload, "prepareAgentPayload");
async function startAgent(http3, args) {
  const payload = prepareAgentPayload(args);
  try {
    const res = await http3.post("/v2/agent", payload);
    if (res.status !== 200) throwForBadResponse(res, "agent");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "agent");
    throw err;
  }
}
__name(startAgent, "startAgent");
async function getAgentStatus(http3, jobId) {
  try {
    const res = await http3.get(`/v2/agent/${jobId}`);
    if (res.status !== 200) throwForBadResponse(res, "agent status");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "agent status");
    throw err;
  }
}
__name(getAgentStatus, "getAgentStatus");
async function waitAgent(http3, jobId, pollInterval = 2, timeout) {
  const start = Date.now();
  while (true) {
    const status = await getAgentStatus(http3, jobId);
    if (["completed", "failed", "cancelled"].includes(status.status || "")) return status;
    if (timeout != null && Date.now() - start > timeout * 1e3) return status;
    await new Promise((r) => setTimeout(r, Math.max(1e3, pollInterval * 1e3)));
  }
}
__name(waitAgent, "waitAgent");
async function agent(http3, args) {
  const started = await startAgent(http3, args);
  const jobId = started.id;
  if (!jobId) return started;
  return waitAgent(http3, jobId, args.pollInterval ?? 2, args.timeout);
}
__name(agent, "agent");
async function cancelAgent(http3, jobId) {
  try {
    const res = await http3.delete(`/v2/agent/${jobId}`);
    if (res.status !== 200) throwForBadResponse(res, "cancel agent");
    return res.data?.success === true;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "cancel agent");
    throw err;
  }
}
__name(cancelAgent, "cancelAgent");
async function browser(http3, args = {}) {
  const body = {};
  if (args.ttl != null) body.ttl = args.ttl;
  if (args.activityTtl != null) body.activityTtl = args.activityTtl;
  if (args.streamWebView != null) body.streamWebView = args.streamWebView;
  try {
    const res = await http3.post("/v2/browser", body);
    if (res.status !== 200) throwForBadResponse(res, "create browser session");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "create browser session");
    throw err;
  }
}
__name(browser, "browser");
async function browserExecute(http3, sessionId, args) {
  const body = {
    code: args.code,
    language: args.language ?? "bash"
  };
  if (args.timeout != null) body.timeout = args.timeout;
  try {
    const res = await http3.post(
      `/v2/browser/${sessionId}/execute`,
      body
    );
    if (res.status !== 200) throwForBadResponse(res, "execute browser code");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "execute browser code");
    throw err;
  }
}
__name(browserExecute, "browserExecute");
async function deleteBrowser(http3, sessionId) {
  try {
    const res = await http3.delete(
      `/v2/browser/${sessionId}`
    );
    if (res.status !== 200) throwForBadResponse(res, "delete browser session");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "delete browser session");
    throw err;
  }
}
__name(deleteBrowser, "deleteBrowser");
async function listBrowsers(http3, args = {}) {
  let endpoint = "/v2/browser";
  if (args.status) endpoint += `?status=${args.status}`;
  try {
    const res = await http3.get(endpoint);
    if (res.status !== 200) throwForBadResponse(res, "list browser sessions");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "list browser sessions");
    throw err;
  }
}
__name(listBrowsers, "listBrowsers");
async function getConcurrency(http3) {
  try {
    const res = await http3.get("/v2/concurrency-check");
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get concurrency");
    const d = res.data.data || res.data;
    return { concurrency: d.concurrency, maxConcurrency: d.maxConcurrency ?? d.max_concurrency };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get concurrency");
    throw err;
  }
}
__name(getConcurrency, "getConcurrency");
async function getCreditUsage(http3) {
  try {
    const res = await http3.get("/v2/team/credit-usage");
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get credit usage");
    const d = res.data.data || res.data;
    return {
      remainingCredits: d.remainingCredits ?? d.remaining_credits ?? 0,
      planCredits: d.planCredits ?? d.plan_credits,
      billingPeriodStart: d.billingPeriodStart ?? d.billing_period_start ?? null,
      billingPeriodEnd: d.billingPeriodEnd ?? d.billing_period_end ?? null
    };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get credit usage");
    throw err;
  }
}
__name(getCreditUsage, "getCreditUsage");
async function getTokenUsage(http3) {
  try {
    const res = await http3.get("/v2/team/token-usage");
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get token usage");
    const d = res.data.data || res.data;
    return {
      remainingTokens: d.remainingTokens ?? d.remaining_tokens ?? 0,
      planTokens: d.planTokens ?? d.plan_tokens,
      billingPeriodStart: d.billingPeriodStart ?? d.billing_period_start ?? null,
      billingPeriodEnd: d.billingPeriodEnd ?? d.billing_period_end ?? null
    };
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get token usage");
    throw err;
  }
}
__name(getTokenUsage, "getTokenUsage");
async function getQueueStatus(http3) {
  try {
    const res = await http3.get("/v2/team/queue-status");
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get queue status");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get queue status");
    throw err;
  }
}
__name(getQueueStatus, "getQueueStatus");
async function getCreditUsageHistorical(http3, byApiKey) {
  try {
    const query = byApiKey ? "?byApiKey=true" : "";
    const res = await http3.get(`/v2/team/credit-usage/historical${query}`);
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get credit usage historical");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get credit usage historical");
    throw err;
  }
}
__name(getCreditUsageHistorical, "getCreditUsageHistorical");
async function getTokenUsageHistorical(http3, byApiKey) {
  try {
    const query = byApiKey ? "?byApiKey=true" : "";
    const res = await http3.get(`/v2/team/token-usage/historical${query}`);
    if (res.status !== 200 || !res.data?.success) throwForBadResponse(res, "get token usage historical");
    return res.data;
  } catch (err) {
    if (err?.isAxiosError) return normalizeAxiosError(err, "get token usage historical");
    throw err;
  }
}
__name(getTokenUsageHistorical, "getTokenUsageHistorical");
var hasGlobalWebSocket = /* @__PURE__ */ __name(() => {
  if (typeof globalThis === "undefined") return void 0;
  const candidate = globalThis.WebSocket;
  return typeof candidate === "function" ? candidate : void 0;
}, "hasGlobalWebSocket");
var isNodeRuntime = /* @__PURE__ */ __name(() => typeof process !== "undefined" && !!process.versions?.node, "isNodeRuntime");
var cachedWebSocket;
var loadPromise;
var loadNodeWebSocket = /* @__PURE__ */ __name(async () => {
  if (!isNodeRuntime()) return void 0;
  try {
    const undici = await import("../../../undici-J6MEHILL.mjs");
    const ctor = undici.WebSocket ?? undici.default?.WebSocket;
    return typeof ctor === "function" ? ctor : void 0;
  } catch {
    return void 0;
  }
}, "loadNodeWebSocket");
var getWebSocketCtor = /* @__PURE__ */ __name(async () => {
  if (cachedWebSocket) return cachedWebSocket;
  const globalWs = hasGlobalWebSocket();
  if (globalWs) {
    cachedWebSocket = globalWs;
    return cachedWebSocket;
  }
  if (!loadPromise) {
    loadPromise = loadNodeWebSocket();
  }
  cachedWebSocket = await loadPromise;
  return cachedWebSocket;
}, "getWebSocketCtor");
var decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : void 0;
var ensureUtf8String = /* @__PURE__ */ __name((data) => {
  if (typeof data === "string") return data;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  const convertView = /* @__PURE__ */ __name((view) => {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString("utf8");
    }
    return decoder?.decode(view);
  }, "convertView");
  if (ArrayBuffer.isView(data)) {
    return convertView(data);
  }
  if (data instanceof ArrayBuffer) {
    return convertView(new Uint8Array(data));
  }
  return void 0;
}, "ensureUtf8String");
var Watcher = class extends EventEmitter2 {
  static {
    __name(this, "Watcher");
  }
  http;
  jobId;
  kind;
  pollInterval;
  timeout;
  ws;
  closed = false;
  emittedDocumentKeys = /* @__PURE__ */ new Set();
  constructor(http3, jobId, opts = {}) {
    super();
    this.http = http3;
    this.jobId = jobId;
    this.kind = opts.kind ?? "crawl";
    this.pollInterval = opts.pollInterval ?? 2;
    this.timeout = opts.timeout;
  }
  buildWsUrl() {
    const apiUrl = this.http.getApiUrl();
    const wsBase = apiUrl.replace(/^http/, "ws");
    const path = this.kind === "crawl" ? `/v2/crawl/${this.jobId}` : `/v2/batch/scrape/${this.jobId}`;
    return `${wsBase}${path}`;
  }
  async start() {
    try {
      const url2 = this.buildWsUrl();
      const wsCtor = await getWebSocketCtor();
      if (!wsCtor) {
        this.pollLoop();
        return;
      }
      this.ws = new wsCtor(url2, this.http.getApiKey());
      if (this.ws && "binaryType" in this.ws) {
        this.ws.binaryType = "arraybuffer";
      }
      if (this.ws) {
        this.attachWsHandlers(this.ws);
      }
    } catch (err) {
      this.pollLoop();
    }
  }
  attachWsHandlers(ws) {
    let startTs = Date.now();
    const timeoutMs = this.timeout ? this.timeout * 1e3 : void 0;
    ws.onmessage = (ev) => {
      try {
        const raw = ensureUtf8String(ev.data);
        if (!raw) return;
        const body = JSON.parse(raw);
        const type = body.type;
        if (type === "error") {
          this.emit("error", { status: "failed", data: [], error: body.error, id: this.jobId });
          return;
        }
        if (type === "catchup") {
          const payload2 = body.data || {};
          this.emitDocuments(payload2.data || []);
          this.emitSnapshot(payload2);
          return;
        }
        if (type === "document") {
          const doc = body.data;
          if (doc) this.emit("document", doc);
          return;
        }
        if (type === "done") {
          const payload2 = body.data || body;
          const data = payload2.data || [];
          if (data.length) this.emitDocuments(data);
          this.emit("done", { status: "completed", data, id: this.jobId });
          this.close();
          return;
        }
        const payload = body.data || body;
        if (payload && payload.status) this.emitSnapshot(payload);
      } catch {
      }
      if (timeoutMs && Date.now() - startTs > timeoutMs) this.close();
    };
    ws.onerror = () => {
      this.emit("error", { status: "failed", data: [], error: "WebSocket error", id: this.jobId });
      this.close();
    };
    ws.onclose = () => {
      if (!this.closed) this.pollLoop();
    };
  }
  documentKey(doc) {
    if (doc && typeof doc === "object") {
      const explicitId = doc.id ?? doc.docId ?? doc.url;
      if (typeof explicitId === "string" && explicitId.length) {
        return explicitId;
      }
    }
    try {
      return JSON.stringify(doc);
    } catch {
      return `${Date.now()}-${Math.random()}`;
    }
  }
  emitDocuments(docs) {
    for (const doc of docs) {
      if (!doc) continue;
      const key = this.documentKey(doc);
      if (this.emittedDocumentKeys.has(key)) continue;
      this.emittedDocumentKeys.add(key);
      this.emit("document", { ...doc, id: this.jobId });
    }
  }
  emitSnapshot(payload) {
    const status = payload.status;
    const data = payload.data || [];
    const snap = this.kind === "crawl" ? {
      id: this.jobId,
      status,
      completed: payload.completed ?? 0,
      total: payload.total ?? 0,
      creditsUsed: payload.creditsUsed,
      expiresAt: payload.expiresAt,
      next: payload.next ?? null,
      data
    } : {
      id: this.jobId,
      status,
      completed: payload.completed ?? 0,
      total: payload.total ?? 0,
      creditsUsed: payload.creditsUsed,
      expiresAt: payload.expiresAt,
      next: payload.next ?? null,
      data
    };
    this.emit("snapshot", snap);
    if (["completed", "failed", "cancelled"].includes(status)) {
      this.emit("done", { status, data, id: this.jobId });
      this.close();
    }
  }
  async pollLoop() {
    const startTs = Date.now();
    const timeoutMs = this.timeout ? this.timeout * 1e3 : void 0;
    while (!this.closed) {
      try {
        const snap = this.kind === "crawl" ? await getCrawlStatus(this.http, this.jobId) : await getBatchScrapeStatus(this.http, this.jobId);
        this.emitDocuments(snap.data || []);
        this.emit("snapshot", snap);
        if (["completed", "failed", "cancelled"].includes(snap.status)) {
          this.emit("done", { status: snap.status, data: snap.data, id: this.jobId });
          this.close();
          break;
        }
      } catch {
      }
      if (timeoutMs && Date.now() - startTs > timeoutMs) break;
      await new Promise((r) => setTimeout(r, Math.max(1e3, this.pollInterval * 1e3)));
    }
  }
  close() {
    this.closed = true;
    if (this.ws && this.ws.close) this.ws.close();
  }
};
var FirecrawlClient = class {
  static {
    __name(this, "FirecrawlClient");
  }
  http;
  isCloudService(url2) {
    return url2.includes("api.firecrawl.dev");
  }
  /**
   * Create a v2 client.
   * @param options Transport configuration (API key, base URL, timeouts, retries).
   */
  constructor(options = {}) {
    const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY ?? "";
    const apiUrl = (options.apiUrl ?? process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev").replace(/\/$/, "");
    if (this.isCloudService(apiUrl) && !apiKey) {
      throw new Error("API key is required for the cloud API. Set FIRECRAWL_API_KEY env or pass apiKey.");
    }
    this.http = new HttpClient({
      apiKey,
      apiUrl,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      backoffFactor: options.backoffFactor
    });
  }
  async scrape(url2, options) {
    return scrape(this.http, url2, options);
  }
  // Search
  /**
   * Search the web and optionally scrape each result.
   * @param query Search query string.
   * @param req Additional search options (sources, limit, scrapeOptions, etc.).
   * @returns Structured search results.
   */
  async search(query, req = {}) {
    return search(this.http, { query, ...req });
  }
  // Map
  /**
   * Map a site to discover URLs (sitemap-aware).
   * @param url Root URL to map.
   * @param options Mapping options (sitemap mode, includeSubdomains, limit, timeout).
   * @returns Discovered links.
   */
  async map(url2, options) {
    return map(this.http, url2, options);
  }
  // Crawl
  /**
   * Start a crawl job (async).
   * @param url Root URL to crawl.
   * @param req Crawl configuration (paths, limits, scrapeOptions, webhook, etc.).
   * @returns Job id and url.
   */
  async startCrawl(url2, req = {}) {
    return startCrawl(this.http, { url: url2, ...req });
  }
  /**
   * Get the status and partial data of a crawl job.
   * @param jobId Crawl job id.
   */
  async getCrawlStatus(jobId, pagination) {
    return getCrawlStatus(this.http, jobId, pagination);
  }
  /**
   * Cancel a crawl job.
   * @param jobId Crawl job id.
   * @returns True if cancelled.
   */
  async cancelCrawl(jobId) {
    return cancelCrawl(this.http, jobId);
  }
  /**
   * Convenience waiter: start a crawl and poll until it finishes.
   * @param url Root URL to crawl.
   * @param req Crawl configuration plus waiter controls (pollInterval, timeout seconds).
   * @returns Final job snapshot.
   */
  async crawl(url2, req = {}) {
    return crawl(this.http, { url: url2, ...req }, req.pollInterval, req.timeout);
  }
  /**
   * Retrieve crawl errors and robots.txt blocks.
   * @param crawlId Crawl job id.
   */
  async getCrawlErrors(crawlId) {
    return getCrawlErrors(this.http, crawlId);
  }
  /**
   * List active crawls for the authenticated team.
   */
  async getActiveCrawls() {
    return getActiveCrawls(this.http);
  }
  /**
   * Preview normalized crawl parameters produced by a natural-language prompt.
   * @param url Root URL.
   * @param prompt Natural-language instruction.
   */
  async crawlParamsPreview(url2, prompt) {
    return crawlParamsPreview(this.http, url2, prompt);
  }
  // Batch
  /**
   * Start a batch scrape job for multiple URLs (async).
   * @param urls URLs to scrape.
   * @param opts Batch options (scrape options, webhook, concurrency, idempotency key, etc.).
   * @returns Job id and url.
   */
  async startBatchScrape(urls, opts) {
    return startBatchScrape(this.http, urls, opts);
  }
  /**
   * Get the status and partial data of a batch scrape job.
   * @param jobId Batch job id.
   */
  async getBatchScrapeStatus(jobId, pagination) {
    return getBatchScrapeStatus(this.http, jobId, pagination);
  }
  /**
   * Retrieve batch scrape errors and robots.txt blocks.
   * @param jobId Batch job id.
   */
  async getBatchScrapeErrors(jobId) {
    return getBatchScrapeErrors(this.http, jobId);
  }
  /**
   * Cancel a batch scrape job.
   * @param jobId Batch job id.
   * @returns True if cancelled.
   */
  async cancelBatchScrape(jobId) {
    return cancelBatchScrape(this.http, jobId);
  }
  /**
   * Convenience waiter: start a batch scrape and poll until it finishes.
   * @param urls URLs to scrape.
   * @param opts Batch options plus waiter controls (pollInterval, timeout seconds).
   * @returns Final job snapshot.
   */
  async batchScrape(urls, opts) {
    return batchScrape(this.http, urls, opts);
  }
  // Extract
  /**
   * Start an extract job (async).
   * @param args Extraction request (urls, schema or prompt, flags).
   * @returns Job id or processing state.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async startExtract(args) {
    return startExtract(this.http, args);
  }
  /**
   * Get extract job status/data.
   * @param jobId Extract job id.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async getExtractStatus(jobId) {
    return getExtractStatus(this.http, jobId);
  }
  /**
   * Convenience waiter: start an extract and poll until it finishes.
   * @param args Extraction request plus waiter controls (pollInterval, timeout seconds).
   * @returns Final extract response.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async extract(args) {
    return extract(this.http, args);
  }
  // Agent
  /**
   * Start an agent job (async).
   * @param args Agent request (urls, prompt, schema).
   * @returns Job id or processing state.
   */
  async startAgent(args) {
    return startAgent(this.http, args);
  }
  /**
   * Get agent job status/data.
   * @param jobId Agent job id.
   */
  async getAgentStatus(jobId) {
    return getAgentStatus(this.http, jobId);
  }
  /**
   * Convenience waiter: start an agent and poll until it finishes.
   * @param args Agent request plus waiter controls (pollInterval, timeout seconds).
   * @returns Final agent response.
   */
  async agent(args) {
    return agent(this.http, args);
  }
  /**
   * Cancel an agent job.
   * @param jobId Agent job id.
   * @returns True if cancelled.
   */
  async cancelAgent(jobId) {
    return cancelAgent(this.http, jobId);
  }
  // Browser
  /**
   * Create a new browser session.
   * @param args Session options (ttl, activityTtl, streamWebView).
   * @returns Session id, CDP URL, live view URL, and expiration time.
   */
  async browser(args = {}) {
    return browser(this.http, args);
  }
  /**
   * Execute code in a browser session.
   * @param sessionId Browser session id.
   * @param args Code, language ("python" | "node" | "bash"), and optional timeout.
   * @returns Execution result including stdout, stderr, exitCode, and killed status.
   */
  async browserExecute(sessionId, args) {
    return browserExecute(this.http, sessionId, args);
  }
  /**
   * Delete a browser session.
   * @param sessionId Browser session id.
   */
  async deleteBrowser(sessionId) {
    return deleteBrowser(this.http, sessionId);
  }
  /**
   * List browser sessions.
   * @param args Optional filter (status: "active" | "destroyed").
   * @returns List of browser sessions.
   */
  async listBrowsers(args = {}) {
    return listBrowsers(this.http, args);
  }
  // Usage
  /** Current concurrency usage. */
  async getConcurrency() {
    return getConcurrency(this.http);
  }
  /** Current credit usage. */
  async getCreditUsage() {
    return getCreditUsage(this.http);
  }
  /** Recent token usage. */
  async getTokenUsage() {
    return getTokenUsage(this.http);
  }
  /** Historical credit usage by month; set byApiKey to true to break down by API key. */
  async getCreditUsageHistorical(byApiKey) {
    return getCreditUsageHistorical(this.http, byApiKey);
  }
  /** Historical token usage by month; set byApiKey to true to break down by API key. */
  async getTokenUsageHistorical(byApiKey) {
    return getTokenUsageHistorical(this.http, byApiKey);
  }
  /** Metrics about the team's scrape queue. */
  async getQueueStatus() {
    return getQueueStatus(this.http);
  }
  // Watcher
  /**
   * Create a watcher for a crawl or batch job. Emits: `document`, `snapshot`, `done`, `error`.
   * @param jobId Job id.
   * @param opts Watcher options (kind, pollInterval, timeout seconds).
   */
  watcher(jobId, opts = {}) {
    return new Watcher(this.http, jobId, opts);
  }
};
var e = class extends EventTarget {
  static {
    __name(this, "e");
  }
  dispatchTypedEvent(s, t) {
    return super.dispatchEvent(t);
  }
};
var FirecrawlError = class extends Error {
  static {
    __name(this, "FirecrawlError");
  }
  statusCode;
  details;
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
};
var FirecrawlApp = class {
  static {
    __name(this, "FirecrawlApp");
  }
  apiKey;
  apiUrl;
  version = "1.25.1";
  isCloudService(url2) {
    return url2.includes("api.firecrawl.dev");
  }
  async getVersion() {
    try {
      if (typeof process !== "undefined" && process.env && process.env.npm_package_version) {
        return process.env.npm_package_version;
      }
      const packageJson = await import("../../../package-HWPUIS3T-S5E7J3GI.mjs");
      return packageJson.default.version;
    } catch (error) {
      const isTest = typeof process !== "undefined" && (process.env.JEST_WORKER_ID != null || false);
      if (!isTest) {
        console.error("Error getting version:", error);
      }
      return "1.25.1";
    }
  }
  async init() {
    this.version = await this.getVersion();
  }
  /**
   * Initializes a new instance of the FirecrawlApp class.
   * @param config - Configuration options for the FirecrawlApp instance.
   */
  constructor({ apiKey = null, apiUrl = null }) {
    const baseUrl = apiUrl || "https://api.firecrawl.dev";
    if (this.isCloudService(baseUrl) && typeof apiKey !== "string") {
      throw new FirecrawlError("No API key provided", 401);
    }
    this.apiKey = apiKey || "";
    this.apiUrl = baseUrl;
    this.init();
  }
  /**
   * Scrapes a URL using the Firecrawl API.
   * @param url - The URL to scrape.
   * @param params - Additional parameters for the scrape request.
   * @returns The response from the scrape operation.
   */
  async scrapeUrl(url2, params) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
    let jsonData = { url: url2, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    if (jsonData?.extract?.schema) {
      jsonData = {
        ...jsonData,
        extract: {
          ...jsonData.extract,
          schema: zodSchemaToJsonSchema(jsonData.extract.schema)
        }
      };
    }
    if (jsonData?.jsonOptions?.schema) {
      jsonData = {
        ...jsonData,
        jsonOptions: {
          ...jsonData.jsonOptions,
          schema: zodSchemaToJsonSchema(jsonData.jsonOptions.schema)
        }
      };
    }
    try {
      const response = await axios_default.post(
        this.apiUrl + `/v1/scrape`,
        jsonData,
        { headers, timeout: params?.timeout !== void 0 ? params.timeout + 5e3 : void 0 }
      );
      if (response.status === 200) {
        const responseData = response.data;
        if (responseData.success) {
          return {
            success: true,
            warning: responseData.warning,
            error: responseData.error,
            ...responseData.data
          };
        } else {
          throw new FirecrawlError(`Failed to scrape URL. Error: ${responseData.error}`, response.status);
        }
      } else {
        this.handleError(response, "scrape URL");
      }
    } catch (error) {
      this.handleError(error.response, "scrape URL");
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Searches using the Firecrawl API and optionally scrapes the results.
   * @param query - The search query string.
   * @param params - Optional parameters for the search request.
   * @returns The response from the search operation.
   */
  async search(query, params) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
    let jsonData = {
      query,
      limit: params?.limit ?? 5,
      tbs: params?.tbs,
      filter: params?.filter,
      lang: params?.lang ?? "en",
      country: params?.country ?? "us",
      location: params?.location,
      origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}`,
      timeout: params?.timeout ?? 6e4,
      scrapeOptions: params?.scrapeOptions ?? { formats: [] }
    };
    if (jsonData?.scrapeOptions?.extract?.schema) {
      jsonData = {
        ...jsonData,
        scrapeOptions: {
          ...jsonData.scrapeOptions,
          extract: {
            ...jsonData.scrapeOptions.extract,
            schema: zodSchemaToJsonSchema(jsonData.scrapeOptions.extract.schema)
          }
        }
      };
    }
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/search`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        const responseData = response.data;
        if (responseData.success) {
          return {
            success: true,
            data: responseData.data,
            warning: responseData.warning
          };
        } else {
          throw new FirecrawlError(`Failed to search. Error: ${responseData.error}`, response.status);
        }
      } else {
        this.handleError(response, "search");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error.", data: [] };
  }
  /**
   * Initiates a crawl job for a URL using the Firecrawl API.
   * @param url - The URL to crawl.
   * @param params - Additional parameters for the crawl request.
   * @param pollInterval - Time in seconds for job status checks.
   * @param idempotencyKey - Optional idempotency key for the request.
   * @returns The response from the crawl operation.
   */
  async crawlUrl(url2, params, pollInterval = 2, idempotencyKey) {
    const headers = this.prepareHeaders(idempotencyKey);
    let jsonData = { url: url2, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/crawl`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        const id = response.data.id;
        return this.monitorJobStatus(id, headers, pollInterval);
      } else {
        this.handleError(response, "start crawl job");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  async asyncCrawlUrl(url2, params, idempotencyKey) {
    const headers = this.prepareHeaders(idempotencyKey);
    let jsonData = { url: url2, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/crawl`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start crawl job");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Checks the status of a crawl job using the Firecrawl API.
   * @param id - The ID of the crawl operation.
   * @param getAllData - Paginate through all the pages of documents, returning the full list of all documents. (default: `false`)
   * @param nextURL - The `next` URL from the previous crawl status. Only required if you're not manually increasing `skip`. Only used when `getAllData = false`.
   * @param skip - How many entries to skip to paginate. Only required if you're not providing `nextURL`. Only used when `getAllData = false`.
   * @param limit - How many entries to return. Only used when `getAllData = false`.
   * @returns The response containing the job status.
   */
  async checkCrawlStatus(id, getAllData = false, nextURL, skip, limit) {
    if (!id) {
      throw new FirecrawlError("No crawl ID provided", 400);
    }
    const headers = this.prepareHeaders();
    const targetURL = new URL(nextURL ?? `${this.apiUrl}/v1/crawl/${id}`);
    if (skip !== void 0) {
      targetURL.searchParams.set("skip", skip.toString());
    }
    if (limit !== void 0) {
      targetURL.searchParams.set("limit", limit.toString());
    }
    try {
      const response = await this.getRequest(
        targetURL.href,
        headers
      );
      if (response.status === 200) {
        let allData = response.data.data;
        if (getAllData && response.data.status === "completed") {
          let statusData = response.data;
          if ("data" in statusData) {
            let data = statusData.data;
            while (typeof statusData === "object" && "next" in statusData) {
              if (data.length === 0) {
                break;
              }
              statusData = (await this.getRequest(statusData.next, headers)).data;
              data = data.concat(statusData.data);
            }
            allData = data;
          }
        }
        let resp = {
          success: response.data.success,
          status: response.data.status,
          total: response.data.total,
          completed: response.data.completed,
          creditsUsed: response.data.creditsUsed,
          next: getAllData ? void 0 : response.data.next,
          expiresAt: new Date(response.data.expiresAt),
          data: allData
        };
        if (!response.data.success && response.data.error) {
          resp = {
            ...resp,
            success: false,
            error: response.data.error
          };
        }
        if (response.data.next) {
          resp.next = response.data.next;
        }
        return resp;
      } else {
        this.handleError(response, "check crawl status");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Returns information about crawl errors.
   * @param id - The ID of the crawl operation.
   * @returns Information about crawl errors.
   */
  async checkCrawlErrors(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.deleteRequest(
        `${this.apiUrl}/v1/crawl/${id}/errors`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "check crawl errors");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Cancels a crawl job using the Firecrawl API.
   * @param id - The ID of the crawl operation.
   * @returns The response from the cancel crawl operation.
   */
  async cancelCrawl(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.deleteRequest(
        `${this.apiUrl}/v1/crawl/${id}`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "cancel crawl job");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Initiates a crawl job and returns a CrawlWatcher to monitor the job via WebSocket.
   * @param url - The URL to crawl.
   * @param params - Additional parameters for the crawl request.
   * @param idempotencyKey - Optional idempotency key for the request.
   * @returns A CrawlWatcher instance to monitor the crawl job.
   */
  async crawlUrlAndWatch(url2, params, idempotencyKey) {
    const crawl2 = await this.asyncCrawlUrl(url2, params, idempotencyKey);
    if (crawl2.success && crawl2.id) {
      const id = crawl2.id;
      return new CrawlWatcher(id, this);
    }
    throw new FirecrawlError("Crawl job failed to start", 400);
  }
  /**
   * Maps a URL using the Firecrawl API.
   * @param url - The URL to map.
   * @param params - Additional parameters for the map request.
   * @returns The response from the map operation.
   */
  async mapUrl(url2, params) {
    const headers = this.prepareHeaders();
    let jsonData = { url: url2, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/map`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "map");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Initiates a batch scrape job for multiple URLs using the Firecrawl API.
   * @param url - The URLs to scrape.
   * @param params - Additional parameters for the scrape request.
   * @param pollInterval - Time in seconds for job status checks.
   * @param idempotencyKey - Optional idempotency key for the request.
   * @param webhook - Optional webhook for the batch scrape.
   * @param ignoreInvalidURLs - Optional flag to ignore invalid URLs.
   * @returns The response from the crawl operation.
   */
  async batchScrapeUrls(urls, params, pollInterval = 2, idempotencyKey, webhook, ignoreInvalidURLs, maxConcurrency) {
    const headers = this.prepareHeaders(idempotencyKey);
    let jsonData = { urls, webhook, ignoreInvalidURLs, maxConcurrency, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    if (jsonData?.extract?.schema) {
      jsonData = {
        ...jsonData,
        extract: {
          ...jsonData.extract,
          schema: zodSchemaToJsonSchema(jsonData.extract.schema)
        }
      };
    }
    if (jsonData?.jsonOptions?.schema) {
      jsonData = {
        ...jsonData,
        jsonOptions: {
          ...jsonData.jsonOptions,
          schema: zodSchemaToJsonSchema(jsonData.jsonOptions.schema)
        }
      };
    }
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/batch/scrape`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        const id = response.data.id;
        return this.monitorJobStatus(id, headers, pollInterval);
      } else {
        this.handleError(response, "start batch scrape job");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  async asyncBatchScrapeUrls(urls, params, idempotencyKey, webhook, ignoreInvalidURLs) {
    const headers = this.prepareHeaders(idempotencyKey);
    let jsonData = { urls, webhook, ignoreInvalidURLs, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/batch/scrape`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start batch scrape job");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Initiates a batch scrape job and returns a CrawlWatcher to monitor the job via WebSocket.
   * @param urls - The URL to scrape.
   * @param params - Additional parameters for the scrape request.
   * @param idempotencyKey - Optional idempotency key for the request.
   * @returns A CrawlWatcher instance to monitor the crawl job.
   */
  async batchScrapeUrlsAndWatch(urls, params, idempotencyKey, webhook, ignoreInvalidURLs) {
    const crawl2 = await this.asyncBatchScrapeUrls(urls, params, idempotencyKey, webhook, ignoreInvalidURLs);
    if (crawl2.success && crawl2.id) {
      const id = crawl2.id;
      return new CrawlWatcher(id, this);
    }
    throw new FirecrawlError("Batch scrape job failed to start", 400);
  }
  /**
   * Checks the status of a batch scrape job using the Firecrawl API.
   * @param id - The ID of the batch scrape operation.
   * @param getAllData - Paginate through all the pages of documents, returning the full list of all documents. (default: `false`)
   * @param nextURL - The `next` URL from the previous batch scrape status. Only required if you're not manually increasing `skip`. Only used when `getAllData = false`.
   * @param skip - How many entries to skip to paginate. Only used when `getAllData = false`.
   * @param limit - How many entries to return. Only used when `getAllData = false`.
   * @returns The response containing the job status.
   */
  async checkBatchScrapeStatus(id, getAllData = false, nextURL, skip, limit) {
    if (!id) {
      throw new FirecrawlError("No batch scrape ID provided", 400);
    }
    const headers = this.prepareHeaders();
    const targetURL = new URL(nextURL ?? `${this.apiUrl}/v1/batch/scrape/${id}`);
    if (skip !== void 0) {
      targetURL.searchParams.set("skip", skip.toString());
    }
    if (limit !== void 0) {
      targetURL.searchParams.set("limit", limit.toString());
    }
    try {
      const response = await this.getRequest(
        targetURL.href,
        headers
      );
      if (response.status === 200) {
        let allData = response.data.data;
        if (getAllData && response.data.status === "completed") {
          let statusData = response.data;
          if ("data" in statusData) {
            let data = statusData.data;
            while (typeof statusData === "object" && "next" in statusData) {
              if (data.length === 0) {
                break;
              }
              statusData = (await this.getRequest(statusData.next, headers)).data;
              data = data.concat(statusData.data);
            }
            allData = data;
          }
        }
        let resp = {
          success: response.data.success,
          status: response.data.status,
          total: response.data.total,
          completed: response.data.completed,
          creditsUsed: response.data.creditsUsed,
          next: getAllData ? void 0 : response.data.next,
          expiresAt: new Date(response.data.expiresAt),
          data: allData
        };
        if (!response.data.success && response.data.error) {
          resp = {
            ...resp,
            success: false,
            error: response.data.error
          };
        }
        if (response.data.next) {
          resp.next = response.data.next;
        }
        return resp;
      } else {
        this.handleError(response, "check batch scrape status");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Returns information about batch scrape errors.
   * @param id - The ID of the batch scrape operation.
   * @returns Information about batch scrape errors.
   */
  async checkBatchScrapeErrors(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.deleteRequest(
        `${this.apiUrl}/v1/batch/scrape/${id}/errors`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "check batch scrape errors");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Extracts information from URLs using the Firecrawl API.
   * @param urls - The URLs to extract information from. Optional if using other methods for data extraction.
   * @param params - Additional parameters for the extract request.
   * @returns The response from the extract operation.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async extract(urls, params) {
    const headers = this.prepareHeaders();
    let jsonData = { urls, ...params };
    const jsonSchema = params?.schema ? zodSchemaToJsonSchema(params.schema) : void 0;
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/extract`,
        { ...jsonData, schema: jsonSchema, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` },
        headers
      );
      if (response.status === 200) {
        const jobId = response.data.id;
        let extractStatus;
        do {
          const statusResponse = await this.getRequest(
            `${this.apiUrl}/v1/extract/${jobId}`,
            headers
          );
          extractStatus = statusResponse.data;
          if (extractStatus.status === "completed") {
            if (extractStatus.success) {
              return {
                success: true,
                data: extractStatus.data,
                warning: extractStatus.warning,
                error: extractStatus.error,
                sources: extractStatus?.sources || void 0
              };
            } else {
              throw new FirecrawlError(`Failed to extract data. Error: ${extractStatus.error}`, statusResponse.status);
            }
          } else if (extractStatus.status === "failed" || extractStatus.status === "cancelled") {
            throw new FirecrawlError(`Extract job ${extractStatus.status}. Error: ${extractStatus.error}`, statusResponse.status);
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        } while (extractStatus.status !== "completed");
      } else {
        this.handleError(response, "extract");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500, error.response?.data?.details);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Initiates an asynchronous extract job for a URL using the Firecrawl API.
   * @param url - The URL to extract data from.
   * @param params - Additional parameters for the extract request.
   * @param idempotencyKey - Optional idempotency key for the request.
   * @returns The response from the extract operation.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async asyncExtract(urls, params, idempotencyKey) {
    const headers = this.prepareHeaders(idempotencyKey);
    const jsonData = { urls, ...params };
    const jsonSchema = params?.schema ? zodSchemaToJsonSchema(params.schema) : void 0;
    try {
      const response = await this.postRequest(
        this.apiUrl + `/v1/extract`,
        { ...jsonData, schema: jsonSchema, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` },
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start extract job");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500, error.response?.data?.details);
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Retrieves the status of an extract job.
   * @param jobId - The ID of the extract job.
   * @returns The status of the extract job.
   * @deprecated The extract endpoint is in maintenance mode and its use is discouraged.
   * Review https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor to find a replacement.
   */
  async getExtractStatus(jobId) {
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/extract/${jobId}`,
        this.prepareHeaders()
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get extract status");
      }
    } catch (error) {
      throw new FirecrawlError(error.message, 500);
    }
  }
  /**
   * Prepares the headers for an API request.
   * @param idempotencyKey - Optional key to ensure idempotency.
   * @returns The prepared headers.
   */
  prepareHeaders(idempotencyKey) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}
    };
  }
  /**
   * Sends a POST request to the specified URL.
   * @param url - The URL to send the request to.
   * @param data - The data to send in the request.
   * @param headers - The headers for the request.
   * @returns The response from the POST request.
   */
  postRequest(url2, data, headers) {
    return axios_default.post(url2, data, { headers, timeout: data?.timeout ? data.timeout + 5e3 : void 0 });
  }
  /**
   * Sends a GET request to the specified URL.
   * @param url - The URL to send the request to.
   * @param headers - The headers for the request.
   * @returns The response from the GET request.
   */
  async getRequest(url2, headers) {
    try {
      return await axios_default.get(url2, { headers });
    } catch (error) {
      if (error instanceof AxiosError2 && error.response) {
        return error.response;
      } else {
        throw error;
      }
    }
  }
  /**
   * Sends a DELETE request to the specified URL.
   * @param url - The URL to send the request to.
   * @param headers - The headers for the request.
   * @returns The response from the DELETE request.
   */
  async deleteRequest(url2, headers) {
    try {
      return await axios_default.delete(url2, { headers });
    } catch (error) {
      if (error instanceof AxiosError2 && error.response) {
        return error.response;
      } else {
        throw error;
      }
    }
  }
  /**
   * Monitors the status of a crawl job until completion or failure.
   * @param id - The ID of the crawl operation.
   * @param headers - The headers for the request.
   * @param checkInterval - Interval in seconds for job status checks.
   * @param checkUrl - Optional URL to check the status (used for v1 API)
   * @returns The final job status or data.
   */
  async monitorJobStatus(id, headers, checkInterval) {
    let failedTries = 0;
    let networkRetries = 0;
    const maxNetworkRetries = 3;
    while (true) {
      try {
        let statusResponse = await this.getRequest(
          `${this.apiUrl}/v1/crawl/${id}`,
          headers
        );
        if (statusResponse.status === 200) {
          failedTries = 0;
          networkRetries = 0;
          let statusData = statusResponse.data;
          if (statusData.status === "completed") {
            if ("data" in statusData) {
              let data = statusData.data;
              while (typeof statusData === "object" && "next" in statusData) {
                if (data.length === 0) {
                  break;
                }
                statusResponse = await this.getRequest(statusData.next, headers);
                statusData = statusResponse.data;
                data = data.concat(statusData.data);
              }
              statusData.data = data;
              return statusData;
            } else {
              throw new FirecrawlError("Crawl job completed but no data was returned", 500);
            }
          } else if (["active", "paused", "pending", "queued", "waiting", "scraping"].includes(statusData.status)) {
            checkInterval = Math.max(checkInterval, 2);
            await new Promise(
              (resolve) => setTimeout(resolve, checkInterval * 1e3)
            );
          } else {
            throw new FirecrawlError(
              `Crawl job failed or was stopped. Status: ${statusData.status}`,
              500
            );
          }
        } else {
          failedTries++;
          if (failedTries >= 3) {
            this.handleError(statusResponse, "check crawl status");
          }
        }
      } catch (error) {
        if (this.isRetryableError(error) && networkRetries < maxNetworkRetries) {
          networkRetries++;
          const backoffDelay = Math.min(1e3 * Math.pow(2, networkRetries - 1), 1e4);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }
        throw new FirecrawlError(error, 500);
      }
    }
  }
  /**
   * Determines if an error is retryable (transient network error)
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  isRetryableError(error) {
    if (error instanceof AxiosError2) {
      if (!error.response) {
        const code = error.code;
        const message = error.message?.toLowerCase() || "";
        return code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED" || message.includes("socket hang up") || message.includes("network error") || message.includes("timeout");
      }
      if (error.response?.status === 408 || error.response?.status === 504) {
        return true;
      }
    }
    if (error && typeof error === "object") {
      const code = error.code;
      const message = error.message?.toLowerCase() || "";
      if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED" || message.includes("socket hang up") || message.includes("network error") || message.includes("timeout")) {
        return true;
      }
      if (error.response?.status === 408 || error.response?.status === 504) {
        return true;
      }
    }
    return false;
  }
  /**
   * Handles errors from API responses.
   * @param {AxiosResponse} response - The response from the API.
   * @param {string} action - The action being performed when the error occurred.
   */
  handleError(response, action) {
    if (!response) {
      throw new FirecrawlError(
        `No response received while trying to ${action}. This may be a network error or the server is unreachable.`,
        0
      );
    }
    if ([400, 402, 403, 408, 409, 500].includes(response.status)) {
      const errorMessage = response.data.error || "Unknown error occurred";
      const details = response.data.details ? ` - ${JSON.stringify(response.data.details)}` : "";
      throw new FirecrawlError(
        `Failed to ${action}. Status code: ${response.status}. Error: ${errorMessage}${details}`,
        response.status,
        response?.data?.details
      );
    } else {
      throw new FirecrawlError(
        `Unexpected error occurred while trying to ${action}. Status code: ${response.status}`,
        response.status
      );
    }
  }
  /**
   * Initiates a deep research operation on a given query and polls until completion.
   * @param query - The query to research.
   * @param params - Parameters for the deep research operation.
   * @param onActivity - Optional callback to receive activity updates in real-time.
   * @param onSource - Optional callback to receive source updates in real-time.
   * @returns The final research results.
   */
  async deepResearch(query, params, onActivity, onSource) {
    try {
      const response = await this.asyncDeepResearch(query, params);
      if (!response.success || "error" in response) {
        return { success: false, error: "error" in response ? response.error : "Unknown error" };
      }
      if (!response.id) {
        throw new FirecrawlError(`Failed to start research. No job ID returned.`, 500);
      }
      const jobId = response.id;
      let researchStatus;
      let lastActivityCount = 0;
      let lastSourceCount = 0;
      while (true) {
        researchStatus = await this.checkDeepResearchStatus(jobId);
        if ("error" in researchStatus && !researchStatus.success) {
          return researchStatus;
        }
        if (onActivity && researchStatus.activities) {
          const newActivities = researchStatus.activities.slice(lastActivityCount);
          for (const activity of newActivities) {
            onActivity(activity);
          }
          lastActivityCount = researchStatus.activities.length;
        }
        if (onSource && researchStatus.sources) {
          const newSources = researchStatus.sources.slice(lastSourceCount);
          for (const source of newSources) {
            onSource(source);
          }
          lastSourceCount = researchStatus.sources.length;
        }
        if (researchStatus.status === "completed") {
          return researchStatus;
        }
        if (researchStatus.status === "failed") {
          throw new FirecrawlError(
            `Research job ${researchStatus.status}. Error: ${researchStatus.error}`,
            500
          );
        }
        if (researchStatus.status !== "processing") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
      return { success: false, error: "Research job terminated unexpectedly" };
    } catch (error) {
      throw new FirecrawlError(error.message, 500, error.response?.data?.details);
    }
  }
  /**
   * Initiates a deep research operation on a given query without polling.
   * @param params - Parameters for the deep research operation.
   * @returns The response containing the research job ID.
   */
  async asyncDeepResearch(query, params) {
    const headers = this.prepareHeaders();
    let jsonData = { query, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    if (jsonData?.jsonOptions?.schema) {
      jsonData = {
        ...jsonData,
        jsonOptions: {
          ...jsonData.jsonOptions,
          schema: zodSchemaToJsonSchema(jsonData.jsonOptions.schema)
        }
      };
    }
    try {
      const response = await this.postRequest(
        `${this.apiUrl}/v1/deep-research`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start deep research");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Checks the status of a deep research operation.
   * @param id - The ID of the deep research operation.
   * @returns The current status and results of the research operation.
   */
  async checkDeepResearchStatus(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/deep-research/${id}`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else if (response.status === 404) {
        throw new FirecrawlError("Deep research job not found", 404);
      } else {
        this.handleError(response, "check deep research status");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * @deprecated Use deepResearch() instead
   * Initiates a deep research operation on a given topic and polls until completion.
   * @param topic - The topic to research.
   * @param params - Parameters for the deep research operation.
   * @param onActivity - Optional callback to receive activity updates in real-time.
   * @returns The final research results.
   */
  async __deepResearch(topic, params, onActivity) {
    try {
      const response = await this.__asyncDeepResearch(topic, params);
      if (!response.success || "error" in response) {
        return { success: false, error: "error" in response ? response.error : "Unknown error" };
      }
      if (!response.id) {
        throw new FirecrawlError(`Failed to start research. No job ID returned.`, 500);
      }
      const jobId = response.id;
      let researchStatus;
      let lastActivityCount = 0;
      while (true) {
        researchStatus = await this.__checkDeepResearchStatus(jobId);
        if ("error" in researchStatus && !researchStatus.success) {
          return researchStatus;
        }
        if (onActivity && researchStatus.activities) {
          const newActivities = researchStatus.activities.slice(lastActivityCount);
          for (const activity of newActivities) {
            onActivity(activity);
          }
          lastActivityCount = researchStatus.activities.length;
        }
        if (researchStatus.status === "completed") {
          return researchStatus;
        }
        if (researchStatus.status === "failed") {
          throw new FirecrawlError(
            `Research job ${researchStatus.status}. Error: ${researchStatus.error}`,
            500
          );
        }
        if (researchStatus.status !== "processing") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
      return { success: false, error: "Research job terminated unexpectedly" };
    } catch (error) {
      throw new FirecrawlError(error.message, 500, error.response?.data?.details);
    }
  }
  /**
   * @deprecated Use asyncDeepResearch() instead
   * Initiates a deep research operation on a given topic without polling.
   * @param params - Parameters for the deep research operation.
   * @returns The response containing the research job ID.
   */
  async __asyncDeepResearch(topic, params) {
    const headers = this.prepareHeaders();
    try {
      let jsonData = { topic, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
      const response = await this.postRequest(
        `${this.apiUrl}/v1/deep-research`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start deep research");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * @deprecated Use checkDeepResearchStatus() instead
   * Checks the status of a deep research operation.
   * @param id - The ID of the deep research operation.
   * @returns The current status and results of the research operation.
   */
  async __checkDeepResearchStatus(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/deep-research/${id}`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else if (response.status === 404) {
        throw new FirecrawlError("Deep research job not found", 404);
      } else {
        this.handleError(response, "check deep research status");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Generates LLMs.txt for a given URL and polls until completion.
   * @param url - The URL to generate LLMs.txt from.
   * @param params - Parameters for the LLMs.txt generation operation.
   * @returns The final generation results.
   */
  async generateLLMsText(url2, params) {
    try {
      const response = await this.asyncGenerateLLMsText(url2, params);
      if (!response.success || "error" in response) {
        return { success: false, error: "error" in response ? response.error : "Unknown error" };
      }
      if (!response.id) {
        throw new FirecrawlError(`Failed to start LLMs.txt generation. No job ID returned.`, 500);
      }
      const jobId = response.id;
      let generationStatus;
      while (true) {
        generationStatus = await this.checkGenerateLLMsTextStatus(jobId);
        if ("error" in generationStatus && !generationStatus.success) {
          return generationStatus;
        }
        if (generationStatus.status === "completed") {
          return generationStatus;
        }
        if (generationStatus.status === "failed") {
          throw new FirecrawlError(
            `LLMs.txt generation job ${generationStatus.status}. Error: ${generationStatus.error}`,
            500
          );
        }
        if (generationStatus.status !== "processing") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
      return { success: false, error: "LLMs.txt generation job terminated unexpectedly" };
    } catch (error) {
      throw new FirecrawlError(error.message, 500, error.response?.data?.details);
    }
  }
  /**
   * Initiates a LLMs.txt generation operation without polling.
   * @param url - The URL to generate LLMs.txt from.
   * @param params - Parameters for the LLMs.txt generation operation.
   * @returns The response containing the generation job ID.
   */
  async asyncGenerateLLMsText(url2, params) {
    const headers = this.prepareHeaders();
    let jsonData = { url: url2, ...params, origin: typeof params.origin === "string" && params.origin.includes("mcp") ? params.origin : `js-sdk@${this.version}` };
    try {
      const response = await this.postRequest(
        `${this.apiUrl}/v1/llmstxt`,
        jsonData,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "start LLMs.txt generation");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Checks the status of a LLMs.txt generation operation.
   * @param id - The ID of the LLMs.txt generation operation.
   * @returns The current status and results of the generation operation.
   */
  async checkGenerateLLMsTextStatus(id) {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/llmstxt/${id}`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else if (response.status === 404) {
        throw new FirecrawlError("LLMs.txt generation job not found", 404);
      } else {
        this.handleError(response, "check LLMs.txt generation status");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Gets metrics about the team's scrape queue.
   * @returns The current queue status.
   */
  async getQueueStatus() {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/team/queue-status`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get queue status");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Gets current credit usage and billing period for the team (v1).
   */
  async getCreditUsage() {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/team/credit-usage`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get credit usage");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Gets current token usage and billing period for the team (v1).
   */
  async getTokenUsage() {
    const headers = this.prepareHeaders();
    try {
      const response = await this.getRequest(
        `${this.apiUrl}/v1/team/token-usage`,
        headers
      );
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get token usage");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Gets historical credit usage. Pass byApiKey=true to break down by API key.
   */
  async getCreditUsageHistorical(byApiKey) {
    const headers = this.prepareHeaders();
    try {
      const url2 = `${this.apiUrl}/v1/team/credit-usage/historical${byApiKey ? "?byApiKey=true" : ""}`;
      const response = await this.getRequest(url2, headers);
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get credit usage historical");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
  /**
   * Gets historical token usage. Pass byApiKey=true to break down by API key.
   */
  async getTokenUsageHistorical(byApiKey) {
    const headers = this.prepareHeaders();
    try {
      const url2 = `${this.apiUrl}/v1/team/token-usage/historical${byApiKey ? "?byApiKey=true" : ""}`;
      const response = await this.getRequest(url2, headers);
      if (response.status === 200) {
        return response.data;
      } else {
        this.handleError(response, "get token usage historical");
      }
    } catch (error) {
      if (error.response?.data?.error) {
        throw new FirecrawlError(`Request failed with status code ${error.response.status}. Error: ${error.response.data.error} ${error.response.data.details ? ` - ${JSON.stringify(error.response.data.details)}` : ""}`, error.response.status);
      } else {
        throw new FirecrawlError(error.message, 500);
      }
    }
    return { success: false, error: "Internal server error." };
  }
};
var CrawlWatcher = class extends e {
  static {
    __name(this, "CrawlWatcher");
  }
  ws;
  data;
  status;
  id;
  constructor(id, app) {
    super();
    this.id = id;
    const wsUrl = app.apiUrl.replace(/^http/, "ws");
    this.ws = new WebSocket(`${wsUrl}/v1/crawl/${id}`, app.apiKey);
    this.status = "scraping";
    this.data = [];
    const messageHandler = /* @__PURE__ */ __name((msg) => {
      if (msg.type === "done") {
        this.status = "completed";
        this.dispatchTypedEvent("done", new CustomEvent("done", {
          detail: {
            status: this.status,
            data: this.data,
            id: this.id
          }
        }));
      } else if (msg.type === "error") {
        this.status = "failed";
        this.dispatchTypedEvent("error", new CustomEvent("error", {
          detail: {
            status: this.status,
            data: this.data,
            error: msg.error,
            id: this.id
          }
        }));
      } else if (msg.type === "catchup") {
        this.status = msg.data.status;
        this.data.push(...msg.data.data ?? []);
        for (const doc of this.data) {
          this.dispatchTypedEvent("document", new CustomEvent("document", {
            detail: {
              ...doc,
              id: this.id
            }
          }));
        }
      } else if (msg.type === "document") {
        this.dispatchTypedEvent("document", new CustomEvent("document", {
          detail: {
            ...msg.data,
            id: this.id
          }
        }));
      }
    }, "messageHandler");
    this.ws.onmessage = ((ev) => {
      if (typeof ev.data !== "string") {
        this.ws.close();
        return;
      }
      try {
        const msg = JSON.parse(ev.data);
        messageHandler(msg);
      } catch (error) {
        console.error("Error on message", error);
      }
    }).bind(this);
    this.ws.onclose = ((ev) => {
      try {
        const msg = JSON.parse(ev.reason);
        messageHandler(msg);
      } catch (error) {
        console.error("Error on close", error);
      }
    }).bind(this);
    this.ws.onerror = ((_) => {
      this.status = "failed";
      this.dispatchTypedEvent("error", new CustomEvent("error", {
        detail: {
          status: this.status,
          data: this.data,
          error: "WebSocket error",
          id: this.id
        }
      }));
    }).bind(this);
  }
  close() {
    this.ws.close();
  }
};
var Firecrawl = class extends FirecrawlClient {
  static {
    __name(this, "Firecrawl");
  }
  /** Feature‑frozen v1 client (lazy). */
  _v1;
  _v1Opts;
  /** @param opts API credentials and base URL. */
  constructor(opts = {}) {
    super(opts);
    this._v1Opts = {
      apiKey: opts.apiKey,
      apiUrl: opts.apiUrl
    };
  }
  /** Access the legacy v1 client (instantiated on first access). */
  get v1() {
    if (!this._v1) this._v1 = new FirecrawlApp(this._v1Opts);
    return this._v1;
  }
};
var index_default = Firecrawl;

// src/lib/enrichment/providers/firecrawl-company.ts
var EXTRACT_TIMEOUT_MS = 3e4;
var CompanyExtractSchema = external_exports.object({
  headcount: external_exports.number().optional(),
  industry: external_exports.string().optional(),
  description: external_exports.string().optional(),
  yearFounded: external_exports.number().optional(),
  location: external_exports.string().optional(),
  name: external_exports.string().optional()
});
var EXTRACT_PROMPT = "Extract the company name, number of employees (as a number), industry, a one-paragraph description, year the company was founded, and headquarters location from this website.";
function getClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set");
  }
  return new index_default({ apiKey });
}
__name(getClient, "getClient");
var firecrawlCompanyAdapter = /* @__PURE__ */ __name(async (domain) => {
  const client = getClient();
  let result;
  try {
    result = await Promise.race([
      // The default Firecrawl export (v2 FirecrawlClient) bundles urls + params into one arg.
      // Cast schema to `any` — the Firecrawl SDK type uses its own bundled zod v4 ZodTypeAny
      // which is not assignable from our project's zod v3 types. At runtime this works fine.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.extract({
        urls: [`https://${domain}`],
        prompt: EXTRACT_PROMPT,
        schema: CompanyExtractSchema
      }),
      new Promise(
        (_, reject) => setTimeout(
          () => reject(new Error("Firecrawl extract timeout after 30s")),
          EXTRACT_TIMEOUT_MS
        )
      )
    ]);
  } catch (err) {
    console.error(`Firecrawl extract failed for domain "${domain}":`, err);
    throw err;
  }
  const data = result.data ?? {};
  return {
    name: data.name,
    industry: data.industry,
    headcount: data.headcount,
    description: data.description,
    yearFounded: data.yearFounded,
    location: data.location,
    source: "firecrawl",
    rawResponse: result,
    costUsd: PROVIDER_COSTS.firecrawl
  };
}, "firecrawlCompanyAdapter");

// src/lib/normalizer/index.ts
init_esm();

// src/lib/normalizer/industry.ts
init_esm();

// src/lib/normalizer/vocabulary.ts
init_esm();
var CANONICAL_VERTICALS = [
  "Accounting & Finance",
  "Architecture & Construction",
  "B2B SaaS",
  "Business Acquisitions",
  "Business Services",
  "E-Commerce & Retail",
  "Education & Training",
  "Energy & Utilities",
  "Healthcare & Life Sciences",
  "HR & Recruitment",
  "Insurance",
  "Legal Services",
  "Logistics & Supply Chain",
  "Managed Services & IT",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Professional Services",
  "Real Estate",
  "Staffing & Recruitment",
  "Telecoms",
  "Travel & Hospitality",
  "Other"
];
var SENIORITY_LEVELS = [
  "C-Suite",
  "VP",
  "Director",
  "Manager",
  "Senior IC",
  "IC",
  "Entry Level",
  "Unknown"
];

// src/lib/normalizer/industry.ts
var IndustrySchema = external_exports.object({
  canonical: external_exports.enum(CANONICAL_VERTICALS),
  confidence: external_exports.enum(["high", "medium", "low"])
});
async function classifyIndustry(raw) {
  if (!raw?.trim()) return null;
  const lower = raw.toLowerCase().trim();
  const exactMatch = CANONICAL_VERTICALS.find(
    (v) => v.toLowerCase() === lower
  );
  if (exactMatch) return exactMatch;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: IndustrySchema,
      prompt: `Map this industry/vertical to the closest canonical value from the list below.
Raw value: "${raw}"
Canonical verticals: ${CANONICAL_VERTICALS.join(", ")}
Return "Other" if no reasonable match exists. Set confidence to "low" if the match is a stretch.`
    });
    return object.confidence === "low" ? null : object.canonical;
  } catch (error) {
    console.error("Industry classification failed:", error);
    return null;
  }
}
__name(classifyIndustry, "classifyIndustry");

// src/lib/normalizer/company.ts
init_esm();

// src/lib/normalize.ts
init_esm();
function normalizeCompanyName(name) {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length <= 4 && trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }
  const domainSuffixes = [".com", ".ai", ".io", ".co"];
  let suffix = "";
  let base = trimmed;
  for (const ds of domainSuffixes) {
    if (trimmed.toLowerCase().endsWith(ds)) {
      suffix = ds;
      base = trimmed.slice(0, -ds.length);
      break;
    }
  }
  const isAllLower = base === base.toLowerCase();
  const isAllUpper = base === base.toUpperCase();
  if (!isAllLower && !isAllUpper) {
    return trimmed;
  }
  const words = base.split(/(\s+)/);
  const titleCased = words.map((word) => {
    if (/^\s+$/.test(word)) return word;
    const parts = word.split(/(-)/);
    return parts.map((part) => {
      if (part === "-") return part;
      if (part.length === 0) return part;
      const firstAlpha = part.search(/[a-zA-Z]/);
      if (firstAlpha === -1) return part;
      return part.slice(0, firstAlpha) + part.charAt(firstAlpha).toUpperCase() + part.slice(firstAlpha + 1).toLowerCase();
    }).join("");
  });
  return titleCased.join("") + suffix;
}
__name(normalizeCompanyName, "normalizeCompanyName");

// src/lib/normalizer/company.ts
var CompanyNameSchema = external_exports.object({
  canonical: external_exports.string().min(1).max(200),
  confidence: external_exports.enum(["high", "medium", "low"])
});
async function classifyCompanyName(raw) {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const ruleBased = normalizeCompanyName(trimmed);
  const isAllCaps = trimmed.length > 4 && trimmed === trimmed.toUpperCase();
  const hasNoiseWords = /\b(inc|corp|llc|ltd|gmbh|plc|pvt|pty|limited)\b/i.test(trimmed);
  const isGarbled = /[^a-zA-Z0-9\s\-.,&'()®™]/.test(trimmed);
  if (!isAllCaps && !hasNoiseWords && !isGarbled) {
    return ruleBased;
  }
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: CompanyNameSchema,
      prompt: `Clean up this company name. Remove legal suffixes (Inc, LLC, Ltd, Corp, GmbH, etc.), fix capitalization, and return the canonical company name as it would appear in professional communications.
Raw company name: "${trimmed}"
If the input is unrecognizable, return the best-effort cleanup. Set confidence to "low" if the result is a guess.`
    });
    return object.confidence === "low" ? ruleBased : object.canonical;
  } catch (error) {
    console.error("Company name classification failed:", error);
    return ruleBased;
  }
}
__name(classifyCompanyName, "classifyCompanyName");

// src/lib/normalizer/job-title.ts
init_esm();
var JobTitleSchema = external_exports.object({
  canonical: external_exports.string().min(1).max(200),
  seniority: external_exports.enum(SENIORITY_LEVELS),
  confidence: external_exports.enum(["high", "medium", "low"])
});
var SENIORITY_PATTERNS = [
  { pattern: /\b(ceo|cto|cfo|coo|cmo|cpo|cio|chief)\b/i, level: "C-Suite" },
  { pattern: /\bvp\b|\bvice.?president\b/i, level: "VP" },
  { pattern: /\bdirector\b/i, level: "Director" },
  { pattern: /\bmanager\b|\bhead of\b/i, level: "Manager" },
  { pattern: /\bsenior\b|\bsr\.?\b|\blead\b|\bprincipal\b/i, level: "Senior IC" },
  { pattern: /\bjunior\b|\bjr\.?\b|\bassociate\b|\bentry\b/i, level: "Entry Level" }
];
async function classifyJobTitle(raw) {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const isCleanTitle = trimmed.length < 60 && /^[a-zA-Z\s,\-&/.()]+$/.test(trimmed) && trimmed !== trimmed.toUpperCase();
  if (isCleanTitle) {
    for (const { pattern, level } of SENIORITY_PATTERNS) {
      if (pattern.test(trimmed)) {
        const canonical = trimmed.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        return { canonical, seniority: level };
      }
    }
  }
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: JobTitleSchema,
      prompt: `Extract a clean, canonical job title and seniority level from this raw job title.
Raw title: "${trimmed}"
Seniority levels: ${SENIORITY_LEVELS.join(", ")}
Return the title in standard professional form (e.g., "Chief Executive Officer", "VP of Sales", "Software Engineer"). Use "Unknown" seniority if unclear.`
    });
    return {
      canonical: object.canonical,
      seniority: object.seniority
    };
  } catch (error) {
    console.error("Job title classification failed:", error);
    return { canonical: trimmed, seniority: "Unknown" };
  }
}
__name(classifyJobTitle, "classifyJobTitle");

// src/lib/http-error.ts
init_esm();
function getHttpStatus(err) {
  if (err == null) return null;
  if (typeof err === "object" && "status" in err && typeof err.status === "number") {
    return err.status;
  }
  if (typeof err === "object" && "statusCode" in err && typeof err.statusCode === "number") {
    return err.statusCode;
  }
  return null;
}
__name(getHttpStatus, "getHttpStatus");
function isRateLimited(err) {
  return getHttpStatus(err) === 429;
}
__name(isRateLimited, "isRateLimited");

// src/lib/enrichment/waterfall.ts
function createCircuitBreaker() {
  return { consecutiveFailures: /* @__PURE__ */ new Map() };
}
__name(createCircuitBreaker, "createCircuitBreaker");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
function exponentialBackoff(attempt) {
  return Math.pow(2, attempt) * 1e3;
}
__name(exponentialBackoff, "exponentialBackoff");
var CIRCUIT_BREAKER_THRESHOLD = 5;
var MAX_RETRIES = 3;
var EMAIL_PROVIDERS = [
  { adapter: findymailAdapter, name: "findymail" },
  // $0.001 — cheapest first
  { adapter: prospeoAdapter, name: "prospeo" },
  // $0.002
  { adapter: leadmagicAdapter, name: "leadmagic" }
  // $0.005 — most expensive last
];
async function enrichEmail(personId, input, breaker, workspaceSlug) {
  const aiarkFailures = breaker.consecutiveFailures.get("aiark") ?? 0;
  if (aiarkFailures < CIRCUIT_BREAKER_THRESHOLD) {
    const aiarkShouldRun = await shouldEnrich(personId, "person", "aiark");
    if (aiarkShouldRun) {
      const capHit = await checkDailyCap();
      if (capHit) throw new Error("DAILY_CAP_HIT");
      let aiarkResult = null;
      let aiarkError = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          aiarkResult = await aiarkPersonAdapter(input);
          aiarkError = null;
          break;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const is429 = isRateLimited(err) || error.message.includes("429");
          if (is429 && attempt < MAX_RETRIES - 1) {
            await sleep(exponentialBackoff(attempt));
            continue;
          }
          aiarkError = error;
          break;
        }
      }
      if (aiarkError !== null) {
        await recordEnrichment({
          entityId: personId,
          entityType: "person",
          provider: "aiark",
          status: "error",
          errorMessage: aiarkError.message,
          costUsd: 0,
          workspaceSlug
        });
        breaker.consecutiveFailures.set("aiark", aiarkFailures + 1);
      } else if (aiarkResult && aiarkResult.costUsd > 0) {
        const hasPersonData = aiarkResult.firstName != null || aiarkResult.lastName != null || aiarkResult.jobTitle != null || aiarkResult.linkedinUrl != null || aiarkResult.location != null || aiarkResult.company != null || aiarkResult.companyDomain != null || aiarkResult.email != null;
        if (hasPersonData) {
          const personData = {};
          if (aiarkResult.firstName) personData.firstName = aiarkResult.firstName;
          if (aiarkResult.lastName) personData.lastName = aiarkResult.lastName;
          if (aiarkResult.jobTitle) personData.jobTitle = aiarkResult.jobTitle;
          if (aiarkResult.linkedinUrl) personData.linkedinUrl = aiarkResult.linkedinUrl;
          if (aiarkResult.location) personData.location = aiarkResult.location;
          if (aiarkResult.company) personData.company = aiarkResult.company;
          if (aiarkResult.companyDomain) personData.companyDomain = aiarkResult.companyDomain;
          if (aiarkResult.email) personData.email = aiarkResult.email;
          const aiarkFieldsWritten = await mergePersonData(personId, personData);
          await incrementDailySpend("aiark", aiarkResult.costUsd);
          await recordEnrichment({
            entityId: personId,
            entityType: "person",
            provider: "aiark",
            status: "success",
            fieldsWritten: aiarkFieldsWritten,
            costUsd: aiarkResult.costUsd,
            rawResponse: aiarkResult.rawResponse,
            workspaceSlug
          });
          breaker.consecutiveFailures.set("aiark", 0);
          const updatedPersonAiArk = await prisma.person.findUnique({ where: { id: personId } });
          if (updatedPersonAiArk) {
            if (updatedPersonAiArk.jobTitle) {
              try {
                const titleResult = await classifyJobTitle(updatedPersonAiArk.jobTitle);
                if (titleResult) {
                  const normalizedUpdates = {
                    jobTitle: titleResult.canonical
                  };
                  const existing = updatedPersonAiArk.enrichmentData ? (() => {
                    try {
                      return JSON.parse(updatedPersonAiArk.enrichmentData);
                    } catch {
                      return {};
                    }
                  })() : {};
                  normalizedUpdates.enrichmentData = JSON.stringify({
                    ...existing,
                    seniority: titleResult.seniority
                  });
                  await prisma.person.update({
                    where: { id: personId },
                    data: normalizedUpdates
                  });
                }
              } catch (err) {
                console.warn(`[waterfall] classifyJobTitle (aiark) failed for person ${personId}:`, err);
              }
            }
            if (aiarkFieldsWritten.includes("company") && updatedPersonAiArk.company) {
              try {
                const normalizedName = await classifyCompanyName(updatedPersonAiArk.company);
                if (normalizedName) {
                  await prisma.person.update({
                    where: { id: personId },
                    data: { company: normalizedName }
                  });
                }
              } catch (err) {
                console.warn(`[waterfall] classifyCompanyName (aiark) failed for person ${personId}:`, err);
              }
            }
          }
          if (aiarkResult.email) {
            return;
          }
        } else {
          await recordEnrichment({
            entityId: personId,
            entityType: "person",
            provider: "aiark",
            status: "success",
            fieldsWritten: [],
            costUsd: aiarkResult.costUsd,
            rawResponse: aiarkResult.rawResponse,
            workspaceSlug
          });
          breaker.consecutiveFailures.set("aiark", 0);
        }
      }
    }
  } else {
    console.warn(`[waterfall] Circuit breaker OPEN for aiark (${aiarkFailures} consecutive failures) — skipping person data step`);
  }
  const providers = input.linkedinUrl ? EMAIL_PROVIDERS : EMAIL_PROVIDERS.filter((p) => p.name !== "findymail");
  for (const { adapter: adapter2, name } of providers) {
    const failures = breaker.consecutiveFailures.get(name) ?? 0;
    if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.warn(`[waterfall] Circuit breaker OPEN for ${name} (${failures} consecutive failures) — skipping`);
      continue;
    }
    const shouldRun = await shouldEnrich(personId, "person", name);
    if (!shouldRun) {
      continue;
    }
    const capHit = await checkDailyCap();
    if (capHit) {
      throw new Error("DAILY_CAP_HIT");
    }
    let result = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await adapter2(input);
        lastError = null;
        break;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const is429 = isRateLimited(err) || error.message.includes("429");
        if (is429 && attempt < MAX_RETRIES - 1) {
          await sleep(exponentialBackoff(attempt));
          continue;
        }
        lastError = error;
        break;
      }
    }
    if (lastError !== null) {
      await recordEnrichment({
        entityId: personId,
        entityType: "person",
        provider: name,
        status: "error",
        errorMessage: lastError.message,
        costUsd: 0,
        workspaceSlug
      });
      breaker.consecutiveFailures.set(name, failures + 1);
      continue;
    }
    if (!result) continue;
    if (result.email === null) {
      await recordEnrichment({
        entityId: personId,
        entityType: "person",
        provider: name,
        status: "success",
        fieldsWritten: [],
        costUsd: result.costUsd,
        rawResponse: result.rawResponse,
        workspaceSlug
      });
      breaker.consecutiveFailures.set(name, 0);
      continue;
    }
    const personData = {
      email: result.email
    };
    if (result.firstName) personData.firstName = result.firstName;
    if (result.lastName) personData.lastName = result.lastName;
    if (result.jobTitle) personData.jobTitle = result.jobTitle;
    if (result.linkedinUrl) personData.linkedinUrl = result.linkedinUrl;
    if (result.location) personData.location = result.location;
    const fieldsWritten = await mergePersonData(personId, personData);
    await incrementDailySpend(name, result.costUsd);
    await recordEnrichment({
      entityId: personId,
      entityType: "person",
      provider: name,
      status: "success",
      fieldsWritten,
      costUsd: result.costUsd,
      rawResponse: result.rawResponse,
      workspaceSlug
    });
    breaker.consecutiveFailures.set(name, 0);
    const updatedPerson = await prisma.person.findUnique({ where: { id: personId } });
    if (updatedPerson) {
      if (updatedPerson.jobTitle) {
        try {
          const titleResult = await classifyJobTitle(updatedPerson.jobTitle);
          if (titleResult) {
            const normalizedUpdates = {
              jobTitle: titleResult.canonical
            };
            const existing = updatedPerson.enrichmentData ? (() => {
              try {
                return JSON.parse(updatedPerson.enrichmentData);
              } catch {
                return {};
              }
            })() : {};
            normalizedUpdates.enrichmentData = JSON.stringify({
              ...existing,
              seniority: titleResult.seniority
            });
            await prisma.person.update({
              where: { id: personId },
              data: normalizedUpdates
            });
          }
        } catch (err) {
          console.warn(`[waterfall] classifyJobTitle failed for person ${personId}:`, err);
        }
      }
      if (fieldsWritten.includes("company") && updatedPerson.company) {
        try {
          const normalizedName = await classifyCompanyName(updatedPerson.company);
          if (normalizedName) {
            await prisma.person.update({
              where: { id: personId },
              data: { company: normalizedName }
            });
          }
        } catch (err) {
          console.warn(`[waterfall] classifyCompanyName failed for person ${personId}:`, err);
        }
      }
    }
    return;
  }
}
__name(enrichEmail, "enrichEmail");
var COMPANY_PROVIDERS = [
  { adapter: aiarkAdapter, name: "aiark" },
  { adapter: firecrawlCompanyAdapter, name: "firecrawl" }
];
async function enrichCompany(domain, breaker, workspaceSlug) {
  let company = await prisma.company.findUnique({ where: { domain } });
  let companyDbId = company?.id ?? null;
  for (const { adapter: adapter2, name } of COMPANY_PROVIDERS) {
    const failures = breaker.consecutiveFailures.get(name) ?? 0;
    if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.warn(`[waterfall] Circuit breaker OPEN for ${name} (${failures} consecutive failures) — skipping`);
      continue;
    }
    if (companyDbId !== null) {
      const shouldRun = await shouldEnrich(companyDbId, "company", name);
      if (!shouldRun) {
        continue;
      }
    }
    const capHit = await checkDailyCap();
    if (capHit) {
      throw new Error("DAILY_CAP_HIT");
    }
    let result = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await adapter2(domain);
        lastError = null;
        break;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const is429 = isRateLimited(err) || error.message.includes("429");
        if (is429 && attempt < MAX_RETRIES - 1) {
          await sleep(exponentialBackoff(attempt));
          continue;
        }
        lastError = error;
        break;
      }
    }
    if (lastError !== null) {
      await recordEnrichment({
        entityId: companyDbId ?? domain,
        entityType: "company",
        provider: name,
        status: "error",
        errorMessage: lastError.message,
        costUsd: 0,
        workspaceSlug
      });
      breaker.consecutiveFailures.set(name, failures + 1);
      continue;
    }
    if (!result) continue;
    const hasData = result.name != null || result.industry != null || result.headcount != null || result.description != null || result.website != null || result.location != null || result.yearFounded != null;
    if (!hasData) {
      await recordEnrichment({
        entityId: companyDbId ?? domain,
        entityType: "company",
        provider: name,
        status: "success",
        fieldsWritten: [],
        costUsd: result.costUsd,
        rawResponse: result.rawResponse,
        workspaceSlug
      });
      breaker.consecutiveFailures.set(name, 0);
      continue;
    }
    if (company === null || companyDbId === null) {
      company = await prisma.company.create({
        data: { domain, name: result.name ?? domain }
      });
      companyDbId = company.id;
    }
    const companyData = {};
    if (result.name) companyData.name = result.name;
    if (result.industry) companyData.industry = result.industry;
    if (result.headcount) companyData.headcount = result.headcount;
    if (result.description) companyData.description = result.description;
    if (result.website) companyData.website = result.website;
    if (result.location) companyData.location = result.location;
    if (result.yearFounded) companyData.yearFounded = result.yearFounded;
    const fieldsWritten = await mergeCompanyData(domain, companyData);
    await incrementDailySpend(name, result.costUsd);
    await recordEnrichment({
      entityId: companyDbId,
      entityType: "company",
      provider: name,
      status: "success",
      fieldsWritten,
      costUsd: result.costUsd,
      rawResponse: result.rawResponse,
      workspaceSlug
    });
    breaker.consecutiveFailures.set(name, 0);
    if (fieldsWritten.includes("industry") && result.industry) {
      try {
        const canonical = await classifyIndustry(result.industry);
        if (canonical) {
          await prisma.company.update({
            where: { domain },
            data: { industry: canonical }
          });
        }
      } catch (err) {
        console.warn(`[waterfall] classifyIndustry failed for domain ${domain}:`, err);
      }
    }
    if (fieldsWritten.includes("name") && result.name) {
      try {
        const normalizedName = await classifyCompanyName(result.name);
        if (normalizedName) {
          await prisma.company.update({
            where: { domain },
            data: { name: normalizedName }
          });
        }
      } catch (err) {
        console.warn(`[waterfall] classifyCompanyName failed for domain ${domain}:`, err);
      }
    }
    return;
  }
}
__name(enrichCompany, "enrichCompany");

// trigger/enrichment-job-processor.ts
var prisma2 = new import_client.PrismaClient();
var enrichmentJobProcessorTask = schedules_exports.task({
  id: "enrichment-job-processor",
  cron: "0 6 * * *",
  // daily at 6am UTC — matches previous vercel.json schedule
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5e3,
    maxTimeoutInMs: 6e4
  },
  run: /* @__PURE__ */ __name(async () => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[${timestamp}] [enrichment-job-processor] Starting enrichment processing`);
    const breaker = createCircuitBreaker();
    const enrichFn = /* @__PURE__ */ __name(async (entityId, job) => {
      if (job.entityType === "person") {
        const person = await prisma2.person.findUniqueOrThrow({ where: { id: entityId } });
        await enrichEmail(
          entityId,
          {
            linkedinUrl: person.linkedinUrl ?? void 0,
            firstName: person.firstName ?? void 0,
            lastName: person.lastName ?? void 0,
            companyName: person.company ?? void 0,
            companyDomain: person.companyDomain ?? void 0
          },
          breaker,
          job.workspaceSlug ?? void 0
        );
      } else if (job.entityType === "company") {
        const company = await prisma2.company.findUniqueOrThrow({ where: { id: entityId } });
        await enrichCompany(company.domain, breaker, job.workspaceSlug ?? void 0);
      }
    }, "enrichFn");
    const results = [];
    let chunk = await processNextChunk(enrichFn);
    while (chunk) {
      results.push(chunk);
      if (chunk.done) break;
      chunk = await processNextChunk(enrichFn);
    }
    if (results.length === 0) {
      console.log(`[${timestamp}] [enrichment-job-processor] No pending jobs`);
      return { message: "no pending jobs" };
    }
    console.log(`[${timestamp}] [enrichment-job-processor] Complete: ${results.length} chunk(s) processed`);
    return { chunksProcessed: results.length, results };
  }, "run")
});
export {
  enrichmentJobProcessorTask
};
//# sourceMappingURL=enrichment-job-processor.mjs.map
