import { describe, it, expect } from "vitest";

// ── 1. tokens ───────────────────────────────────────────────────────────────
import { generateProposalToken } from "@/lib/tokens";

describe("generateProposalToken", () => {
  it("returns a base64url string (only [A-Za-z0-9_-])", () => {
    const token = generateProposalToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns a 32-character string (24 bytes -> base64url)", () => {
    const token = generateProposalToken();
    expect(token).toHaveLength(32);
  });

  it("returns unique tokens on successive calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateProposalToken()));
    expect(tokens.size).toBe(50);
  });
});

// ── 2. proposal-templates ───────────────────────────────────────────────────
import {
  PACKAGE_LABELS,
  DEFAULT_PRICING,
  getTemplate,
  formatPence,
  PAYMENT_TERMS,
  DISCLAIMER,
} from "@/lib/proposal-templates";

describe("PACKAGE_LABELS", () => {
  it("has email, linkedin, and email_linkedin keys", () => {
    expect(PACKAGE_LABELS).toHaveProperty("email");
    expect(PACKAGE_LABELS).toHaveProperty("linkedin");
    expect(PACKAGE_LABELS).toHaveProperty("email_linkedin");
  });

  it("maps to human-readable label strings", () => {
    expect(typeof PACKAGE_LABELS.email).toBe("string");
    expect(typeof PACKAGE_LABELS.linkedin).toBe("string");
    expect(typeof PACKAGE_LABELS.email_linkedin).toBe("string");
  });
});

describe("DEFAULT_PRICING", () => {
  const packages = ["email", "linkedin", "email_linkedin"] as const;

  it.each(packages)(
    "has setupFee, platformCost, and retainerCost for '%s'",
    (pkg) => {
      const pricing = DEFAULT_PRICING[pkg];
      expect(pricing).toBeDefined();
      expect(pricing).toHaveProperty("setupFee");
      expect(pricing).toHaveProperty("platformCost");
      expect(pricing).toHaveProperty("retainerCost");
      expect(typeof pricing.setupFee).toBe("number");
      expect(typeof pricing.platformCost).toBe("number");
      expect(typeof pricing.retainerCost).toBe("number");
    },
  );

  it("contains the expected values for each package", () => {
    expect(DEFAULT_PRICING.email).toEqual({
      setupFee: 0,
      platformCost: 45000,
      retainerCost: 105000,
    });
    expect(DEFAULT_PRICING.linkedin).toEqual({
      setupFee: 150000,
      platformCost: 35000,
      retainerCost: 85000,
    });
    expect(DEFAULT_PRICING.email_linkedin).toEqual({
      setupFee: 150000,
      platformCost: 80000,
      retainerCost: 190000,
    });
  });
});

describe("getTemplate", () => {
  it('returns an array with 1 template for "email"', () => {
    const templates = getTemplate("email");
    expect(templates).toHaveLength(1);
    expect(templates[0].label).toBe("Email Outbound");
  });

  it('returns an array with 1 template for "linkedin"', () => {
    const templates = getTemplate("linkedin");
    expect(templates).toHaveLength(1);
    expect(templates[0].label).toBe("LinkedIn Outbound");
  });

  it('returns an array with 2 templates for "email_linkedin"', () => {
    const templates = getTemplate("email_linkedin");
    expect(templates).toHaveLength(2);
    expect(templates[0].label).toBe("Email Outbound");
    expect(templates[1].label).toBe("LinkedIn Outbound");
  });

  it("returns the default (email) template for an unknown package type", () => {
    const templates = getTemplate("unknown");
    expect(templates).toHaveLength(1);
    expect(templates[0].label).toBe("Email Outbound");
  });

  it("each template has the required shape", () => {
    const template = getTemplate("email")[0];
    expect(template).toHaveProperty("label");
    expect(template).toHaveProperty("proposalIntro");
    expect(template).toHaveProperty("setupTitle");
    expect(template).toHaveProperty("setupDetails");
    expect(template).toHaveProperty("ongoingTitle");
    expect(template).toHaveProperty("ongoingDetails");
    expect(template).toHaveProperty("deliverables");
    expect(template).toHaveProperty("platformFees");
    expect(Array.isArray(template.setupDetails)).toBe(true);
    expect(Array.isArray(template.ongoingDetails)).toBe(true);
    expect(Array.isArray(template.deliverables)).toBe(true);
  });
});

describe("formatPence", () => {
  it("formats 10000 pence as £100", () => {
    expect(formatPence(10000)).toBe("£100");
  });

  it("formats 0 pence as £0", () => {
    expect(formatPence(0)).toBe("£0");
  });

  it("formats 45000 pence as £450", () => {
    expect(formatPence(45000)).toBe("£450");
  });

  it("formats large amounts with comma grouping", () => {
    // 150000 pence = £1,500
    expect(formatPence(150000)).toBe("£1,500");
  });

  it("always returns a string starting with £", () => {
    expect(formatPence(1)).toMatch(/^£/);
    expect(formatPence(99999)).toMatch(/^£/);
  });
});

describe("PAYMENT_TERMS", () => {
  it("is a non-empty string", () => {
    expect(typeof PAYMENT_TERMS).toBe("string");
    expect(PAYMENT_TERMS.length).toBeGreaterThan(0);
  });
});

describe("DISCLAIMER", () => {
  it("is a non-empty string", () => {
    expect(typeof DISCLAIMER).toBe("string");
    expect(DISCLAIMER.length).toBeGreaterThan(0);
  });
});

// ── 3. utils (cn) ───────────────────────────────────────────────────────────
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class name strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional (falsy) values", () => {
    expect(cn("base", false && "hidden", "end")).toBe("base end");
  });

  it("handles undefined and null values gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("resolves tailwind conflicts via twMerge (last wins)", () => {
    // twMerge should keep the last conflicting utility
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles arrays of class names via clsx", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("handles object syntax via clsx", () => {
    expect(cn({ hidden: true, visible: false }, "base")).toBe("hidden base");
  });
});
