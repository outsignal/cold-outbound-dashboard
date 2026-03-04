import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { prisma } from "@/lib/db";

// GET /api/portal/invoices — returns non-draft invoices for the authenticated portal user's workspace
export async function GET() {
  try {
    const { workspaceSlug } = await getPortalSession();

    const invoices = await prisma.invoice.findMany({
      where: {
        workspaceSlug,
        status: { not: "draft" },
      },
      include: { lineItems: true },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    if (
      message === "No portal session cookie" ||
      message === "Invalid or expired portal session"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/portal/invoices] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
