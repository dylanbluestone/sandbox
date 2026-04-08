# Dev Sandbox - Feature Lab

## Overview

This repo is a personal development sandbox for building, testing, and showcasing isolated feature demos in a production-grade environment. It exists so that new patterns, UI components, integrations, and experiments can be developed with the same quality standards as a real project — enforced automatically — without polluting any production codebase.

Every feature lives in its own directory under `app/features/`, has its own route, and can be iterated on independently. The goal is to move fast while keeping the code clean, typed, and tested.

---

## Architecture

| Layer      | Technology               | Why                                                          |
| ---------- | ------------------------ | ------------------------------------------------------------ |
| Framework  | Next.js 14 (App Router)  | File-based routing, server components, modern React patterns |
| Language   | TypeScript (strict mode) | Catches bugs at compile time, not runtime                    |
| Styling    | Tailwind CSS             | Utility-first, no context switching between files            |
| Testing    | Vitest                   | Fast, ESM-native, same API as Jest                           |
| Formatting | Prettier                 | Zero-debate code style, auto-applied on save and commit      |
| Linting    | ESLint + plugins         | Catches real bugs beyond formatting                          |

### Why App Router (not Pages Router)

App Router is the current Next.js standard. It enables React Server Components, nested layouts, and co-located loading/error states — patterns that reflect how modern Next.js apps are actually built.

---

## Quality Gates

This repo enforces a three-layer quality system. Each layer catches different categories of problems.

### 1. Editor Level (real-time)

ESLint and Prettier run in your editor as you type via IDE extensions (ESLint + Prettier plugins for VS Code or similar). Problems are flagged inline before you even save.

**Install recommended extensions:**

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Set Prettier as your default formatter and enable format-on-save for the fastest feedback loop.

### 2. Commit Level (Husky + lint-staged)

When you run `git commit`, Husky fires a pre-commit hook that runs lint-staged. lint-staged only processes files you've actually staged — not the whole repo — so it's fast even as the project grows.

**What runs on commit:**

| File type           | Commands                               |
| ------------------- | -------------------------------------- |
| `*.{js,jsx,ts,tsx}` | `eslint --fix` then `prettier --write` |
| `*.{json,css,md}`   | `prettier --write`                     |

If ESLint finds an unfixable error (unused variable, bad import, etc.), the commit is **blocked** and your files are restored to their pre-hook state. Fix the error and try again.

### 3. CI Level (GitHub Actions)

Every push to `main` and every pull request triggers the full CI pipeline on a clean Ubuntu environment. This is the safety net that catches anything that slipped through locally.

**Pipeline steps (in order):**

```
Checkout → Setup Node 20 → npm ci → Lint → Format check → Type check → Tests
```

All steps must pass for a PR to be mergeable. The pipeline fails fast — if lint fails, it won't waste time running tests.

---

## How to Add a New Feature Demo

Follow these steps for every new feature. The structure keeps demos isolated and easy to navigate.

**1. Create a new branch**

```bash
git checkout -b feature/your-feature-name
```

**2. Create the feature directory**

```
app/features/your-feature/
```

**3. Add the route file**

```
app/features/your-feature/page.tsx
```

Minimal starting point:

```tsx
export default function YourFeaturePage() {
  return (
    <main>
      <h1>Your Feature</h1>
    </main>
  );
}
```

Your feature is now accessible at `http://localhost:3000/features/your-feature`.

**4. Write tests**

```
__tests__/your-feature.test.ts
```

```ts
import { describe, expect, it } from 'vitest';

describe('your-feature', () => {
  it('does what it should', () => {
    expect(true).toBe(true);
  });
});
```

**5. Commit — pre-commit hooks run automatically**

```bash
git add .
git commit -m "feat: add your-feature demo"
```

lint-staged will lint and format your staged files. Fix any errors it reports before re-committing.

**6. Push and open a PR**

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub. CI will start automatically.

**7. Wait for CI to pass**

Check the Actions tab. All five checks must be green: Lint, Format check, Type check, Tests.

**8. Merge when approved**

Squash and merge to keep the `main` branch history clean.

---

## Local Development Commands

| Command                | What it does                                                                     |
| ---------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`          | Start the dev server at `http://localhost:3000` with hot reload                  |
| `npm run build`        | Production build — catches build-time errors ESLint won't catch                  |
| `npm run start`        | Serve the production build locally (run `build` first)                           |
| `npm run lint`         | Run ESLint across the whole project, report all issues                           |
| `npm run lint:fix`     | Run ESLint and auto-fix everything it can                                        |
| `npm run format`       | Run Prettier and rewrite all files in place                                      |
| `npm run format:check` | Run Prettier in read-only mode — exits 1 if anything is unformatted (used in CI) |
| `npm test`             | Run all tests once and exit (used in CI)                                         |
| `npm run test:watch`   | Run tests in watch mode — re-runs on file save (use during development)          |

---

## Project Structure

```
sandbox/
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
│
├── .husky/
│   └── pre-commit              # Runs lint-staged before every commit
│
├── __tests__/                  # All test files live here
│   └── example.test.ts
│
├── app/                        # Next.js App Router root
│   ├── features/               # Each feature demo gets its own subdirectory
│   │   └── your-feature/
│   │       └── page.tsx        # Route: /features/your-feature
│   ├── fonts/                  # Local font assets
│   ├── favicon.ico
│   ├── globals.css             # Tailwind directives + global styles
│   ├── layout.tsx              # Root layout (html, body, fonts)
│   └── page.tsx                # Home page — route: /
│
├── .eslintrc.json              # ESLint rules and plugin config
├── .prettierrc                 # Prettier formatting rules
├── .prettierignore             # Files Prettier should skip
├── next.config.mjs             # Next.js configuration
├── next-env.d.ts               # Auto-generated Next.js TS types — do not edit
├── package.json                # Dependencies, scripts, lint-staged config
├── postcss.config.mjs          # PostCSS config (required by Tailwind)
├── tailwind.config.ts          # Tailwind theme and content paths
├── tsconfig.json               # TypeScript compiler options
└── vitest.config.ts            # Vitest test runner configuration
```

**Where things go:**

- New pages/routes → `app/` (following Next.js file-based routing)
- Feature demos → `app/features/<name>/page.tsx`
- Shared UI components → `app/components/` (create as needed)
- Utility functions → `lib/` (create as needed)
- Tests → `__tests__/` matching the name of the file being tested
- Static assets → `public/`

---

## Feature Demos

### Age Gate

A production-quality age verification form with full edge-case handling, accessibility, and test coverage. Built as a reusable React component backed by pure TypeScript utility functions.

**What it does**

Renders a date-of-birth entry form (three dropdowns: Month / Day / Year). On submission it calculates the user's exact age and fires `onAgeVerified` or `onAgeDenied` depending on whether they meet the configured minimum age. Handles leap year birthdays, impossible dates (e.g. Feb 31), future dates, and the exact day-of-birthday boundary.

**File locations**

| File                             | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `lib/utils/ageUtils.ts`          | Pure TypeScript utilities — `calculateAge` and `isOfAge` |
| `components/AgeGate.tsx`         | React component — form UI, validation, callbacks         |
| `__tests__/ageUtils.test.ts`     | 38 unit tests for the utility functions                  |
| `__tests__/AgeGate.test.tsx`     | 27 component tests using Testing Library                 |
| `app/features/age-gate/page.tsx` | Minimal feature route at `/features/age-gate`            |
| `app/demos/age-gate/page.tsx`    | Full interactive demo at `/demos/age-gate`               |

**Run the demo locally**

```bash
npm run dev
# then open http://localhost:3000/demos/age-gate
```

**Using the component**

```tsx
import AgeGate from '@/components/AgeGate';

// Minimal usage
<AgeGate
  minAge={18}
  onAgeVerified={() => setAllowed(true)}
/>

// Full usage
<AgeGate
  minAge={21}
  onAgeVerified={() => router.push('/content')}
  onAgeDenied={() => router.push('/underage')}
  disabled={isLoading}
  errorMessage="You must be 21 or older to access this content."
  submitButtonText="Verify My Age"
/>
```

**Available props**

| Prop               | Type         | Required | Default                                 | Description                      |
| ------------------ | ------------ | -------- | --------------------------------------- | -------------------------------- |
| `minAge`           | `number`     | ✓        | —                                       | Minimum age in years             |
| `onAgeVerified`    | `() => void` | ✓        | —                                       | Called when age qualifies        |
| `onAgeDenied`      | `() => void` | —        | `undefined`                             | Called when age does not qualify |
| `disabled`         | `boolean`    | —        | `false`                                 | Disables all form controls       |
| `errorMessage`     | `string`     | —        | `"You must be at least {n} years old."` | Override the under-age error     |
| `submitButtonText` | `string`     | —        | `"Verify Age"`                          | Override the button label        |

**Utility functions**

```ts
import { calculateAge, isOfAge } from '@/lib/utils/ageUtils';

// Returns exact age in whole years
calculateAge(new Date('1990-06-15')); // e.g. 35
calculateAge(new Date('1990-06-15'), new Date('2025-06-15')); // 35 — birthday today
calculateAge(new Date('1990-06-15'), new Date('2025-06-14')); // 34 — birthday tomorrow

// Returns true if dob meets the minimum age requirement
isOfAge(new Date('2007-06-15'), 18); // true  — exactly 18 today
isOfAge(new Date('2007-06-16'), 18); // false — turns 18 tomorrow
```

Both functions throw `TypeError` for invalid dates and `RangeError` for future dates or negative `minAge`.

**Test coverage**

| File               | Tests | What's covered                                                                                                                                                                                             |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ageUtils.test.ts` | 38    | Standard ages, birthday boundary (today/tomorrow/yesterday), leap year (Feb 29 → Mar 1 convention), extreme ages (0–120 years), invalid/future dates, default parameter                                    |
| `AgeGate.test.tsx` | 27    | Rendering, disabled state, empty input, future date, age pass/fail, exact-boundary, custom props, dynamic day list (Jan/Apr/Feb leap/non-leap), day reset on month change, error clearing, ARIA attributes |

---

## Troubleshooting

### Pre-commit hook fails

**Symptom:** `git commit` is blocked with ESLint errors.

**Fix:** Read the error output — it lists the exact file, line, and rule. Fix the issue, `git add` the file again, and re-commit. For auto-fixable issues, run `npm run lint:fix` first.

**Bypass (emergencies only):**

```bash
git commit --no-verify -m "your message"
```

This skips all hooks. Use only when the hook itself is broken, not to bypass legitimate errors.

---

### CI pipeline fails

**Symptom:** Red X on a PR check in GitHub.

**Steps:**

1. Click **Details** next to the failing check to open the Actions log
2. Find the first red step — earlier steps are green and not the cause
3. Read the error output in that step
4. Fix locally, commit, and push — CI re-runs automatically

**Common causes by step:**

| Step         | Common cause                                     | Fix                                              |
| ------------ | ------------------------------------------------ | ------------------------------------------------ |
| Lint         | ESLint error not caught locally                  | Run `npm run lint` locally, fix errors           |
| Format check | File formatted differently than Prettier expects | Run `npm run format` then commit                 |
| Type check   | TypeScript error across files                    | Run `npx tsc --noEmit` locally to see all errors |
| Tests        | Test failure or Vitest startup error             | Run `npm test` locally to reproduce              |

---

### Type errors

**Symptom:** `npx tsc --noEmit` reports errors.

**Common fixes:**

- Missing type for a variable → add an explicit type annotation or let TypeScript infer it from initialization
- `any` creeping in → use `unknown` and narrow the type, or add a proper interface
- Missing `@types/*` package → `npm install --save-dev @types/package-name`
- Import not found → check the path and that the file exists

---

### Linting errors

**Symptom:** `npm run lint` reports errors.

| Rule                                | Meaning                          | Fix                                                                |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `@typescript-eslint/no-unused-vars` | Variable declared but never used | Remove it, or prefix with `_` if intentionally unused              |
| `no-console`                        | `console.log` left in code       | Remove it, or use `console.warn`/`console.error` which are allowed |
| `import/order`                      | Imports in wrong order           | Run `npm run lint:fix` — ESLint will reorder them automatically    |
| `import/no-duplicates`              | Same module imported twice       | Merge the imports into one statement                               |

---

### Husky hooks not running

**Symptom:** Commits go through without lint-staged output.

**Fix:** Husky hooks are installed via the `prepare` npm script, which runs automatically on `npm install`. If hooks aren't running, re-run:

```bash
npm install
```

If that doesn't help, re-initialize Husky:

```bash
npx husky init
```

Then restore the pre-commit file content (`npx lint-staged`).
