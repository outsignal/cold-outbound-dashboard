// Classification taxonomy for cold outreach reply analysis

export const INTENTS = [
  "interested",
  "meeting_booked",
  "objection",
  "referral",
  "not_now",
  "unsubscribe",
  "out_of_office",
  "auto_reply",
  "not_relevant",
] as const;

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export const OBJECTION_SUBTYPES = [
  "budget",
  "timing",
  "competitor",
  "authority",
  "need",
  "trust",
] as const;

export type Intent = (typeof INTENTS)[number];
export type Sentiment = (typeof SENTIMENTS)[number];
export type ObjectionSubtype = (typeof OBJECTION_SUBTYPES)[number];

export type ClassificationResult = {
  intent: Intent;
  sentiment: Sentiment;
  objectionSubtype: ObjectionSubtype | null;
  summary: string;
};

export const INTENT_LABELS: Record<Intent, string> = {
  interested: "Interested",
  meeting_booked: "Meeting Booked",
  objection: "Objection",
  referral: "Referral",
  not_now: "Not Now",
  unsubscribe: "Unsubscribe",
  out_of_office: "Out of Office",
  auto_reply: "Auto Reply",
  not_relevant: "Not Relevant",
};

export const INTENT_COLORS: Record<Intent, string> = {
  interested: "bg-green-100 text-green-800",
  meeting_booked: "bg-emerald-100 text-emerald-800",
  objection: "bg-red-100 text-red-800",
  referral: "bg-blue-100 text-blue-800",
  not_now: "bg-amber-100 text-amber-800",
  unsubscribe: "bg-rose-100 text-rose-800",
  out_of_office: "bg-gray-100 text-gray-600",
  auto_reply: "bg-gray-100 text-gray-600",
  not_relevant: "bg-slate-100 text-slate-600",
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-800",
};
