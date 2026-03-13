/**
 * Extension authentication — stateless HMAC-signed tokens for Chrome extension.
 *
 * Tokens are scoped to a workspace + sender pair with 7-day expiry.
 * Uses the same HMAC-SHA256 pattern as admin-auth.ts.
 *
 * Env var required: EXTENSION_TOKEN_SECRET
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

const TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface ExtensionSession {
  role: "extension";
  workspaceSlug: string;
  senderId: string; // "" = workspace-scoped (not yet sender-scoped)
  exp: number; // unix timestamp (seconds)
}

function getSecret(): string {
  const secret = process.env.EXTENSION_TOKEN_SECRET;
  if (!secret) throw new Error("EXTENSION_TOKEN_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Sign a session object and return a `payload.signature` token.
 */
export function signExtensionToken(session: ExtensionSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

/**
 * Verify and decode a `payload.signature` token.
 * Returns null if signature is invalid or token is expired.
 */
export function verifyExtensionToken(token: string): ExtensionSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expected = sign(payload);

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    const session: ExtensionSession = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8"),
    );

    if (session.role !== "extension") return null;
    if (session.exp < Date.now() / 1000) return null;

    return session;
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper — creates a 7-day token for a workspace + sender pair.
 * Pass senderId as "" for a workspace-scoped token (login step, before sender selection).
 */
export function createExtensionToken(
  workspaceSlug: string,
  senderId: string,
): string {
  const session: ExtensionSession = {
    role: "extension",
    workspaceSlug,
    senderId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL,
  };
  return signExtensionToken(session);
}

/**
 * Extract and verify the Bearer token from an Authorization header.
 * Returns the decoded session or null if missing/invalid/expired.
 */
export function getExtensionSession(
  request: NextRequest,
): ExtensionSession | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) return null;

  return verifyExtensionToken(token);
}

/**
 * Build CORS headers for extension endpoints.
 * Restricts Access-Control-Allow-Origin to chrome-extension:// origins only.
 * Returns "*" as a fallback for preflight requests without an Origin header.
 */
export function extensionCorsHeaders(request?: NextRequest): Record<string, string> {
  let allowedOrigin = "";
  const origin = request?.headers.get("origin");

  if (origin && origin.startsWith("chrome-extension://")) {
    allowedOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "chrome-extension://",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...(allowedOrigin ? { "Vary": "Origin" } : {}),
  };
}

/**
 * Ensure a sender has an inviteToken, generating one if null.
 * Called lazily when viewing sender cards.
 */
export async function ensureSenderInviteToken(senderId: string): Promise<string> {
  // Dynamic import to avoid circular dependency at module level
  const { prisma } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");

  const sender = await prisma.sender.findUnique({
    where: { id: senderId },
    select: { inviteToken: true },
  });

  if (sender?.inviteToken) {
    return sender.inviteToken;
  }

  const newToken = randomUUID();
  await prisma.sender.update({
    where: { id: senderId },
    data: { inviteToken: newToken },
  });
  return newToken;
}
