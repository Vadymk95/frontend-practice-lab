# Auto-Content Pipeline — Design

## 1. Problem & Non-Goals

InterviewOS has 1005 bilingual RU/EN questions across 18 categories. Frontend evolves faster than manual authoring can keep up — Server Components, AI/LLM tooling, edge runtimes, signals, etc. This pipeline runs on a schedule, scans the 2026 frontend trend landscape, diffs it against the existing manifest, drafts new questions (and proposes new categories) following `docs/content-guide.md`, validates them against the Zod schema, and opens a labeled draft PR for human review. The maintainer keeps full editorial control.

**Explicitly NOT goals:**

1. **No auto-merge.** The pipeline never merges to `master` — every change requires human approval. CI's existing `validate:data` on PR remains the gate.
2. **No auto-creation of new categories without prior approval.** New category proposals open a GitHub Issue first; only after a maintainer comment-approves does a follow-up run draft the seed file.
3. **No edits to pre-existing questions or IDs.** IDs are persistent localStorage keys (content-guide §6); the pipeline is append-only. It also will not modify `manifest.json` directly — that stays driven by `npm run build:manifest`.

---

## 2. Trigger & Cadence

- **Cron**: weekly, Monday 09:00 UTC (`0 9 * * 1`). Frontend trends shift on a multi-week cadence; daily creates PR fatigue, monthly misses momentum.
    - _Alternative considered_: bi-weekly (`0 9 * * 1/14`). Rejected — too easy to skip and accumulate drift.
- **Manual**: `workflow_dispatch` with inputs `{ category?: string, count?: number (default 3), type?: 'single-choice'|'multi-choice'|'bug-finding'|'code-completion', dryRun?: boolean }`. Lets the maintainer force a run after reading a hot blog post.
- **Concurrency**: `concurrency: { group: auto-content, cancel-in-progress: false }` so a manual run cannot collide with the cron run.

---

## 3. Pipeline Stages

### Stage A — Trends Fetch

**Recommendation: Anthropic API with the built-in `web_search` server tool**, run once per execution with a fixed prompt ("State of frontend engineering, last 90 days, focus on: framework releases, runtime/build tools, testing patterns, AI-in-IDE workflows, browser APIs"). Returns a JSON array of `{ topic, summary, sources[] }`.

_Alternative considered:_ curated RSS list (CSS-Tricks, Vercel blog, Chrome Releases, V8, TC39 proposals). Rejected as the default — high maintenance, drifts as feeds die, and parsing OPML is custom logic the Ghost Principle frowns on. Keep RSS as a fallback if `web_search` cost balloons.

### Stage B — Coverage Diff

Read `public/data/manifest.json` plus each category file's `tags` arrays. For every fetched topic, ask the model: "Which existing category slug best fits this topic? If none scores ≥0.7, return `__NEW__`." Output partitions topics into `{ extend: [{ slug, topic }], propose: [{ name, rationale, sample_topics }] }`.

### Stage C — Pre-Flight Category Check (gate)

For each entry in `propose`, search for an open GitHub Issue titled `proposal: new category — <name>`. If absent, open one with a structured body (rationale, 3 sample question titles, suggested slug, suggested ID prefix). If present and **not** labeled `approved`, skip. If labeled `approved`, treat the slug as a valid extend target for this run. **Pipeline never creates `public/data/<new-slug>.json` until the issue is approved.**

### Stage D — Question Generation

For each `extend` entry, call Claude with the prompt template in §4. Pre-compute the next sequence number per category prefix by grepping existing IDs. Default: 3 new questions per affected category per run (cap at 10 across all categories per run to keep PR review tractable).

### Stage E — Local Validation

Append generated JSON to the relevant category file in a worktree, then run:

1. `npm run validate:data` — Zod schema gate (catches bilingual misses, code-completion blank-count drift).
2. ID-collision grep: `grep -h '"id"' public/data/*.json | sort | uniq -d` must be empty.
3. Bilingual non-empty assertion (Zod allows empty strings — see content-guide §0; we add an explicit non-empty check to fail loud).
4. `npm run build:manifest` — regenerates manifest, included in commit.

If **any** check fails: do not abort. Drop the offending question, log the reason, and proceed with whatever passes. If zero questions survive, exit 0 with a no-op message (no PR).

### Stage F — PR Creation

`gh pr create --draft --label ai-content --label needs-review --title "content(ai): batch <date>" --body @body.md`. Body lists each new question (id, category, title) with a one-line rationale and the source URLs from Stage A. Always draft; the maintainer flips to ready when satisfied.

---

## 4. Prompt Template Sketch

**Model**: `claude-opus-4-7`.
_Reason_: Bilingual technical content with multi-field structural invariants (the `__BLANK__`/blanks alignment, RU naturalness, factual code accuracy) is exactly where Opus's reasoning headroom pays for itself. A bad question wastes the maintainer's review time, which is more expensive than the model token delta. Cost is bounded by the per-run cap (Stage D, ≤10 questions/run).

_Alternative_: `claude-sonnet-4-6`. Use it for the Stage A trends fetch (cheap, just summarization with web search) and Stage B coverage diff (lightweight classification). Reserve Opus for Stage D generation only.

**Request payload outline (Stage D)**:

- `model: "claude-opus-4-7"`
- `max_tokens: 4096`
- `system`: anchors the agent to content-guide §8 verbatim:
    > "Generate N questions for category `<slug>`, difficulty `<level>`, type `<type>`. Follow docs/content-guide.md schema exactly — ALL user-facing text fields (`question`, `explanation`, each `options[]` entry) MUST be `{ en: "...", ru: "..." }` bilingual objects. Both locales required, both non-empty, RU must be natural Russian (not transliteration). Language-agnostic fields (`code`, `blanks`, `referenceAnswer`) stay plain strings and are NOT translated. ID format: `<prefix>-{topic}-NNN` (use the next available sequence number). Output: raw JSON array only, no markdown fences, no commentary."
- Plus an InterviewOS-specific addendum:
    - "For `code-completion`: the count of `__BLANK__` markers in `code` MUST equal `blanks.length` exactly. The schema rejects mismatches."
    - "Sequence start: NNN."
    - "Trend context (use as factual ground truth): <Stage A bullets, with source URLs>."
    - "Avoid these existing tags as exclusivity hints (do not duplicate concepts): <existing tags from category file>."
- `messages`: single user message with the topic spec + a verbatim copy of the §8 template.
- **Output enforcement**: response_format-style JSON-only is not native to Claude — instead, instruct "Respond with a single JSON array, nothing else", then `JSON.parse` defensively and on failure re-prompt once with the parse error.
- **Prompt caching**: cache the system prompt + content-guide schema excerpt as `cache_control: ephemeral` — saves on the per-category fan-out (5+ calls/run hit the same system block).

---

## 5. Cost & Failure Modes

**Cost ballpark per weekly run** (worst case, 10 questions, ~4k tokens output each, plus trend fetch):

- Stage A (Sonnet + web_search): ~$0.05–0.15
- Stage B (Sonnet): ~$0.02
- Stage D (Opus, 10 calls × ~6k input + 4k output, with cache): ~$1.50–3.00
- **Total: ~$2–4/run, ~$10–17/month.** Negligible for the maintenance value.

**Top 3 failure modes & safety nets**:

1. **Hallucinated APIs / outdated facts** (e.g. fabricated React 20 hook, wrong Vite flag).
   _Net_: Stage A web_search forces grounding — the prompt requires every generated question to cite which trend bullet it derives from. Stage F PR body surfaces those citations so the maintainer can spot-check. Default to draft PR; the maintainer catches the rest.

2. **ID collisions** (model picks a sequence number already in use, or two parallel runs race).
   _Net_: pipeline computes `next-seq` from `grep` immediately before the API call (not stored), runs the dup-check in Stage E. On collision, drops that question and logs. The `concurrency` group on the workflow prevents parallel-run races.

3. **Schema drift** (most fragile: `code-completion`'s `__BLANK__` count refine, bilingual `{en,ru}` invariant, free-text `bug-finding` mode where `correct` is a string).
   _Net_: Stage E runs the actual `validate:data` script. The Zod refine on `CodeCompletionSchema` (schema.ts:57–60) is the authoritative gate — no shadow validation. The pipeline never mutates the schema; if a new question type appears, it's a separate manual story.

---

## 6. Files To Be Created (paths only, no code)

- `.github/workflows/auto-content.yml` — the cron + workflow_dispatch entrypoint.
- `src/scripts/auto-content/index.ts` — orchestrator (calls A→F).
- `src/scripts/auto-content/fetch-trends.ts` — Stage A.
- `src/scripts/auto-content/coverage-diff.ts` — Stage B.
- `src/scripts/auto-content/category-proposal.ts` — Stage C (gh issue create/check).
- `src/scripts/auto-content/generate-questions.ts` — Stage D (Anthropic SDK call, prompt assembly).
- `src/scripts/auto-content/validate-and-write.ts` — Stage E (wraps existing `validate-data.ts` and `generate-manifest.ts` exports — note both already export `main()` for reuse).
- `src/scripts/auto-content/open-pr.ts` — Stage F (`gh pr create` shell-out).
- `src/scripts/auto-content/prompts/system.md` — verbatim content-guide §8 + addendum, kept as a separate file so the addendum is reviewable in isolation.
- `src/scripts/auto-content/__tests__/coverage-diff.test.ts` — unit test for the slug-matching heuristic.
- `package.json` script entry: `"auto-content": "tsx src/scripts/auto-content/index.ts"` (also dry-run flag).
- `tsconfig.scripts.json` already exists — add the new dir to its `include` glob.

Dependencies to add: `@anthropic-ai/sdk` (devDependency — only used by the script). Honor Ghost Principle: no custom HTTP client, no LangChain, no orchestrator framework.

---

## 7. Estimated Effort to MVP

| #   | Story                                                                                                                                                                                                       | Size  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Stages A+B+C + GitHub Action skeleton (cron, workflow_dispatch, gh issue creation, no question generation yet — just produces a "would generate N questions for X" report comment on a tracking issue).    | **M** |
| 2   | Stages D+E (Anthropic SDK wired up, prompt template file, validation loop, dry-run mode that writes to a tmp dir and prints diff).                                                                          | **M** |
| 3   | Stage F (PR creation, label setup, body templating) + end-to-end dogfood: one real cron run produces one real draft PR; tune prompt/caps based on output quality.                                           | **S** |

Total: ~M+M+S, roughly 3–5 focused dev days end-to-end including prompt iteration.

---

## 8. Open Questions for the User

1. **Which Anthropic model for question generation — `claude-opus-4-7` (recommended, ~$3/run) or `claude-sonnet-4-6` (~$0.30/run, lower quality bar)?**
2. **Trend source: Anthropic `web_search` server tool (recommended, zero maintenance) or a hand-curated RSS feed list checked into the repo (cheaper, but stale-prone)?**
3. **Cadence: weekly Monday 09:00 UTC (recommended) or bi-weekly?**
4. **Where does the `ANTHROPIC_API_KEY` live — repo-level GitHub Actions secret, or organization-level? And is there a budget cap you want enforced (e.g. fail the run if monthly spend > $X via a pre-flight Anthropic usage API check)?**
5. **Scope of the new-category gate — Issue-comment approval (recommended, lightweight) or require an explicit `approved` label applied by a maintainer (stricter, harder to fake)?**
