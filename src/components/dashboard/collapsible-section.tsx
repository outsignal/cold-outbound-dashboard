"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  id: string;
  title: string;
  collapsedSummary?: ReactNode;
  defaultCollapsed?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "dashboard-sections";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStore(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function writeStore(store: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollapsibleSection({
  id,
  title,
  collapsedSummary,
  defaultCollapsed = false,
  actions,
  children,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const store = readStore();
    if (id in store) {
      setCollapsed(store[id]);
    }
    setMounted(true);
  }, [id]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      const store = readStore();
      store[id] = next;
      writeStore(store);
      return next;
    });
  }, [id]);

  // Before hydration, use the default to avoid layout shift
  const isCollapsed = mounted ? collapsed : defaultCollapsed;
  const isOpen = !isCollapsed;

  return (
    <div>
      {/* Header bar */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-3 bg-card border rounded-lg px-4 py-3",
          "cursor-pointer select-none transition-colors hover:bg-accent/50",
        )}
      >
        {/* Title */}
        <span className="text-sm font-semibold">{title}</span>

        {/* Collapsed summary — only visible when collapsed */}
        {isCollapsed && collapsedSummary && (
          <span className="text-sm text-muted-foreground truncate">
            {collapsedSummary}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Actions (e.g. chart legends) — stop click propagation so buttons inside work */}
        {actions && (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
            className="flex items-center gap-2"
          >
            {actions}
          </span>
        )}

        {/* Chevron */}
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </button>

      {/* Collapsible body */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
