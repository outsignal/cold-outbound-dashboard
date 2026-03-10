"use client";

import type { Template } from "./copy-tab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateDetailPanelProps {
  template: Template | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component (placeholder — fleshed out in Task 3)
// ---------------------------------------------------------------------------

export function TemplateDetailPanel({
  template,
  onClose,
}: TemplateDetailPanelProps) {
  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button onClick={onClose}>Close</button>
      <p>{template.subjectLine}</p>
    </div>
  );
}
