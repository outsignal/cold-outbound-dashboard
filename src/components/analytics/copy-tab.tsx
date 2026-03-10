"use client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CopyTabProps {
  workspace: string | null;
  period: string;
  vertical: string | null;
}

// ---------------------------------------------------------------------------
// Component (placeholder — fleshed out in Task 2)
// ---------------------------------------------------------------------------

export function CopyTab({ workspace, period, vertical }: CopyTabProps) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Copy analysis loading... (workspace: {workspace ?? "all"}, period:{" "}
        {period}, vertical: {vertical ?? "all"})
      </p>
    </div>
  );
}
