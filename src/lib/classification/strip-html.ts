/**
 * Convert HTML body to plain text, preserving line breaks.
 * Used as a fallback when EmailBison's text_body is null.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n") // Preserve line breaks
    .replace(/<\/p>/gi, "\n\n") // Paragraph breaks
    .replace(/<[^>]+>/g, "") // Strip all tags
    .replace(/&amp;/g, "&") // Decode common entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}
