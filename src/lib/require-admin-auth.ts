import { cookies } from "next/headers";
import {
  verifyAdminSession,
  ADMIN_COOKIE_NAME,
  type AdminSession,
} from "./admin-auth";

/**
 * Verify admin session from cookies inside an API route handler.
 * Returns the session if valid, null otherwise.
 */
export async function requireAdminAuth(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifyAdminSession(cookie);
}
