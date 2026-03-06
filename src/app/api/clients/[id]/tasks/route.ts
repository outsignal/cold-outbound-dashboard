import { NextRequest, NextResponse } from "next/server";
import { addTask } from "@/lib/clients/operations";
import { requireAdminAuth } from "@/lib/require-admin-auth";

// POST /api/clients/[id]/tasks — add a new task
// Body: { stage, title, dueDate? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.stage || !body.title) {
      return NextResponse.json(
        { error: "stage and title are required" },
        { status: 400 },
      );
    }

    const task = await addTask(id, body);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients/[id]/tasks] Error:", err);
    return NextResponse.json(
      { error: "Failed to add task" },
      { status: 500 },
    );
  }
}
