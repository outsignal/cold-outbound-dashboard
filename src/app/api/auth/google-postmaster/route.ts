/**
 * Initiates Google Postmaster OAuth flow.
 * GET /api/auth/google-postmaster -- redirects to Google consent screen
 */

import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/postmaster/client";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
