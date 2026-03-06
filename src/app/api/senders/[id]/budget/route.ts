import { NextResponse } from "next/server";
import { getSenderBudget } from "@/lib/linkedin/rate-limiter";
import { requireAdminAuth } from "@/lib/require-admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const budget = await getSenderBudget(id);

  if (!budget) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }

  return NextResponse.json(budget);
}
