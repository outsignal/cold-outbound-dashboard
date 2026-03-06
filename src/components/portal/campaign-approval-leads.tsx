"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, MessageSquare, ExternalLink, Loader2, Download, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LeadSample {
  personId: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  icpScore: number | null;
}

interface Props {
  campaignId: string;
  leads: LeadSample[];
  totalCount: number;
  leadsApproved: boolean;
  leadsFeedback: string | null;
  isPending: boolean;
}

export function CampaignApprovalLeads({
  campaignId,
  leads,
  totalCount,
  leadsApproved,
  leadsFeedback,
  isPending,
}: Props) {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = isPending && !leadsApproved;

  // Client-side pagination
  const pageSize = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, leads.length);
  const paginatedLeads = leads.slice(startIdx, endIdx);

  async function handleApprove() {
    if (!window.confirm(`Approve all ${leads.length} leads for this campaign?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}/approve-leads`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve leads");
      router.refresh();
    } catch {
      setError("Something went wrong approving the leads. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestChanges() {
    if (!feedback.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}/request-changes-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      setShowFeedback(false);
      setFeedback("");
      router.refresh();
    } catch {
      setError("Something went wrong submitting your feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Leads</CardTitle>
          {leadsApproved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Approved
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {leads.length >= totalCount
              ? `${totalCount.toLocaleString()} leads, ordered by ICP score`
              : `Showing top ${leads.length} of ${totalCount.toLocaleString()} leads, ordered by ICP score`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Previous feedback banner */}
        {leadsFeedback && !leadsApproved && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-sm">
            <p className="font-medium text-amber-800 mb-1">Changes Requested</p>
            <p className="text-amber-700">{leadsFeedback}</p>
          </div>
        )}

        {leads.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No leads linked to this campaign yet.
          </p>
        ) : (
          <>
            {/* Lead count banner */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border px-4 py-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  Showing <strong>{leads.length.toLocaleString()}</strong> of{" "}
                  <strong>{totalCount.toLocaleString()}</strong> leads, sorted by ICP score
                </span>
              </div>
              {totalCount > 500 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download full list
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden md:table-cell">LinkedIn</TableHead>
                    <TableHead className="text-right">ICP Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow key={lead.personId}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>{lead.jobTitle ?? "—"}</TableCell>
                      <TableCell>{lead.company ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.location ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.linkedinUrl ? (
                          <a
                            href={lead.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                          >
                            Profile <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.icpScore !== null ? (
                          <span
                            className={cn(
                              "font-medium",
                              lead.icpScore >= 70
                                ? "text-emerald-700"
                                : lead.icpScore >= 40
                                  ? "text-amber-700"
                                  : "text-gray-500",
                            )}
                          >
                            {lead.icpScore}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {leads.length > pageSize && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIdx + 1}–{endIdx} of {leads.length} leads
                  {leads.length < totalCount && (
                    <span className="ml-1">({totalCount.toLocaleString()} total)</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Approval buttons — only show when campaign is pending and leads not yet approved */}
        {canAct && leads.length > 0 && (
          <div className="mt-6 space-y-3">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={loading}
                variant="brand"
              >
                {loading && !showFeedback && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                Approve Leads
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFeedback(!showFeedback)}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
            </div>

            {showFeedback && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Describe what changes you'd like (e.g., 'too many US-based leads, need more UK')..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleRequestChanges}
                  disabled={loading || !feedback.trim()}
                  variant="brand"
                  size="sm"
                >
                  {loading && showFeedback && (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  )}
                  Submit Feedback
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
