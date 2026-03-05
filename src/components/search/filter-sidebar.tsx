"use client";

import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface FilterSidebarProps {
  verticals: string[];
  workspaces: string[];
  selectedVerticals: string[];
  selectedEnrichment: string;
  selectedWorkspace: string;
  companyFilter: string;
  onVerticalToggle: (vertical: string) => void;
  onEnrichmentChange: (value: string) => void;
  onWorkspaceChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
}

const ENRICHMENT_OPTIONS = [
  { value: "", label: "All" },
  { value: "full", label: "Enriched" },
  { value: "partial", label: "Partial" },
  { value: "missing", label: "Missing" },
];

const ENRICHMENT_COLORS: Record<string, string> = {
  full: "oklch(0.696 0.17 162.48)",    // emerald-500
  partial: "oklch(0.95 0.15 110)",     // brand
  missing: "oklch(0.577 0.245 27.325)", // destructive
};

export function FilterSidebar({
  verticals,
  workspaces,
  selectedVerticals,
  selectedEnrichment,
  selectedWorkspace,
  companyFilter,
  onVerticalToggle,
  onEnrichmentChange,
  onWorkspaceChange,
  onCompanyChange,
}: FilterSidebarProps) {
  const [companyInput, setCompanyInput] = useState(companyFilter);
  const [mobileOpen, setMobileOpen] = useState(false);

  const debouncedCompanyChange = useDebouncedCallback((value: string) => {
    onCompanyChange(value);
  }, 300);

  const activeFilterCount =
    selectedVerticals.length +
    (selectedEnrichment ? 1 : 0) +
    (selectedWorkspace ? 1 : 0) +
    (companyFilter ? 1 : 0);

  const filterContent = (
    <>
      {/* Vertical filter */}
      {verticals.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Vertical
          </h3>
          <div className="space-y-1.5">
            {verticals.map((vertical) => {
              const checked = selectedVerticals.includes(vertical);
              return (
                <label
                  key={vertical}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onVerticalToggle(vertical)}
                    className="w-3.5 h-3.5 rounded border-border bg-background text-brand accent-brand cursor-pointer"
                  />
                  <span
                    className={`text-sm truncate ${
                      checked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {vertical}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-border" />

      {/* Enrichment status filter */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Enrichment
        </h3>
        <div className="space-y-1.5">
          {ENRICHMENT_OPTIONS.map((opt) => {
            const isSelected = selectedEnrichment === opt.value;
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="enrichment"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => onEnrichmentChange(opt.value)}
                  className="w-3.5 h-3.5 border-border bg-background accent-brand cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  {opt.value && (
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ENRICHMENT_COLORS[opt.value] }}
                    />
                  )}
                  <span
                    className={`text-sm ${
                      isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Workspace filter */}
      {workspaces.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Workspace
          </h3>
          <select
            value={selectedWorkspace}
            onChange={(e) => onWorkspaceChange(e.target.value)}
            className="w-full bg-background border border-border text-sm text-foreground rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
          >
            <option value="">All workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws} value={ws}>
                {ws}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-t border-border" />

      {/* Company sub-filter */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Company
        </h3>
        <input
          type="text"
          value={companyInput}
          onChange={(e) => {
            setCompanyInput(e.target.value);
            debouncedCompanyChange(e.target.value);
          }}
          placeholder="Filter by company..."
          className="w-full bg-background border border-border text-sm text-foreground placeholder-muted-foreground rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 flex-shrink-0 space-y-6">
        {filterContent}
      </aside>

      {/* Mobile filter toggle button */}
      <div className="md:hidden flex-shrink-0">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md bg-secondary text-foreground hover:bg-muted transition-colors"
        >
          {mobileOpen ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5" />
          )}
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-brand-foreground text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Mobile expandable filter panel */}
        {mobileOpen && (
          <div className="mt-3 p-4 border border-border rounded-lg bg-card space-y-6">
            {filterContent}
          </div>
        )}
      </div>
    </>
  );
}
