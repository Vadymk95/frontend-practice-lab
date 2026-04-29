# InterviewOS — Content Contribution Guide

This guide documents how to add and edit questions in InterviewOS — both manually and via AI agents.

---

## Table of Contents

1. [Base Fields (All Question Types)](#1-base-fields-all-question-types)
2. [`single-choice` Schema](#2-single-choice-schema)
3. [`multi-choice` Schema](#3-multi-choice-schema)
4. [`bug-finding` Schema](#4-bug-finding-schema)
5. [`code-completion` Schema](#5-code-completion-schema)
6. [Question ID Naming Conventions](#6-question-id-naming-conventions)
7. [Manual Contribution Path](#7-manual-contribution-path)
8. [AI-Agent Contribution Path](#8-ai-agent-contribution-path)
9. [Adding a New Category](#9-adding-a-new-category)

---

## Bilingual content (RU / EN)

Every user-facing natural-language field (`question`, `explanation`, and option entries) is a **`{ en, ru }` object**, not a plain string:

```json
"question": {
    "en": "What is a closure in JavaScript?",
    "ru": "Что такое замыкание в JavaScript?"
}
```

The UI picks `en` or `ru` via `useLocalized()` based on the active i18n language.

**Language-agnostic fields stay strings** (they are source code / identifiers / technical references):

- `id`, `category`, `tags[]`
- `code` (code snippets)
- `blanks[]` (code-completion expected tokens — identifiers, expressions)
- `referenceAnswer` (bug-finding / code-completion — technical post-mortem kept English-only by convention)
- `correct` when it is a number (index) or a free-text code description in `bug-finding`

If you add a question manually, both `en` and `ru` must be non-empty. The validator does not check translation quality, but an empty string will fail the schema.

---

## 1. Base Fields (All Question Types)

Every question — regardless of type — must include these fields:

| Field         | Type                                                                            | Required | Description                                                                            |
| ------------- | ------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `id`          | `string`                                                                        | ✅       | Stable unique identifier. See [naming conventions](#6-question-id-naming-conventions). |
| `type`        | `"single-choice"` \| `"multi-choice"` \| `"bug-finding"` \| `"code-completion"` | ✅       | Determines the question variant and required extra fields.                             |
| `category`    | `string`                                                                        | ✅       | Matches the JSON filename slug, e.g. `"javascript"` for `javascript.json`.             |
| `difficulty`  | `"easy"` \| `"medium"` \| `"hard"`                                              | ✅       | Used by the adaptive algorithm to weight questions.                                    |
| `tags`        | `string[]`                                                                      | ✅       | Descriptive topic tags. Can be an empty array `[]`, but prefer meaningful tags.        |
| `question`    | `{ en: string; ru: string }`                                                    | ✅       | Question text (bilingual). Markdown is supported inside each locale.                   |
| `explanation` | `{ en: string; ru: string }`                                                    | ✅       | Explanation shown after the user reveals the answer (bilingual). Markdown supported.   |

The source of truth for all schemas is [`src/lib/data/schema.ts`](../src/lib/data/schema.ts).

---

## 2. `single-choice` Schema

One correct answer out of multiple options.

### Additional fields

| Field     | Type                           | Required | Description                                    |
| --------- | ------------------------------ | -------- | ---------------------------------------------- |
| `options` | `{ en: string; ru: string }[]` | ✅       | List of answer choices (bilingual per entry).  |
| `correct` | `number`                       | ✅       | Zero-based index of the single correct option. |

### JSON example

```json
{
    "id": "js-closure-001",
    "type": "single-choice",
    "category": "javascript",
    "difficulty": "easy",
    "tags": ["closures", "scope"],
    "question": {
        "en": "What is a closure in JavaScript?",
        "ru": "Что такое замыкание в JavaScript?"
    },
    "options": [
        {
            "en": "A function that is called immediately after it is defined",
            "ru": "Функция, вызываемая сразу после определения"
        },
        {
            "en": "A function that retains access to its lexical scope even when executed outside that scope",
            "ru": "Функция, сохраняющая доступ к своей лексической области видимости даже при выполнении вне неё"
        },
        {
            "en": "A function with no return value",
            "ru": "Функция без возвращаемого значения"
        },
        {
            "en": "A built-in JavaScript method for closing browser tabs",
            "ru": "Встроенный метод JavaScript для закрытия вкладок браузера"
        }
    ],
    "correct": 1,
    "explanation": {
        "en": "A closure is a function that retains access to variables from its outer (enclosing) lexical scope even after the outer function has finished executing.",
        "ru": "Замыкание — это функция, которая сохраняет доступ к переменным внешней (охватывающей) лексической области видимости даже после того, как внешняя функция завершила выполнение."
    }
}
```

`correct: 1` means the second option (0-based index) is the correct answer.

---

## 3. `multi-choice` Schema

One or more correct answers out of multiple options.

### Additional fields

| Field     | Type                           | Required | Description                                            |
| --------- | ------------------------------ | -------- | ------------------------------------------------------ |
| `options` | `{ en: string; ru: string }[]` | ✅       | List of answer choices (bilingual per entry).          |
| `correct` | `number[]`                     | ✅       | Zero-based indices of **all** correct options (array). |

### JSON example

```json
{
    "id": "js-promise-001",
    "type": "multi-choice",
    "category": "javascript",
    "difficulty": "medium",
    "tags": ["promises", "async"],
    "question": {
        "en": "Which of the following are valid ways to handle a rejected Promise?",
        "ru": "Какие из следующих способов обработки отклонённого Promise являются корректными?"
    },
    "options": [
        {
            "en": "Using `.catch()` at the end of the chain",
            "ru": "Использование `.catch()` в конце цепочки"
        },
        {
            "en": "Using the second argument of `.then(onFulfilled, onRejected)`",
            "ru": "Использование второго аргумента `.then(onFulfilled, onRejected)`"
        },
        {
            "en": "Using try/catch inside an async function",
            "ru": "Использование try/catch внутри async-функции"
        },
        {
            "en": "Using `.finally()` to handle rejections",
            "ru": "Использование `.finally()` для обработки отклонений"
        }
    ],
    "correct": [0, 1, 2],
    "explanation": {
        "en": "Rejected promises can be handled with .catch(), the second argument of .then(), or try/catch in async functions. .finally() runs regardless of outcome but does not handle rejections.",
        "ru": "Отклонённые promise можно обработать через .catch(), второй аргумент .then() или try/catch в async-функциях. .finally() выполняется независимо от исхода, но не обрабатывает отклонения."
    }
}
```

`correct: [0, 1, 2]` means the first three options are correct. The user must select all of them.

---

## 4. `bug-finding` Schema

The user reads a code snippet and identifies the bug.

### Additional fields

| Field             | Type                           | Required | Description                                                                                                                   |
| ----------------- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `code`            | `string`                       | ✅       | Code snippet containing the bug. Use `\n` for newlines. Language-agnostic (not translated).                                   |
| `correct`         | `number \| string`             | ✅       | Index of the correct option when `options` is present; otherwise a short free-text bug description.                           |
| `referenceAnswer` | `string`                       | ✅       | Full explanation of the fix. Kept English-only by convention (technical post-mortem).                                         |
| `options`         | `{ en: string; ru: string }[]` | ❌       | Optional multiple-choice options (bilingual per entry). If omitted, the user types a free answer. Minimum 1 item if provided. |

### JSON example (free-text mode — no `options`)

```json
{
    "id": "js-bug-typeof-001",
    "type": "bug-finding",
    "category": "javascript",
    "difficulty": "medium",
    "tags": ["typeof", "null", "bugs"],
    "question": {
        "en": "Find the bug in this type-checking function:",
        "ru": "Найдите ошибку в этой функции проверки типа:"
    },
    "code": "function isObject(value) {\n  return typeof value === 'object';\n}",
    "correct": "null passes the check because typeof null === 'object'",
    "referenceAnswer": "The function returns true for null because typeof null === 'object' is a well-known JavaScript bug. Fix: return value !== null && typeof value === 'object';",
    "explanation": {
        "en": "typeof null === 'object' is a historical JavaScript quirk. Always add a null check when using typeof to verify objects.",
        "ru": "typeof null === 'object' — исторический квирк JavaScript. Всегда добавляйте проверку на null при использовании typeof для проверки объектов."
    }
}
```

---

## 5. `code-completion` Schema

The user fills in the blanks (`__BLANK__`) in a code template.

### Additional fields

| Field             | Type       | Required | Description                                                                                                       |
| ----------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `code`            | `string`   | ✅       | Code template with `__BLANK__` marking each blank. Language-agnostic (not translated).                            |
| `blanks`          | `string[]` | ✅       | Expected fill-in values for each blank, in order of appearance. Identifiers/expressions — not translated.         |
| `referenceAnswer` | `string`   | ✅       | Complete code or rationale shown after the user answers. Kept English-only by convention (technical post-mortem). |
| `lang`            | `string`   | ❌       | Language for syntax highlighting (default: `"javascript"`).                                                       |

> **Blank marker:** the only valid placeholder is the literal string `__BLANK__`. Triple underscores (`___`) and any other variant are NOT recognised — the schema rejects code where the `__BLANK__` marker count does not equal `blanks.length`.

### JSON example

```json
{
    "id": "js-template-001",
    "type": "code-completion",
    "category": "javascript",
    "difficulty": "easy",
    "tags": ["template-literals", "strings"],
    "question": {
        "en": "Complete the tagged template literal to return the string in uppercase:",
        "ru": "Дополните тегированный шаблонный литерал, чтобы вернуть строку в верхнем регистре:"
    },
    "code": "function upper(strings, ...values) {\n  return strings.reduce((acc, str, i) => {\n    return acc + (values[i - 1] ? values[i - 1].__BLANK__  : '') + str;\n  });\n}\nconst name = 'world';\nconsole.log(upper`hello ${name}`); // 'hello WORLD'",
    "blanks": ["toUpperCase()"],
    "lang": "javascript",
    "referenceAnswer": "values[i - 1].toUpperCase() converts each interpolated value to uppercase before concatenating.",
    "explanation": {
        "en": "Tagged template literals receive the string parts and interpolated values separately. Calling .toUpperCase() on each value produces the uppercase output.",
        "ru": "Тегированные шаблонные литералы получают строковые части и интерполированные значения раздельно. Вызов .toUpperCase() на каждом значении даёт вывод в верхнем регистре."
    }
}
```

The number of `__BLANK__` occurrences in `code` must match the length of `blanks`. CI's `validate:data` step rejects any mismatch.

---

## 6. Question ID Naming Conventions

### Format

```
{category-prefix}-{topic-slug}-{sequence}
```

| Part              | Rules                                                                       | Example                               |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| `category-prefix` | Short abbreviation of the category slug. Keep consistent within a category. | `js`, `ts`, `css`, `react`            |
| `topic-slug`      | Kebab-case descriptor of the concept being tested.                          | `closure`, `event-loop`, `bug-typeof` |
| `sequence`        | Zero-padded 3-digit integer. Increment from the last existing ID.           | `001`, `012`, `103`                   |

### Examples

```
js-closure-001
js-event-loop-002
ts-generics-001
css-specificity-003
react-hooks-001
```

### Why IDs Must Be Stable

**Never rename or reuse an ID.** The adaptive algorithm persists per-question error rates in `localStorage` keyed by `id`. If an ID is renamed, the stored weight history is orphaned — the question starts as if the user has never seen it. If an ID is reused for a different question, the weight history of the old question pollutes the new one.

Rule of thumb: **treat IDs as permanent primary keys**, the same way you would treat a database row UUID.

---

## 7. Manual Contribution Path

### Step 1 — Edit the category JSON file

All question files live in `public/data/`. The filename is the category slug + `.json`:

```
public/data/javascript.json
public/data/css.json
public/data/react-hooks.json
```

Open the relevant file and append your new question(s) to the JSON array. Ensure:

- The `id` follows the naming convention and does not duplicate an existing ID.
- The `category` field matches the filename slug exactly (e.g. `"react-hooks"` for `react-hooks.json`).
- All required fields for the chosen `type` are present.

### Step 2 — Validate

```bash
npm run validate:data
```

The script reads every `public/data/*.json` file (excluding `manifest.json`), validates each question against the Zod schema in `src/lib/data/schema.ts`, and reports:

- ✓ `filename.json` — N questions (on success)
- ✗ `filename.json` — schema violation: (error details) (on failure)

Exit code 0 means all files are valid. Exit code 1 means at least one violation was found — fix the errors before committing.

### Step 3 — Commit

Use the project commit format:

```
content(javascript): add 3 closure questions
```

---

## 8. AI-Agent Contribution Path

### Prompt template

Copy and fill in this template when asking an AI agent to generate questions:

```
Generate 5 questions for category "javascript", difficulty "medium", type "single-choice".
Follow docs/content-guide.md schema exactly — ALL user-facing text fields (`question`, `explanation`, each `options[]` entry) MUST be `{ en: "...", ru: "..." }` bilingual objects. Both locales required, both non-empty, RU must be natural Russian (not transliteration).
Language-agnostic fields (`code`, `blanks`, `referenceAnswer`) stay plain strings and are NOT translated.
ID format: js-{topic}-NNN (use the next available sequence number based on existing IDs).
Output: raw JSON array only, no markdown fences, no commentary.
```

Adjust `category`, `difficulty`, `type`, and ID format prefix as needed.

### Review workflow

1. **Generate** — run the prompt against the AI model of your choice.
2. **Copy** the raw JSON output into the appropriate `public/data/*.json` file (append to the array).
3. **Validate** — run `npm run validate:data`. If any violation is reported, fix the JSON and repeat.
4. **Read** — skim each generated question for factual accuracy and difficulty calibration.
5. **Commit** — use the standard commit format (see Manual path Step 3).

> **AI models do not auto-check for duplicate IDs.** Before committing, search the file for the generated IDs to ensure no collision:
>
> ```bash
> grep '"id"' public/data/javascript.json
> ```

### File location

Place generated questions in the correct category file under `public/data/`. Do not create new category files unless intentionally adding a new category (see below).

---

## 9. Adding a New Category

InterviewOS uses **automatic manifest generation** — there is no hardcoded list of categories.

`src/scripts/generate-manifest.ts` discovers all `*.json` files in `public/data/` (excluding `manifest.json` itself) and regenerates `public/data/manifest.json`.

### Steps

1. Create a new file: `public/data/{category-slug}.json` containing a valid JSON array of questions.
    - The `category` field in every question must match the filename slug exactly.
    - The array must have at least one valid question.

2. Validate the new file:

    ```bash
    npm run validate:data
    ```

3. Regenerate the manifest:

    ```bash
    npm run build:manifest
    ```

    This updates `public/data/manifest.json` to include the new category. The app reads the manifest on load and the new category appears automatically — no source code changes required.

4. Commit both the new data file and the updated manifest:
    ```bash
    git add public/data/{category-slug}.json public/data/manifest.json
    git commit -m "content({category-slug}): add initial questions"
    ```

### Category slug rules

- Use kebab-case: `react-hooks`, `system-design`, `web-security`.
- The slug becomes part of all question IDs in the file — choose it carefully, as it cannot be renamed without breaking stored weights.
