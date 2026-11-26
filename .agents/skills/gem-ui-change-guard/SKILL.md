---
name: gem-ui-change-guard
description: >-
  Use this skill before making ANY UI, layout, styling, or navigation change in
  companion_app. Enforces spec-first planning, screen-by-screen user approval,
  token preservation, and build verification so changes never go out of bounds.
---

# GeM UI Change Guard (Spec-First, Surgical UI Workflow)

Follow this workflow whenever the user requests visual, layout, UX, or screen reorganization changes in `companion_app/`.

## Step 1: Inspect Before Proposing
1. Read the target screen file(s) completely — never guess component structure or styles.
2. Read `companion_app/theme/designTokens.ts` and check `companion_app/tests/UIWorkflow.test.ts` so locked design tokens are never broken.
3. If the user shared screenshots, inspect every screenshot and list the exact visual defects observed.

## Step 2: Lock Scope With the User First (Mandatory for Multi-Screen or Redesign Requests)
Before editing code on any broad or ambiguous UI request (e.g., "improve the UI", "reorganize pages"):
1. Propose a concise **Screen-by-Screen Change Plan** covering:
   - Exact screen file(s) to modify (start with **1–2 screens max** unless the user asks for more).
   - What stays untouched (e.g., bottom nav, header, working modals).
   - Exact layout changes in plain bullets (or ASCII layout).
2. Ask the user to approve or adjust the plan (use `ask_question` if key layout choices are ambiguous).
3. **Do not start editing unrelated screens** outside the approved scope.

## Step 3: Implement Surgically
1. Edit only the approved screen(s).
2. Use `useTheme()` colors (`colors.primary`, `colors.surface`, `colors.surfaceSubtle`, `colors.textPrimary`, `colors.textSecondary`, `colors.border`) so both Light Mode and Dark Mode remain readable.
3. Keep all existing live data hooks, inline PDF viewers, and official GeM portal handoffs working.
4. Avoid decorative emojis, fake avatars, dummy PII, or dead `Alert.alert` placeholders.

## Step 4: Verify Before Responding
Run all checks in `companion_app/`:
```bash
cd /Users/giradasaiteja/MiroFish/companion_app
npm run typecheck
npm test
```
Verify production bundles compile cleanly for both Android and iOS:
```bash
npx expo export:embed --entry-file index.js --platform android --dev false --bundle-output /tmp/gem-a.bundle --assets-dest /tmp/gem-a-assets
npx expo export:embed --entry-file index.js --platform ios --dev false --bundle-output /tmp/gem-i.bundle --assets-dest /tmp/gem-i-assets
rm -rf /tmp/gem-a.bundle /tmp/gem-i.bundle /tmp/gem-a-assets /tmp/gem-i-assets
```
Report `git diff --stat` so the user sees the exact footprint before committing or pushing.
