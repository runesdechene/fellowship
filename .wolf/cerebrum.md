# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-04-04

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** flwsh
- **Description:** This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
- **Test Infrastructure:** Uses Vitest + React Testing Library for unit testing. Path alias (@/) is configured in vitest.config.ts.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

[2026-04-04] `react-hooks/set-state-in-effect` fires on DIRECT synchronous setState calls in useEffect bodies, NOT on calling an async function from within useEffect. Suppress with `// eslint-disable-next-line react-hooks/set-state-in-effect` on the specific setState line.

[2026-04-04] `react-hooks/immutability` (use-before-declare) fires when a `function` declaration is called before it's textually declared in a hook. Fix by converting to `useCallback` const, or by adding `// eslint-disable-next-line react-hooks/exhaustive-deps` above the useEffect.

[2026-04-04] `react-hooks/preserve-manual-memoization` fires when `useCallback` deps use optional chaining (e.g., `filters?.year`). The compiler infers `filters` as the dep but we specify `filters?.year`. Avoid useCallback with optional-chained props deps; use eslint-disable on the useEffect instead.

[2026-04-04] When removing a prop from a component, check all call sites for TS type errors — removing `onClose` from `NotificationPanel` broke `NotificationBell.tsx` which passed `onClose`. Keep optional props even if unused internally.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
