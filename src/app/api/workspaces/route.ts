import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/workspaces — list all DB workspaces with billing fields
// Used by the financials UI to populate workspace dropdowns
export async function GET() {
  try {
    const workspaces = await prisma.workspace.findMany({
      select: {
        slug: true,
        name: true,
        status: true,
        billingRetainerPence: true,
        billingPlatformFeePence: true,
        invoiceTaxRate: true,
        billingCompanyName: true,
        billingClientEmail: true,
        invoicePrefix: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error("[GET /api/workspaces] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 },
    );
  }
}
