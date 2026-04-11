# Story 5.1: Content Contribution Guide

Status: review

## Story

As an **admin**,
I want a documented guide for adding and editing questions,
so that I (and AI agents) can contribute content correctly without breaking the schema.

## Acceptance Criteria

1. **Given** `docs/content-guide.md` exists
   **When** an admin reads it
   **Then** it documents all 4 question type schemas (`single-choice`, `multi-choice`, `bug-finding`, `code-completion`) with field descriptions and required/optional markers
   **And** it includes a valid JSON example for each question type
   **And** it describes the AI-agent path: prompt template for generating questions, review workflow, and file location
   **And** it documents the manual path: how to edit a JSON file directly and what `npm run validate:data` checks
   **And** it explains question ID naming conventions (e.g. `js-closure-001`) and why IDs must be stable

2. **Given** an AI agent is given the content guide
   **When** it generates new questions
   **Then** the output is valid JSON that passes `npm run validate:data` without modification

## Tasks / Subtasks

- [x] Task 1: Create `docs/` directory and `docs/content-guide.md` (AC: #1, #2)
  - [x] Section: Base fields shared by all question types (with required/optional markers)
  - [x] Section: `single-choice` schema with full JSON example
  - [x] Section: `multi-choice` schema with full JSON example
  - [x] Section: `bug-finding` schema with full JSON example
  - [x] Section: `code-completion` schema with full JSON example
  - [x] Section: ID naming conventions and stability rule
  - [x] Section: Manual contribution path (edit JSON → `npm run validate:data`)
  - [x] Section: AI-agent contribution path (prompt template → validate → commit)
  - [x] Section: Adding a new category (drop new JSON → auto-detected by manifest)

## Dev Notes

### This is a Documentation-Only Story

No application source code is modified. Output: `docs/content-guide.md`.
The `docs/` directory does not yet exist — create it at the project root (alongside `src/`, `public/`).

### Authoritative Schema Source

All field definitions must match exactly what's in `src/lib/data/schema.ts` — this is the single source of truth. Do NOT invent fields. The Zod schemas are:

```typescript
// src/lib/data/schema.ts (current production schema)

// Base fields (all types):
// id: string (required)
// type: 'single-choice' | 'multi-choice' | 'bug-finding' | 'code-completion' (required)
// category: string  — matches the JSON filename slug, e.g. "javascript" (required)
// difficulty: 'easy' | 'medium' | 'hard' (required)
// tags: string[]  — descriptive tags (required, can be empty array)
// question: string  — question text in Markdown (required)
// explanation: string  — explanation shown after answer reveal (required)

// single-choice extras:
// options: string[]  — answer options (required)
// correct: number  — zero-based index of correct option (required)

// multi-choice extras:
// options: string[]  — answer options (required)
// correct: number[]  — zero-based indices of ALL correct options (required)

// bug-finding extras:
// code: string  — code snippet with the bug (required)
// options: string[]  — optional multiple-choice options (optional)
// correct: string  — short description of the bug (required)
// referenceAnswer: string  — full explanation of the fix (required)

// code-completion extras:
// code: string  — code template with `___` blanks (required)
// blanks: string[]  — expected values for each blank in order (required)
// lang: string  — language for syntax highlighting (optional, default 'javascript')
// referenceAnswer: string  — full code without blanks for reference (required)
```

### Question ID Naming Convention

Format: `{category-slug}-{sequence}` with zero-padded 3-digit sequence, e.g. `javascript-001`, `css-012`, `react-hooks-003`.

IDs must be **stable** — never rename or reuse an ID. The adaptive algorithm stores per-question weights in `localStorage` keyed by `id`. Renaming an ID orphans its weight history.

### File Location for New Questions

All question files live in `public/data/`. Filename = category slug + `.json`. Examples:
- `public/data/javascript.json`
- `public/data/css.json`
- `public/data/react-hooks.json`

### Manifest Auto-Generation

`generate-manifest.ts` auto-discovers ALL `*.json` files in `public/data/` (excluding `manifest.json`). No hardcoded file list exists. Adding a new file is sufficient — running `npm run build:manifest` regenerates `manifest.json`.

### validate:data Script

`src/scripts/validate-data.ts` validates every `public/data/*.json` against `src/lib/data/schema.ts` (Zod). Exits 0 = all valid. Exits 1 = print file + field + error, abort. Run with `npm run validate:data`.

### AI-Agent Prompt Template to Include in Guide

The guide must include a ready-to-use prompt template such as:

```
Generate 5 questions for category "javascript", difficulty "medium", type "single-choice".
Follow docs/content-guide.md schema exactly.
ID format: javascript-NNN (use the next available sequence number).
Output: raw JSON array only, no markdown fences.
```

### No Code Changes, No Tests

This story produces only `docs/content-guide.md`. No source code is modified. Post-edit verification: `npm run validate:data` (confirms existing data still valid — no regression).

### References

- Schema source: `src/lib/data/schema.ts`
- Validation script: `src/scripts/validate-data.ts`
- Manifest generator: `src/scripts/generate-manifest.ts`
- Example data file: `public/data/javascript.json` (examine for real ID format and structure)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No issues encountered._

### Completion Notes List

- Created `docs/content-guide.md` from scratch; `docs/` directory already existed (empty).
- All field definitions sourced directly from `src/lib/data/schema.ts` (Zod). No invented fields.
- JSON examples use real question IDs and content from `public/data/javascript.json`.
- Bug-finding example: `js-bug-typeof-001`; code-completion example: `js-template-001`.
- ID naming convention documented from observed data pattern: `{category-prefix}-{topic-slug}-{NNN}`.
- Manifest auto-generation documented based on `src/scripts/generate-manifest.ts`.
- `npm run validate:data` confirmed: 2 files, 12 questions — all valid, no regressions.

### File List

- `docs/content-guide.md` (created)

### Change Log

- 2026-04-10: Story 5.1 — Created `docs/content-guide.md` with full schema docs, ID conventions, manual and AI-agent contribution paths, and new-category instructions.
