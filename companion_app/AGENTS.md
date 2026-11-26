# GeM Mobile Companion — Project Guardrails (Always-On)

These rules apply unconditionally to every edit inside `companion_app/`.

## 1. Strict Architecture Boundary (Option 1)
- **Pure Direct `Phone ↔ GeM` UI Layer + Official Portal Handoff.**
- Zero custom backend server and zero Supabase runtime dependency in app screens.
- Zero static/mock/fixture bid or product records displayed in live screens; show honest empty/retry states instead.
- Zero stored user credentials, OTP interception, automated bid placement, or pre-filled dummy PII.
- Authenticated actions (login, bid submission, KYC signup, contract management) must hand off cleanly to verified official `*.gem.gov.in` URLs.

## 2. Scope & Anti-Drift Discipline
- **Never rewrite multiple screens unprompted.** Touch only the exact screen(s) or bug the user asked about.
- **Plan before editing UI.** For any layout or visual redesign, first list the exact files and concrete changes (or ask clarifying questions) and wait for approval before modifying components.
- **One screen / one concern per iteration** unless the user explicitly approves a broader multi-screen plan.
- **Preserve working flows & tokens.** Never change `theme/designTokens.ts` values asserted by tests (`tests/UIWorkflow.test.ts`), navigation structure, or existing working features unless explicitly requested.
- **Keep Dark Mode & Light Mode parity.** Use `useTheme()` (`colors.primary`, `colors.surface`, `colors.textPrimary`, etc.) rather than hardcoded light-only hex colors on dynamic surfaces.

## 3. Verification & Git Hygiene
- Before claiming any task is complete, run and report actual output of:
  1. `npm run typecheck` (`tsc --noEmit`)
  2. `npm test` (all test suites passing)
  3. Android + iOS Metro bundle check when screens/navigation change (`npx expo export:embed`)
- **Never run `git commit` or `git push` unless the user explicitly asks.**
- Never leave temporary files, scratch bundles, or debug logs inside the repository.
