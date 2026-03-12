import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/emailbison/client.ts
init_esm();

// src/lib/emailbison/types.ts
init_esm();
var EmailBisonError = class extends Error {
  constructor(code, statusCode, rawBody) {
    super(`EmailBison error ${code} (${statusCode})`);
    this.code = code;
    this.statusCode = statusCode;
    this.rawBody = rawBody;
    this.name = "EmailBisonError";
  }
  static {
    __name(this, "EmailBisonError");
  }
};

// src/lib/emailbison/client.ts
var EmailBisonApiError = class extends Error {
  constructor(status, body) {
    super(`Email Bison API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.name = "EmailBisonApiError";
  }
  static {
    __name(this, "EmailBisonApiError");
  }
};
var RateLimitError = class extends EmailBisonApiError {
  constructor(retryAfter) {
    super(429, `Rate limited. Retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
  }
  static {
    __name(this, "RateLimitError");
  }
};
var EmailBisonClient = class _EmailBisonClient {
  constructor(token) {
    this.baseUrl = "https://app.outsignal.ai/api";
    this.token = token;
  }
  static {
    __name(this, "EmailBisonClient");
  }
  static {
    this.RETRYABLE_STATUSES = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
  }
  static {
    this.MAX_RETRIES = 3;
  }
  static {
    this.BASE_DELAY_MS = 1e3;
  }
  async request(endpoint, options) {
    const { revalidate = 300, ...fetchOptions } = options ?? {};
    let lastError = null;
    for (let attempt = 1; attempt <= _EmailBisonClient.MAX_RETRIES; attempt++) {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...fetchOptions?.headers
        },
        next: { revalidate }
      });
      if (res.ok) {
        return res.json();
      }
      if (!_EmailBisonClient.RETRYABLE_STATUSES.has(res.status)) {
        const body2 = (await res.text()).slice(0, 500);
        throw new EmailBisonApiError(res.status, body2);
      }
      const body = (await res.text()).slice(0, 500);
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        lastError = new RateLimitError(Number(retryAfter) || 60);
      } else {
        lastError = new EmailBisonApiError(res.status, body);
      }
      if (attempt < _EmailBisonClient.MAX_RETRIES) {
        const delayMs = _EmailBisonClient.BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[EmailBison] Request to ${endpoint} failed with ${res.status} (attempt ${attempt}/${_EmailBisonClient.MAX_RETRIES}). Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }
  async getAllPages(endpoint) {
    let page = 1;
    const allData = [];
    const first = await this.request(
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`
    );
    allData.push(...first.data);
    const lastPage = first.meta.last_page;
    while (page < lastPage) {
      page++;
      const response = await this.request(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`
      );
      allData.push(...response.data);
    }
    return allData;
  }
  async getPages(endpoint, maxPages) {
    let page = 1;
    const allData = [];
    const first = await this.request(
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`
    );
    allData.push(...first.data);
    const lastPage = Math.min(first.meta.last_page, maxPages);
    while (page < lastPage) {
      page++;
      const response = await this.request(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`
      );
      allData.push(...response.data);
    }
    return allData;
  }
  async getCampaigns() {
    return this.getAllPages("/campaigns");
  }
  async getReplies() {
    return this.getAllPages("/replies");
  }
  async getRecentReplies(maxPages = 2) {
    return this.getPages("/replies", maxPages);
  }
  async getLeads() {
    return this.getAllPages("/leads");
  }
  async getSenderEmails() {
    return this.getAllPages("/sender-emails");
  }
  async getTags() {
    return this.getAllPages("/tags");
  }
  async getSequenceSteps(campaignId) {
    return this.getAllPages(
      `/campaigns/${campaignId}/sequence-steps`
    );
  }
  async createSequenceStep(campaignId, step) {
    const res = await this.request(
      `/campaigns/${campaignId}/sequence-steps`,
      {
        method: "POST",
        body: JSON.stringify({
          position: step.position,
          subject: step.subject,
          body: step.body,
          delay_days: step.delay_days ?? 1
        }),
        revalidate: 0
      }
    );
    return res.data;
  }
  async testConnection() {
    try {
      await this.request("/campaigns?page=1");
      return true;
    } catch {
      return false;
    }
  }
  async createCampaign(params) {
    const res = await this.request("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        type: params.type ?? "outbound",
        max_emails_per_day: params.maxEmailsPerDay ?? 1e3,
        max_new_leads_per_day: params.maxNewLeadsPerDay ?? 100,
        plain_text: params.plainText ?? true
      }),
      revalidate: 0
    });
    return res.data;
  }
  // Note: name param is IGNORED by API — always produces "Copy of {original}"
  async duplicateCampaign(templateCampaignId) {
    const res = await this.request(
      `/campaigns/${templateCampaignId}/duplicate`,
      { method: "POST", body: JSON.stringify({}), revalidate: 0 }
    );
    return res.data;
  }
  async createLead(params) {
    const body = {
      email: params.email
    };
    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.jobTitle) body.title = params.jobTitle;
    if (params.company) body.company = params.company;
    if (params.phone) body.phone = params.phone;
    if (params.customVariables?.length) {
      body.custom_variables = params.customVariables;
    }
    const res = await this.request("/leads", {
      method: "POST",
      body: JSON.stringify(body),
      revalidate: 0
    });
    return res.data;
  }
  async getCustomVariables() {
    return this.getAllPages("/custom-variables");
  }
  async createCustomVariable(name) {
    const res = await this.request("/custom-variables", {
      method: "POST",
      body: JSON.stringify({ name }),
      revalidate: 0
    });
    return res.data;
  }
  async ensureCustomVariables(names) {
    const existing = await this.getCustomVariables();
    const existingNames = new Set(existing.map((v) => v.name));
    for (const name of names) {
      if (!existingNames.has(name)) {
        await this.createCustomVariable(name);
      }
    }
  }
  async pauseCampaign(campaignId) {
    const res = await this.request(
      `/campaigns/${campaignId}/pause`,
      { method: "PATCH", body: JSON.stringify({}), revalidate: 0 }
    );
    return res.data;
  }
  async resumeCampaign(campaignId) {
    const res = await this.request(
      `/campaigns/${campaignId}/resume`,
      { method: "PATCH", body: JSON.stringify({}), revalidate: 0 }
    );
    return res.data;
  }
  async removeSenderFromCampaign(campaignId, senderEmailId) {
    await this.request(
      `/campaigns/${campaignId}/remove-sender-emails`,
      {
        method: "DELETE",
        body: JSON.stringify({ sender_email_ids: [senderEmailId] }),
        revalidate: 0
      }
    );
  }
  async patchSenderEmail(senderEmailId, params) {
    const res = await this.request(
      `/sender-emails/${senderEmailId}`,
      {
        method: "PATCH",
        body: JSON.stringify(params),
        headers: { "Content-Type": "application/json" },
        revalidate: 0
      }
    );
    return res.data;
  }
  /**
   * Fetch a single reply by ID.
   */
  async getReply(replyId) {
    const res = await this.request(`/replies/${replyId}`, {
      revalidate: 0
    });
    return res.data;
  }
  /**
   * Fetch one page of replies for inbox pagination.
   * Unlike getReplies()/getRecentReplies(), this returns a single page so callers control pagination.
   */
  async getRepliesPage(page = 1) {
    return this.request(`/replies?page=${page}`, {
      revalidate: 0
    });
  }
  /**
   * Send a reply to an existing reply thread.
   * Validated against live API on 2026-03-11.
   *
   * @param replyId - ID of the reply to respond to (the parent reply)
   * @param params - Must include sender_email_id and either message/reply_template_id
   *                 and either to_emails or reply_all:true
   * @throws EmailBisonError with code "UNEXPECTED_RESPONSE" if response shape is unexpected
   */
  async sendReply(replyId, params) {
    const response = await this.request(
      `/replies/${replyId}/reply`,
      {
        method: "POST",
        body: JSON.stringify(params),
        revalidate: 0
      }
    );
    if (typeof response?.data?.success !== "boolean" || typeof response?.data?.message !== "string") {
      throw new EmailBisonError(
        "UNEXPECTED_RESPONSE",
        200,
        JSON.stringify(response)
      );
    }
    return response;
  }
};

export {
  EmailBisonClient
};
//# sourceMappingURL=chunk-HYVNS55X.mjs.map
