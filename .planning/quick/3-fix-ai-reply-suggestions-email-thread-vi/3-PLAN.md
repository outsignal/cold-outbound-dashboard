---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/webhooks/emailbison/route.ts
  - src/components/portal/email-thread-view.tsx
  - src/components/portal/email-thread-list.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Incoming reply webhooks generate AI suggested replies that persist to the Reply.aiSuggestedReply column"
    - "AI suggestion card renders in the thread view when aiSuggestedReply data exists"
    - "Email thread view has comfortable spacing between message cards and a visual separator above the reply composer"
    - "Thread list rows have visual hierarchy with distinct subject vs snippet styling"
  artifacts:
    - path: "src/app/api/webhooks/emailbison/route.ts"
      provides: "Lightweight AI reply suggestion using direct Haiku call instead of heavy writer agent"
    - path: "src/components/portal/email-thread-view.tsx"
      provides: "Polished thread view with better spacing and composer separator"
    - path: "src/components/portal/email-thread-list.tsx"
      provides: "Thread list with improved visual hierarchy"
  key_links:
    - from: "src/app/api/webhooks/emailbison/route.ts"
      to: "Reply.aiSuggestedReply"
      via: "prisma.reply.update after generateReplySuggestion"
      pattern: "aiSuggestedReply.*suggestion"
---

<objective>
Fix AI reply suggestions not being generated and polish the email thread view UI.

Purpose: AI suggestions have never worked in production (0 replies with aiSuggestedReply populated). The root cause is that generateReplySuggestion() uses the full writer agent (Opus, 10-step tool chain, structured JSON output) which is massive overkill for a simple reply suggestion. It likely times out, errors, or produces output that doesn't match the extraction logic. Additionally, the thread view and thread list need spacing/visual polish.

Output: Working AI reply suggestions on every incoming reply webhook + polished thread UI.
</objective>

<execution_context>
@/Users/jjay/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jjay/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/webhooks/emailbison/route.ts
@src/components/portal/email-thread-view.tsx
@src/components/portal/email-thread-list.tsx
@src/lib/agents/writer.ts
@src/lib/agents/runner.ts
@src/lib/agents/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace writer agent with lightweight Haiku call for reply suggestions</name>
  <files>src/app/api/webhooks/emailbison/route.ts</files>
  <action>
Replace the `generateReplySuggestion()` function (lines 67-98) with a direct Anthropic API call using Haiku instead of the full writer agent. The current approach uses Opus with 10 tool-call steps (KB search, workspace intelligence, campaign performance, etc.) which is extreme overkill for generating a simple conversational reply.

New implementation:
1. Import `generateText` from "ai" and `anthropic` from "@ai-sdk/anthropic" at the top of the file (alongside existing imports).
2. Replace the function body to use `generateText` directly with `claude-haiku-4-5-20251001` model.
3. System prompt: "You are a helpful sales reply assistant. Write a brief, conversational response to an incoming email. Keep it under 70 words, sound human and natural, reference what they said, and move the conversation forward. Use a soft question CTA. No em dashes. No spintax. No merge variables."
4. User message: include the lead name/email, subject, their reply body, and whether they're marked interested.
5. Extract `result.text` directly as the suggestion string (no JSON parsing needed).
6. Wrap in try/catch, return null on failure (non-blocking, same as current).
7. Add a console.log on success: `[webhook] AI suggestion generated for ${leadEmail} (${result.text.length} chars)`

This avoids: the full writer agent import, AgentRun audit record creation, 10-step tool chain, Opus model cost, structured JSON output parsing. The suggestion is fire-and-forget background work -- Haiku is fast and cheap.

Keep everything else in the webhook handler unchanged. The .then() chain at lines 493-517 that posts to Slack and persists to Reply.aiSuggestedReply remains as-is.
  </action>
  <verify>
    npx tsc --noEmit --pretty 2>&1 | head -30
    grep -n "generateText\|anthropic\|haiku" src/app/api/webhooks/emailbison/route.ts
  </verify>
  <done>generateReplySuggestion uses direct Haiku call, compiles without errors, no writer agent dependency</done>
</task>

<task type="auto">
  <name>Task 2: Polish email thread view spacing and thread list visual hierarchy</name>
  <files>src/components/portal/email-thread-view.tsx, src/components/portal/email-thread-list.tsx</files>
  <action>
**email-thread-view.tsx changes:**

1. Message card spacing: Change `space-y-3` (line 303) to `space-y-4` on the messages container for more breathing room between cards.
2. Message card body padding: Change `p-4` (line 157) to `px-4 py-5` for more vertical breathing room in message bodies.
3. Add visual separator above reply composer: On the composer wrapper div (line 328, `<div className="shrink-0">`), add a top border: `className="shrink-0 border-t border-border"`.
4. Thread header: Change `py-3` (line 272) to `py-4` for slightly more padding.

**email-thread-list.tsx changes:**

1. Thread row padding: Change `py-3` (line 126) to `py-3.5` for slightly more vertical space per row.
2. Subject line styling: Change the subject `<p>` (line 165) from `text-xs text-muted-foreground` to `text-xs font-medium text-foreground/80` so it's visually distinct from the snippet below it.
3. Snippet styling: Keep the snippet `<p>` (line 171) as `text-xs text-muted-foreground` (already correct -- lighter than subject).
4. Tags row: Change `mt-1` (line 176) to `mt-1.5` for a tiny bit more space before the tags.

These are all Tailwind class changes, no logic changes.
  </action>
  <verify>
    npx tsc --noEmit --pretty 2>&1 | head -30
  </verify>
  <done>Thread view has comfortable spacing between messages, visual separator above composer, thread list has distinct subject vs snippet styling</done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes
2. The generateReplySuggestion function no longer imports from `@/lib/agents/writer`
3. The function uses `claude-haiku-4-5-20251001` model directly
4. Thread view has `space-y-4` on messages container and `border-t` on composer wrapper
5. Thread list subject has `font-medium text-foreground/80` distinguishing it from snippet
</verification>

<success_criteria>
- AI reply suggestion function uses lightweight Haiku call (not full writer agent)
- TypeScript compiles cleanly
- Thread view message cards have more vertical breathing room
- Reply composer has a visible top border separator
- Thread list subject and snippet lines are visually distinct
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-ai-reply-suggestions-email-thread-vi/3-SUMMARY.md`
</output>
