# Agent Framework Deep Audit

**Analysis Date:** 2026-03-05

---

## 1. Agent Architecture

### Pattern Overview
The agent framework follows a **hub-and-spoke orchestrator pattern** built on top of the Vercel AI SDK (`ai` package) with Anthropic Claude models. The orchestrator delegates specialized tasks to child agents via tool calls.

### Core Files
- `src/lib/agents/types.ts` -- Type definitions for all agent inputs, outputs, and shared types
- `src/lib/agents/runner.ts` -- Core execution engine (single entry point for all agents)
- `src/lib/agents/orchestrator.ts` -- Hub agent with delegation tools + dashboard tools
- `src/lib/agents/research.ts` -- Website analysis and ICP extraction agent
- `src/lib/agents/writer.ts` -- Email/LinkedIn copy generation agent
- `src/lib/agents/leads.ts` -- Lead discovery, list management, scoring agent
- `src/lib/agents/campaign.ts` -- Campaign lifecycle management agent
- `src/lib/agents/shared-tools.ts` -- Shared `searchKnowledgeBase` tool used by multiple agents

### Execution Flow
```
User Input (CLI chat / Dashboard chat / API route)
    |
    v
Orchestrator (claude-sonnet-4-20250514, maxSteps: 12)
    |-- Direct tools: listWorkspaces, getWorkspaceInfo, getCampaigns, getReplies, etc.
    |-- Delegation tools:
        |-- delegateToResearch -> runResearchAgent() -> runAgent(researchConfig, ...)
        |-- delegateToWriter   -> runWriterAgent()   -> runAgent(writerConfig, ...)
        |-- delegateToLeads    -> runLeadsAgent()     -> runAgent(leadsConfig, ...)
        |-- delegateToCampaign -> runCampaignAgent()  -> runAgent(campaignConfig, ...)
            |
            v
        runAgent() [runner.ts]:
          1. Create AgentRun DB record (status: "running")
          2. Call generateText() with agent config (model, systemPrompt, tools, maxSteps)
          3. Extract tool call steps from result
          4. Parse structured JSON output from response text
          5. Update AgentRun DB record (status: "complete" or "failed")
          6. Return AgentRunResult<TOutput>
```

---

## 2. Agent Types & Capabilities

| Agent | Model | maxSteps | Purpose | Tools Count |
|-------|-------|----------|---------|-------------|
| **Orchestrator** | claude-sonnet-4-20250514 | 12 | Central coordinator, delegates to specialists | 4 delegation + 10 dashboard |
| **Research** | claude-opus-4-20250514 | 8 | Website crawling, ICP extraction, business intelligence | 6 |
| **Writer** | claude-opus-4-20250514 | 10 | Email/LinkedIn copy generation, revision, reply suggestions | 9 |
| **Leads** | claude-sonnet-4-20250514 | 15 | People search, list management, discovery, scoring, export | 12 |
| **Campaign** | claude-sonnet-4-20250514 | 10 | Campaign CRUD, signal campaigns, status transitions, publishing | 8 |

All agent types defined in `types.ts` have corresponding implementations. No phantom agent types.

---

## 3. Tool Definitions

All tools use Zod schemas via the AI SDK's `tool()` function. Schemas are well-described with `.describe()` annotations on every parameter. Input validation is handled automatically by Zod.

**Total tools across all agents: ~50+** (14 orchestrator, 6 research, 9 writer, 15 leads, 8 campaign, with `searchKnowledgeBase` shared).

All tools are fully implemented. No referenced-but-unimplemented tools found.

---

## 4. Prompt Engineering

### Prompt Sizes
- **Orchestrator**: ~88 lines / ~4,000+ tokens. Comprehensive delegation routing guide.
- **Research**: ~68 lines. Strong emphasis on distinguishing client from partners.
- **Writer**: **~210 lines** -- the largest prompt. 4 copy strategy blocks, 10 mandatory quality rules, tiered KB consultation, signal-aware rules, reply mode.
- **Leads**: ~97 lines. Mandatory 4-step discovery workflow with cost awareness.
- **Campaign**: ~52 lines. Package enforcement + workflow guides.

### Contradictions Found (MEDIUM severity)
- `scripts/generate-copy.ts` line 209 says "Body: under 100 words" but `src/lib/agents/writer.ts` line 441 says "All emails under 70 words"
- `scripts/generate-copy.ts` line 210 uses `{{firstName}}` (double braces) but the main writer prompt forbids double braces, mandating `{FIRSTNAME}` (single braces, uppercase)

---

## 5. Context & Memory

### CLI Chat (`scripts/chat.ts`)
- Maintains `messages: ModelMessage[]` across the session
- Full history passed to every `generateText` call
- **No context window management** -- long sessions will hit token limits and crash

### Dashboard Chat (`src/app/api/chat/route.ts`)
- Uses `convertToModelMessages` + `streamText`
- Same lack of context window management

### Sub-Agent Calls (`src/lib/agents/runner.ts`)
- **Single-turn only**: Each sub-agent receives exactly one user message
- No conversation history between orchestrator and sub-agent
- Context must be entirely self-contained in the task string

### **Severity: HIGH**
No truncation, summarization, or sliding window for long sessions.

---

## 6. Error Handling

### What's in place
- `runner.ts`: try/catch logs error to AgentRun DB record, then re-throws
- Orchestrator delegation tools: catch errors, return `{ status: "failed", error: "..." }` gracefully
- Research Agent: sends Slack notification on failure via `notify()`

### What's missing
- **No retry logic** for transient API failures (rate limits, 5xx)
- **No timeout handling** on `generateText` calls
- **No circuit breaker** for external services (Firecrawl, Apollo, etc.)
- **Only Research Agent sends failure notifications** -- Writer, Leads, Campaign do not

### **Severity: MEDIUM**

---

## 7. Knowledge Base Integration

### Architecture
- `src/lib/knowledge/store.ts` -- Core store (ingest, search, re-embed)
- `src/lib/knowledge/embeddings.ts` -- OpenAI `text-embedding-3-small` (1536d)
- `src/lib/agents/shared-tools.ts` -- Wraps as AI SDK tool

### RAG Implementation
1. Documents chunked at ~800 chars (max 1200) on paragraph boundaries
2. Primary search: pgvector cosine similarity. Fallback: keyword matching
3. All agents share the same `searchKnowledgeBase` tool

### Quality Gaps
- No chunk overlap between adjacent chunks
- No relevance threshold -- all top-K results returned regardless of similarity score
- Tags use simple `LIKE` matching (no structured metadata)

### Writer KB Consultation Pattern (excellent)
3-step tiered lookup: strategy+industry -> strategy-only -> general best practices

### **Severity: LOW**

---

## 8. API Key / Model Configuration

### Models
- Orchestrator, Leads, Campaign: `claude-sonnet-4-20250514`
- Research, Writer: `claude-opus-4-20250514`
- ICP extraction (campaign.ts): `claude-haiku-4-5` (cost-efficient)
- Embeddings: OpenAI `text-embedding-3-small`

### Issues
- `extractIcpCriteria` in `campaign.ts` line 43 uses `anthropic("claude-haiku-4-5")` directly, bypassing `AgentConfig` type constraint which specifies `"claude-haiku-4-5-20251001"`. Cosmetic inconsistency.
- No hardcoded API keys in source code. All loaded from env.

### **Severity: LOW**

---

## 9. Agent Orchestration

- **Delegation-via-tools pattern**: orchestrator model decides which specialist to invoke
- **Sequential only**: no parallel sub-agent execution
- **No agent chaining**: no automatic "after Research finishes, trigger Writer"
- **Result aggregation**: LLM synthesizes sub-agent results (no structured aggregation layer)

### **Severity: LOW**

---

## 10. Input/Output Validation

### Input: GOOD
All tool inputs validated via Zod schemas. Agent-level inputs are TypeScript interfaces.

### Output: **CRITICAL ISSUE**
`runner.ts` lines 68-81 -- output parsing:
```typescript
try {
  const jsonMatch = result.text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    output = JSON.parse(jsonMatch[1]) as TOutput;
  } else {
    output = JSON.parse(result.text) as TOutput;
  }
} catch {
  // If no structured output, use the raw text
  output = result.text as unknown as TOutput;
}
```

- **No schema validation on output**: Parsed JSON cast to `TOutput` without validation
- **Silent fallback**: If JSON parsing fails, raw text string is cast to `TOutput` via `unknown`
- **Impact**: `result.output` could be a string when the caller expects `WriterOutput` -- downstream code accessing `result.emailSteps` silently gets `undefined`

### **Severity: HIGH**

---

## 11. Cost Controls

### What exists
- `src/lib/enrichment/costs.ts`: Daily spend tracking for external APIs ($10/day cap)
- `maxSteps` limits on all agents (8-15 steps)
- Discovery plan tool computes cost projections before execution
- Workspace quota enforcement in campaign creation

### What's missing
- **No LLM API cost tracking**: Claude API spend is completely unmonitored
- **No token usage logging**: `result.usage` from AI SDK never captured
- **No per-workspace LLM cost limit**
- **No max output tokens** set on any `generateText` call

### **Severity: HIGH**
Research and Writer use Opus (most expensive model). Burst operations could incur significant untracked costs.

---

## 12. Logging & Observability

### AgentRun table captures:
- Agent name, workspace, input, output, status, duration, error
- Tool call steps (name + args + result) as JSON
- Trigger source (cli, orchestrator, api, pipeline)

### NOT captured:
- Token usage (input/output tokens)
- Model version used
- Parent-child correlation between orchestrator and sub-agent runs
- Full conversation transcript for multi-turn CLI sessions
- Individual tool execution timing

### **Severity: MEDIUM**

---

## 13. CLI Integration Points

### 1. Interactive Chat CLI (`scripts/chat.ts`)
- `npm run chat` -- multi-turn REPL with workspace selection
- Uses full orchestrator with all delegation capabilities

### 2. Standalone Writer Script (`scripts/generate-copy.ts`)
- **STALE**: Uses DUPLICATED system prompt with different quality rules
- Uses keyword-only KB search (not pgvector)
- Uses `{{firstName}}` format instead of current `{FIRSTNAME}` convention

### 3. Standalone Research Script (`scripts/analyze-website.ts`)
- **STALE**: Does NOT use the Research Agent. Runs completely independent `generateText` call
- Double-crawls website (once for analysis, once for metadata)

### 4. Knowledge Base CLI (`scripts/ingest-document.ts`)
- **Skips embeddings**: Reimplements chunking but doesn't call `embedBatch()`
- Must run `scripts/reembed-knowledge.ts` separately to generate vectors

### **Severity: HIGH**
Standalone scripts have diverged significantly from the integrated agent system. They should be updated or deprecated.

---

## 14. Data Flow

### Agent -> Database writes
- **Research**: WebsiteAnalysis, Workspace (empty ICP fields only)
- **Writer**: EmailDraft, Campaign (sequences)
- **Leads**: TargetList, TargetListPerson, DiscoveredPerson, Person, DailyCostTotal
- **Campaign**: Campaign, TargetList (auto-create for signals)
- **Orchestrator**: Workspace (package config), Proposal

### Data mutation risks
- `activateSignalCampaign` creates an external EmailBison campaign via API (irreversible)
- `updateWorkspacePackage` can change quotas/modules (no confirmation in tool)
- Campaign/Leads agents use clean operations layer; Research/Writer embed Prisma queries directly (inconsistent)

### **Severity: LOW**

---

## 15. Missing Functionality

### Referenced but not built
- **Phase 9 client notification**: Publishing campaign doesn't send email/Slack to client (campaign.ts lines 171, 427-428, 451-453)
- **Signal pipeline processing**: Signal campaigns can be created/activated but the actual cron processing is not yet deployed

### Feature gaps
- **Zero test files** for any agent code
- **No streaming for sub-agents**: 30-60s UI freezes during delegation from dashboard
- **No agent versioning**: System prompts hardcoded, no A/B testing or rollback
- **No rate limiting** on dashboard chat API route
- **Inconsistent `triggeredBy` tracking**: Research always sets "cli" even from API

### **Severity: HIGH** (testing), **MEDIUM** (other gaps)

---

## Summary by Severity

### HIGH
1. **Output Validation** (Sec 10): No schema validation. Malformed JSON silently produces type-unsafe results.
2. **Context Window Management** (Sec 5): No truncation for long sessions. Will crash on token limit.
3. **LLM Cost Tracking** (Sec 11): Claude API costs completely unmonitored.
4. **Stale Standalone Scripts** (Sec 13): `generate-copy.ts` and `analyze-website.ts` diverged significantly.
5. **Zero Test Coverage** (Sec 15): No tests for agents, tools, or prompts.

### MEDIUM
6. **Error Handling** (Sec 6): No retry, timeout, or circuit breaker logic.
7. **Prompt Divergence** (Sec 4): Scripts use different quality rules than main agents.
8. **Inconsistent Notifications** (Sec 12): Only Research sends failure notifications.
9. **Missing Token Usage** (Sec 12): AgentRun records don't capture token counts.
10. **No Sub-Agent Streaming** (Sec 15): Long UI freezes during delegation.

### LOW
11. Model alias inconsistency in campaign.ts
12. No KB chunk overlap
13. No KB relevance threshold
14. Sequential-only delegation
15. Inconsistent operations layer pattern

---

## Recommended Fix Priority
1. Add output validation in `runner.ts` (Zod schemas or `generateObject`)
2. Add context window management (sliding window or summarization)
3. Log token usage from `result.usage` in AgentRun records
4. Deprecate or update standalone scripts to use integrated agent APIs
5. Add basic test infrastructure (tool unit tests, prompt snapshot tests)
6. Add retry logic to `runner.ts` for transient API failures
7. Standardize failure notifications across all agents
8. Add LLM cost tracking (estimate from token usage, aggregate daily)
