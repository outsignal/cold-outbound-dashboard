import { cookies } from "next/headers";
import {
  verifySession,
  COOKIE_NAME,
  type PortalSession,
} from "./portal-auth";

/**
 * Verify portal session from cookies inside an API route handler.
 * Returns the session if valid, null otherwise.
 */
export async function requirePortalAuth(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySession(cookie);
}
