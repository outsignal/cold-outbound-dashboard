import { NextResponse } from "next/server";
import { getDeployHistory } from "@/lib/campaigns/deploy";
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
  const deploys = await getDeployHistory(id);
  return NextResponse.json({ deploys });
}
