"use client";

import type { Template } from "./copy-tab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopTemplatesListProps {
  templates: Template[];
  total: number;
  onSelectTemplate: (t: Template | null) => void;
}

// ---------------------------------------------------------------------------
// Component (placeholder — fleshed out in Task 3)
// ---------------------------------------------------------------------------

export function TopTemplatesList({
  templates,
  total,
  onSelectTemplate,
}: TopTemplatesListProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {templates.length} of {total} templates
      </p>
    </div>
  );
}
