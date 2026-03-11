// --- Inbox Placement Testing Types ---

export type PlacementTestStatus = "pending" | "completed" | "failed" | "expired";

export type EmailHealthStatus = "healthy" | "warning" | "critical";

// Score thresholds for classifying placement test results
export const GOOD_THRESHOLD = 7;
export const WARNING_THRESHOLD = 5;

/**
 * Response from mail-tester.com API.
 * See: https://www.mail-tester.com/api
 */
export interface MailTesterResponse {
  id: string;
  score: number; // 0-10 scale
  details: MailTesterDetails;
}

export interface MailTesterDetails {
  // Spam score checks
  spam?: {
    score?: number;
    checks?: Record<string, unknown>;
  };
  // DKIM / SPF / DMARC
  dkim?: {
    pass?: boolean;
    domain?: string;
  };
  spf?: {
    pass?: boolean;
    record?: string;
  };
  dmarc?: {
    pass?: boolean;
    policy?: string;
  };
  // Subject/content analysis
  subject?: {
    score?: number;
    warnings?: string[];
  };
  // Blacklist checks
  blacklists?: {
    listed?: string[];
    clean?: string[];
  };
  // Raw extra data from API
  [key: string]: unknown;
}

/**
 * A sender that has been identified as recommended for inbox placement testing.
 * Criteria: bounce rate > 3% AND at least 20 emails sent.
 */
export interface RecommendedSender {
  senderEmail: string;
  senderDomain: string;
  workspaceSlug: string;
  bounceRate: number; // e.g. 0.045 = 4.5%
  emailsSent: number;
  lastTestAt?: Date | null; // From EmailSenderHealth if a test has been run
}
