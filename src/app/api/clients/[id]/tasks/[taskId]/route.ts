import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/clients/operations";
import { requireAdminAuth } from "@/lib/require-admin-auth";

// PATCH /api/clients/[id]/tasks/[taskId] — update task (title, status, dueDate, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const body = await request.json();

    const task = await updateTask(taskId, body);

    return NextResponse.json({ task });
  } catch (err) {
    console.error("[PATCH /api/clients/[id]/tasks/[taskId]] Error:", err);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

// DELETE /api/clients/[id]/tasks/[taskId] — delete task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const session = await requireAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;

    await deleteTask(taskId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]/tasks/[taskId]] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
