---
name: gem-release-verify
description: >-
  Use this skill before committing, pushing, or preparing a new Android APK and
  iOS IPA build for companion_app via GitHub Actions. Runs full typecheck, unit
  tests, dual-platform Metro bundle builds, and git scope audit.
---

# GeM Mobile Companion Release Verification

Run this checklist before any commit or push to `personal/main`.

## Steps
1. **Audit Scope (`git status` & `git diff --stat`):**
   - Confirm every modified file is strictly within the requested task scope.
   - Ensure no temporary files, credentials, `.env` secrets, or scratch bundles are tracked or untracked in the repo.
2. **Run TypeScript & Unit Tests:**
   ```bash
   cd /Users/giradasaiteja/MiroFish/companion_app
   npm run typecheck
   npm test
   ```
   Require 0 TypeScript errors and 100% passing test suites.
3. **Verify Android & iOS Production Metro Bundles:**
   ```bash
   cd /Users/giradasaiteja/MiroFish/companion_app
   npx expo export:embed --entry-file index.js --platform android --dev false --bundle-output /tmp/gem-a.bundle --assets-dest /tmp/gem-a-assets
   npx expo export:embed --entry-file index.js --platform ios --dev false --bundle-output /tmp/gem-i.bundle --assets-dest /tmp/gem-i-assets
   rm -rf /tmp/gem-a.bundle /tmp/gem-i.bundle /tmp/gem-a-assets /tmp/gem-i-assets
   ```
4. **Check Target Remote Before Pushing:**
   - Only commit and push when explicitly instructed by the user.
   - Push to `personal main` (`https://github.com/saitejagirada/GEM.git`), never to upstream `origin`.
   - Share the commit hash and Actions link (`https://github.com/saitejagirada/GEM/actions`) so the user can download the combined APK + IPA artifact.
