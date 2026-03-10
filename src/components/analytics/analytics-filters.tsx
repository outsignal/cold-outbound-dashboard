"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsFiltersProps {
  workspace: string | null;
  period: string;
  onWorkspaceChange: (w: string | null) => void;
  onPeriodChange: (p: string) => void;
  vertical?: string | null;
  onVerticalChange?: (v: string | null) => void;
  showVertical?: boolean;
}

interface WorkspaceOption {
  slug: string;
  name: string;
  vertical?: string | null;
}

// ---------------------------------------------------------------------------
// Toggle chip (reused pattern from replies page)
// ---------------------------------------------------------------------------

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none",
        active
          ? "bg-brand text-brand-foreground border-brand-strong"
          : "bg-secondary text-muted-foreground border-border hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIODS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All time", value: "all" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsFilters({
  workspace,
  period,
  onWorkspaceChange,
  onPeriodChange,
  vertical,
  onVerticalChange,
  showVertical = false,
}: AnalyticsFiltersProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [verticals, setVerticals] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((data: WorkspaceOption[] | { workspaces: WorkspaceOption[] }) => {
        const list = Array.isArray(data) ? data : data.workspaces ?? [];
        setWorkspaces(list);

        // Extract unique verticals from workspace data
        const uniqueVerticals = Array.from(
          new Set(
            list
              .map((ws) => ws.vertical)
              .filter((v): v is string => v != null && v !== ""),
          ),
        ).sort();
        setVerticals(uniqueVerticals);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Workspace selector */}
      <Select
        value={workspace || "all"}
        onValueChange={(val) => onWorkspaceChange(val === "all" ? null : val)}
      >
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="All workspaces" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All workspaces</SelectItem>
          {workspaces.map((ws) => (
            <SelectItem key={ws.slug} value={ws.slug}>
              {ws.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vertical selector (only shown on Copy tab) */}
      {showVertical && onVerticalChange && (
        <Select
          value={vertical || "all"}
          onValueChange={(val) =>
            onVerticalChange(val === "all" ? null : val)
          }
        >
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="All verticals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verticals</SelectItem>
            {verticals.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Time period chips */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground mr-1">Period:</span>
        {PERIODS.map((p) => (
          <ToggleChip
            key={p.value}
            label={p.label}
            active={period === p.value}
            onClick={() => onPeriodChange(p.value)}
          />
        ))}
      </div>
    </div>
  );
}
