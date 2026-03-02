"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Upload, ChevronDown, ChevronUp, FileText } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedDocumentFields {
  clientName?: string;
  clientEmail?: string;
  companyOverview?: string;
  packageType?: string;
  setupFee?: number;
  platformCost?: number;
  retainerCost?: number;
}

interface DocumentUploadProps {
  onParsed: (parsed: ParsedDocumentFields, raw: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentUpload({ onParsed }: DocumentUploadProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- PDF file upload ----
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10 MB.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to parse PDF");
      }

      const { parsed, raw } = await res.json();
      onParsed(parsed, raw);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setLoading(false);
    }
  }

  // ---- Google Doc URL ----
  async function handleGoogleDocParse() {
    if (!googleDocUrl.trim()) {
      setError("Please enter a Google Doc URL.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleDocUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to fetch Google Doc");
      }

      const { parsed, raw } = await res.json();
      onParsed(parsed, raw);
      setGoogleDocUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Google Doc");
    } finally {
      setLoading(false);
    }
  }

  // ---- Raw text paste ----
  async function handleTextParse() {
    if (!pastedText.trim()) {
      setError("Please paste some text content.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", text: pastedText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to parse text");
      }

      const { parsed, raw } = await res.json();
      onParsed(parsed, raw);
      setPastedText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse text");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Import from Document
            </CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {!expanded && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a PDF, paste a Google Doc URL, or paste text to auto-fill a proposal
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* PDF Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">PDF File</Label>
            <div className="flex items-center gap-2">
              <label
                htmlFor="doc-file"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
                Click to upload PDF
                <input
                  ref={fileInputRef}
                  id="doc-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google Doc URL */}
          <div className="space-y-2">
            <Label htmlFor="doc-gdoc-url" className="text-sm font-medium">
              Google Doc URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="doc-gdoc-url"
                type="url"
                placeholder="https://docs.google.com/document/d/..."
                value={googleDocUrl}
                onChange={(e) => setGoogleDocUrl(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleDocParse}
                disabled={loading || !googleDocUrl.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Parse"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Document must be set to &quot;Anyone with the link can view&quot;
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Raw text paste */}
          <div className="space-y-2">
            <Label htmlFor="doc-paste" className="text-sm font-medium">
              Paste Text Content
            </Label>
            <Textarea
              id="doc-paste"
              placeholder="Paste document content here..."
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleTextParse}
              disabled={loading || !pastedText.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse Text"
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
