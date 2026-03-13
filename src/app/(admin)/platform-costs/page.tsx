"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

// ---- Types ------------------------------------------------------------------

interface PlatformCostRecord {
  id: string;
  service: string;
  label: string;
  monthlyCost: number;
  notes: string | null;
  category: string;
  client: string | null;
  url: string | null;
  updatedAt: string;
}

interface CostData {
  services: PlatformCostRecord[];
  totalMonthly: number;
  byCategory: Record<string, number>;
  byClient: Record<string, number>;
}

// ---- Constants --------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "oklch(0.714 0.143 215.221)", // blue
  api: "oklch(0.82 0.148 68)",                   // amber
  email: "oklch(0.845 0.143 155)",                // green
  tools: "oklch(0.714 0.143 310)",                // purple
};

const CATEGORY_ORDER = ["tools", "api", "email", "infrastructure"];

function fmtGbp(amount: number): string {
  return `\u00A3${amount.toFixed(2)}`;
}

// ---- Sub-components ---------------------------------------------------------

function SummaryCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <Card density="compact">
      <CardContent>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-2xl font-bold ${accent ? "text-brand-strong" : ""}`}>
          {value}
        </p>
        {detail && (
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card density="compact" className="animate-pulse">
      <CardContent>
        <div className="h-3 bg-muted rounded w-24 mb-3" />
        <div className="h-7 bg-muted rounded w-32" />
      </CardContent>
    </Card>
  );
}

// ---- Inline Editable Cell ---------------------------------------------------

function EditableCell({
  value,
  type,
  onSave,
}: {
  value: string;
  type: "number" | "text";
  onSave: (newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Sync external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void commit();
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0" : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="h-7 w-24 text-sm px-1.5"
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors inline-flex items-center gap-1"
    >
      {type === "number" ? fmtGbp(parseFloat(value) || 0) : value || "-"}
      {saved && (
        <Check className="h-3.5 w-3.5 text-emerald-500 animate-in fade-in duration-300" />
      )}
    </span>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function PlatformCostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform-costs");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as CostData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async (
    id: string,
    field: "monthlyCost" | "notes",
    rawValue: string
  ) => {
    const payload: Record<string, unknown> = { id };
    if (field === "monthlyCost") {
      const parsed = parseFloat(rawValue);
      if (isNaN(parsed) || parsed < 0) throw new Error("Invalid amount");
      payload.monthlyCost = parsed;
    } else {
      payload.notes = rawValue;
    }

    const res = await fetch("/api/platform-costs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }

    const updated = (await res.json()) as PlatformCostRecord;

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s) =>
        s.id === id ? { ...s, ...updated } : s
      );
      const totalMonthly = services.reduce(
        (sum, s) => sum + s.monthlyCost,
        0
      );
      const byCategory: Record<string, number> = {};
      const byClient: Record<string, number> = {};
      for (const s of services) {
        byCategory[s.category] =
          (byCategory[s.category] ?? 0) + s.monthlyCost;
        const ck = s.client ?? "shared";
        byClient[ck] = (byClient[ck] ?? 0) + s.monthlyCost;
      }
      return { services, totalMonthly, byCategory, byClient };
    });
  };

  // Group services by category in defined order
  const grouped: Array<{
    category: string;
    subtotal: number;
    items: PlatformCostRecord[];
  }> = [];

  if (data) {
    for (const cat of CATEGORY_ORDER) {
      const items = data.services.filter((s) => s.category === cat);
      if (items.length > 0) {
        grouped.push({
          category: cat,
          subtotal: items.reduce((sum, s) => sum + s.monthlyCost, 0),
          items,
        });
      }
    }
    // Any categories not in CATEGORY_ORDER
    const knownCats = new Set(CATEGORY_ORDER);
    const otherItems = data.services.filter((s) => !knownCats.has(s.category));
    if (otherItems.length > 0) {
      grouped.push({
        category: "other",
        subtotal: otherItems.reduce((sum, s) => sum + s.monthlyCost, 0),
        items: otherItems,
      });
    }
  }

  const sharedTotal = data?.byClient?.shared ?? 0;
  const clientTotal = (data?.totalMonthly ?? 0) - sharedTotal;
  const serviceCount = data?.services.length ?? 0;

  return (
    <div>
      <Header
        title="Platform Costs"
        description="Monthly service expenses (GBP)"
      />

      <div className="p-6 space-y-6">
        {/* Error state */}
        {error && (
          <ErrorBanner
            message={`Failed to load data: ${error}`}
            onRetry={() => void fetchData()}
          />
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : data ? (
            <>
              <SummaryCard
                label="Total Monthly Burn"
                value={fmtGbp(data.totalMonthly)}
                accent
              />
              <SummaryCard
                label="Shared Costs"
                value={fmtGbp(sharedTotal)}
                detail="Services not tied to a client"
              />
              <SummaryCard
                label="Client-Specific"
                value={fmtGbp(clientTotal)}
                detail={`${Object.keys(data.byClient).filter((k) => k !== "shared").length} clients`}
              />
              <SummaryCard
                label="Services"
                value={String(serviceCount)}
                detail={`${Object.keys(data.byCategory).length} categories`}
              />
            </>
          ) : null}
        </div>

        {/* Services table */}
        {!loading && data && (
          <Card density="compact">
            <CardHeader className="border-b">
              <CardTitle className="text-sm">All Services</CardTitle>
            </CardHeader>
            <CardContent className="!px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-4 py-2">Service</th>
                    <th className="text-left px-4 py-2">Client</th>
                    <th className="text-right px-4 py-2">Monthly Cost</th>
                    <th className="text-left px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <>
                      {/* Category header row */}
                      <tr
                        key={`cat-${group.category}`}
                        className="bg-muted/30"
                      >
                        <td
                          colSpan={2}
                          className="px-4 py-1.5 text-xs uppercase text-muted-foreground font-medium tracking-wide"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[group.category] ?? "oklch(0.5 0 0)",
                              }}
                            />
                            {group.category}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-xs text-muted-foreground text-right font-medium">
                          {fmtGbp(group.subtotal)}
                        </td>
                        <td />
                      </tr>

                      {/* Service rows */}
                      {group.items.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[row.category] ?? "oklch(0.5 0 0)",
                                }}
                              />
                              {row.url ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline text-foreground"
                                >
                                  {row.label}
                                </a>
                              ) : (
                                <span>{row.label}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {row.client ? (
                              <span className="text-xs font-mono text-muted-foreground">
                                {row.client}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Shared
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <EditableCell
                              value={String(row.monthlyCost)}
                              type="number"
                              onSave={(v) =>
                                handleSave(row.id, "monthlyCost", v)
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <EditableCell
                              value={row.notes ?? ""}
                              type="text"
                              onSave={(v) => handleSave(row.id, "notes", v)}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
