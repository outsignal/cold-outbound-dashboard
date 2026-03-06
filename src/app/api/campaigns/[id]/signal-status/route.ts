import { NextResponse } from "next/server";
import { updateCampaignStatus, getCampaign } from "@/lib/campaigns/operations";
import { requireAdminAuth } from "@/lib/require-admin-auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action?: "pause" | "resume" | "archive" };

    if (!action || !["pause", "resume", "archive"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'pause', 'resume', or 'archive'" },
        { status: 400 },
      );
    }

    // Verify this is a signal campaign
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.type !== "signal") {
      return NextResponse.json(
        { error: "This endpoint is for signal campaigns only" },
        { status: 400 },
      );
    }

    const statusMap: Record<string, string> = {
      pause: "paused",
      resume: "active",
      archive: "archived",
    };

    const updated = await updateCampaignStatus(id, statusMap[action]);

    return NextResponse.json({ campaign: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
