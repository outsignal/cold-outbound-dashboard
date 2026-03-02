"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  UserPlus,
  Trash2,
  ArrowRight,
  Search,
  Building2,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PIPELINE_STATUSES } from "@/lib/clients/task-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  name: string;
  pipelineStatus: string;
  contactEmail: string | null;
  contactName: string | null;
  website: string | null;
  companyOverview: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

function getStatusConfig(status: string) {
  return PIPELINE_STATUSES.find((s) => s.value === status) ?? {
    value: status,
    label: status,
    color: "#87909e",
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  onStatusChange,
}: {
  status: string;
  onStatusChange: (newStatus: string) => void;
}) {
  const config = getStatusConfig(status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
          style={{
            backgroundColor: `${config.color}20`,
            color: config.color,
          }}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PIPELINE_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className="flex items-center gap-2"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Skeleton Rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="border-border">
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-32" />
          </TableCell>
          <TableCell>
            <div className="h-5 bg-muted rounded-full animate-pulse w-24" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-40" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-28" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-36" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-16" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 bg-muted rounded animate-pulse w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    contactName: "",
    website: "",
    companyOverview: "",
    notes: "",
  });

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients?isPipeline=true");
      const json = await res.json();
      setProspects(Array.isArray(json) ? json : json.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  // ─── Filtered data ───────────────────────────────────────────────────────

  const filtered = prospects.filter((p) => {
    if (statusFilter !== "all" && p.pipelineStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchEmail = p.contactEmail?.toLowerCase().includes(q);
      const matchContact = p.contactName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchContact) return false;
    }
    return true;
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function handleStatusChange(id: string, newStatus: string) {
    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pipelineStatus: newStatus } : p))
    );

    try {
      await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: newStatus }),
      });

      if (newStatus === "closed_won") {
        const prospect = prospects.find((p) => p.id === id);
        const shouldConvert = confirm(
          `"${prospect?.name}" has been marked as Closed Won. Would you like to convert them to a full client now?`
        );
        if (shouldConvert) {
          router.push(`/clients/${id}`);
        }
      }
    } catch {
      // Revert on error
      fetchProspects();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setProspects((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
    } catch {
      fetchProspects();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          pipelineStatus: "new_lead",
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setFormData({
          name: "",
          contactEmail: "",
          contactName: "",
          website: "",
          companyOverview: "",
          notes: "",
        });
        fetchProspects();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleConvertToClient(id: string) {
    router.push(`/clients/${id}`);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      <Header
        title="Pipeline"
        description="Track prospects through the sales funnel"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Prospect
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Prospect</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactEmail: e.target.value,
                        }))
                      }
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactName: e.target.value,
                        }))
                      }
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://acme.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyOverview">Company Overview</Label>
                  <Textarea
                    id="companyOverview"
                    value={formData.companyOverview}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyOverview: e.target.value,
                      }))
                    }
                    placeholder="Brief description of the company..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Internal notes about this prospect..."
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adding..." : "Add Prospect"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PIPELINE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search prospects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>

          {!loading && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} prospect{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <SkeletonRows />
                ) : filtered.length > 0 ? (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="font-medium text-sm">
                        {p.pipelineStatus === "closed_won" ? (
                          <a
                            href={`/clients/${p.id}`}
                            className="hover:underline text-foreground"
                          >
                            {p.name}
                          </a>
                        ) : (
                          p.name
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={p.pipelineStatus}
                          onStatusChange={(newStatus) =>
                            handleStatusChange(p.id, newStatus)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.contactEmail || "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.contactName || "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {p.website ? (
                          <a
                            href={p.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-foreground"
                          >
                            {p.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          "\u2014"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeTime(p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/clients/${p.id}`)}
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleConvertToClient(p.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Convert to Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(p.id, p.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">
                          {search || statusFilter !== "all"
                            ? "No prospects match your filters."
                            : "No prospects yet. Add your first one to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
