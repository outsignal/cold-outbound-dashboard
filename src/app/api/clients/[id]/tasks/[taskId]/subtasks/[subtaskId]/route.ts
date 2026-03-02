import { NextRequest, NextResponse } from "next/server";
import { updateSubtaskStatus } from "@/lib/clients/operations";

// PATCH /api/clients/[id]/tasks/[taskId]/subtasks/[subtaskId] — update subtask status
// Body: { status: "todo" | "in_progress" | "complete" }
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; taskId: string; subtaskId: string }>;
  },
) {
  try {
    const { subtaskId } = await params;
    const body = await request.json();

    if (!body.status || !["todo", "in_progress", "complete"].includes(body.status)) {
      return NextResponse.json(
        { error: "status must be one of: todo, in_progress, complete" },
        { status: 400 },
      );
    }

    const subtask = await updateSubtaskStatus(subtaskId, body.status);

    return NextResponse.json({ subtask });
  } catch (err) {
    console.error(
      "[PATCH /api/clients/[id]/tasks/[taskId]/subtasks/[subtaskId]] Error:",
      err,
    );
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 },
    );
  }
}
