# Mealkit Pre-TestFlight Execution Plan

This plan covers everything that should happen before the Apple/App Store Connect/TestFlight metadata phase. It is meant as a Claude/Codex handoff document: Claude should decide task ownership, then delegate bounded implementation work.

## Current Decision

Mealkit is not ready for 30 external testers yet. It is close enough to start the shipping phase, but the next work should be build-readiness and beta-safety, not more redesign.

Freeze visible redesign work until:
- TypeScript passes.
- A development build runs on the founder's personal iPhone.
- The core scan -> ingredients -> recipes -> cooking -> nutrition loop works on device.
- Beta limits, failed-generation behavior, feedback, and crash reporting are implemented.

## Beta Usage Limit Decision

Do not use the production free-tier limits for TestFlight.

Production free tier can stay:
- 3 scans per month.
- 5 recipe generations per month.

Beta TestFlight limit should be:
- 15 successful scans per month.
- 30 successful recipe generations per month.

Why this is fair:
- It gives each tester enough room for several real grocery/cooking sessions plus retries.
- It avoids testers getting blocked after one bad session.
- It still caps API spend. With 30 testers, the theoretical max is 450 successful scans and 900 successful recipe generations in a month.
- It produces enough product signal without pretending the app has unlimited infrastructure.

Rules:
- Failed scan attempts should not count.
- Failed recipe generations should not count.
- Empty or canceled flows should not count.
- Pro users should still bypass limits.
- Beta limits should be controlled by a build/config flag, not by manually changing production constants before every build.

Recommended implementation:
- Add a beta flag exposed through Expo config, for example `BETA_MODE=true`.
- Centralize limits in one helper/config module.
- In beta mode, use `BETA_SCAN_LIMIT = 15` and `BETA_RECIPE_LIMIT = 30`.
- In production mode, keep `FREE_SCAN_LIMIT = 3` and `FREE_RECIPE_LIMIT = 5`.
- Update copy so beta users see "Beta usage limit reached" rather than a hard monetization upsell if billing is not ready.

## Phase 0 - Freeze And Baseline

Goal: stop churn and create a known-good checkpoint.

Tasks:
- Stop all broad visual redesign work.
- Run `git status` and document the dirty worktree.
- Run `npx tsc --noEmit`.
- Run the simulator once and confirm the app boots.
- Create a checkpoint branch or commit before shipping setup begins.

Owner:
- Claude/lead: decide whether current redesign state is accepted.
- Codex: run checks and report exact failures if any.

Done when:
- There is a clear baseline commit/branch.
- TypeScript passes or the blocking errors are listed.
- No new visual scope is being added.

## Phase 1 - Local Device Build Setup

Goal: get the app running as a real iOS development build on the founder's iPhone. Expo Go is not enough for this app because RevenueCat, Superwall, HealthKit, and native sharing need a native build.

Tasks:
- Install/log in to EAS CLI.
- Add `eas.json`.
- Create three build profiles:
  - `development`: development client for founder's iPhone.
  - `preview`: TestFlight-style internal beta build.
  - `production`: release candidate build.
- Ensure env vars are available to EAS builds by name only:
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `REVENUECAT_API_KEY`
  - `SUPERWALL_API_KEY`
  - `USDA_API_KEY`
  - `POSTHOG_API_KEY`
  - `SENTRY_DSN` if Sentry is added.
  - `BETA_MODE` for preview builds.
- Build a development client with EAS.
- Install and open it on the founder's iPhone.

Owner:
- Founder: Apple Developer account, Apple login, physical iPhone access.
- Codex: add `eas.json`, document env var names, verify config.
- Claude/lead: review that the build profiles match the intended rollout.

Done when:
- Development build installs on the personal iPhone.
- The app opens without Expo Go.
- Native modules no longer need Expo Go fallbacks for the main device test.

## Phase 2 - Fix Beta Usage Limits

Goal: testers can actually use the app enough to give signal, without unlimited API cost.

Tasks:
- Centralize limit values instead of scattering raw constants.
- Add beta mode limits:
  - 15 scans/month.
  - 30 recipe generations/month.
- Preserve production limits:
  - 3 scans/month.
  - 5 recipe generations/month.
- Make all scan gates read from the same limit helper.
- Make all recipe gates read from the same limit helper.
- Confirm Pro users bypass both production and beta limits.
- Update scan home meter copy if necessary so beta builds do not look broken or misleading.

Owner:
- Codex: implementation.
- Claude/lead: review copy and product behavior.

Done when:
- One config switch changes beta vs production limits.
- No flow still imports stale hardcoded limits directly.
- TypeScript passes.

## Phase 3 - Fix Failed Recipe Generation Quota

Goal: users should only lose a recipe generation when they actually receive recipes.

Current problem:
- `app/ingredients.tsx` increments recipe count before `/recipes` actually generates anything.
- If Claude/API/network fails, the user loses quota anyway.

Required behavior:
- Tap "Get Recipes" should not consume quota by itself.
- A successful generation returning at least one valid recipe should consume one recipe generation.
- Failed generation should consume zero.
- Retrying after failure should consume only if retry succeeds.
- Opening an already-existing deck should not consume a new generation.
- Applying filters and successfully regenerating should count as a generation, unless beta/lead decides filters should be free during beta.

Recommended implementation:
- Remove `incrementRecipeCount()` from `handleGetRecipes` in `app/ingredients.tsx`.
- Increment recipe count inside `runGenerate()` in `app/recipes/index.tsx` only after `result.length > 0`.
- Use current store state at increment time to avoid stale closures.
- Add one manual verification case: turn off network or use invalid API key, tap Get Recipes, confirm count does not change.

Owner:
- Codex: implementation.
- Claude: adversarial review of quota edge cases.

Done when:
- Failed generation does not burn quota.
- Successful generation burns exactly one quota unit.
- Retry behavior is predictable.

## Phase 4 - Add In-App Feedback

Goal: 30 testers should not have to text random screenshots to the founder. There must be a clear feedback path inside the app.

Minimum acceptable version:
- A visible "Send feedback" action.
- Opens email or a web form.
- Pre-fills useful diagnostic context:
  - app version
  - platform
  - build type/beta mode
  - current screen if easy
  - short prompt asking what happened and what they expected.

Recommended UI placement:
- Add a small feedback action on the Nutrition screen header or settings/goals area.
- Add a secondary feedback link on scan home footer if it does not crowd the UI.
- Do not build a full feedback inbox inside the app for MVP.

Recommended implementation:
- Add `src/services/feedback.ts`.
- Use `Linking.openURL()` with either:
  - `mailto:` to the founder/support inbox, or
  - a Google Form / Tally / Typeform URL.
- If using email, prefill subject like `Mealkit beta feedback`.

Owner:
- Claude/lead: choose email vs form and approve exact copy.
- Codex: implement the service and one or two entry points.

Done when:
- A tester can send feedback in under 10 seconds from inside the app.
- The feedback includes enough context to debug.

## Phase 5 - Add Crash Reporting

Goal: if 30 testers crash, the founder sees real error reports instead of vague complaints.

Recommended tool:
- Sentry, because it is common for React Native/Expo and faster than building a custom logging pipeline.

Tasks:
- Add Sentry dependency.
- Add `SENTRY_DSN` env handling.
- Initialize Sentry in the root app entry/layout.
- Wrap the root component if required by the SDK.
- Confirm a test error appears in Sentry before inviting testers.
- Keep PostHog for product analytics; do not treat PostHog as crash reporting.

Owner:
- Codex: install/wire Sentry after checking current Expo-compatible instructions.
- Claude: review privacy implications and App Privacy questionnaire impact.
- Founder: create Sentry project and provide DSN through EAS secret.

Done when:
- One deliberate test error is visible in Sentry.
- App still boots on simulator and development build.
- App privacy notes are updated if Sentry collects diagnostics.

## Phase 6 - Real iPhone MVP Smoke Test

Goal: prove the MVP on the founder's actual phone before 30 people touch it.

Test these flows manually:

1. First launch
- Fresh install opens onboarding.
- Skip works.
- Preference completion works.
- Relaunch goes to scan home, not onboarding.

2. Manual ingredient path
- Add two manual ingredients.
- Remove one ingredient.
- Relaunch app.
- Remaining ingredient persists.

3. Barcode path
- Grant camera.
- Scan a common packaged food barcode.
- Confirm success state.
- Try an unknown barcode or failed lookup.
- Confirm manual fallback still lets user add the item.

4. Receipt path
- Photograph a real grocery receipt.
- Confirm extracted food items appear.
- Deselect items.
- Add selected items to ingredient list.
- Confirm canceled/empty result does not count as a scan.

5. Counter photo path
- Photograph visible ingredients.
- Pick a photo from library.
- Deny camera and verify library mode still works.
- Add and remove quick-add items.

6. Recipe generation
- Tap Get Recipes with normal ingredients.
- Confirm recipe deck appears.
- Tap recipe detail.
- Confirm macro data and ingredients render.
- Try weird ingredients and offline mode.
- Confirm failures do not consume quota.

7. Cooking and nutrition
- Start cooking mode.
- Advance steps.
- Mark as cooked.
- Confirm nutrition dashboard updates.
- Relaunch app.
- Confirm nutrition log persists.

8. Paywall / limits
- Hit beta scan limit using test state or lowered local limit.
- Confirm beta copy is clear.
- Confirm Pro bypass still works in a native build if purchases are testable.

9. Feedback and crash reporting
- Send a feedback report.
- Trigger/verify one test crash or captured exception in Sentry.

Owner:
- Founder: physical phone testing.
- Claude: write final manual QA checklist for the exact build.
- Codex: fix reproducible bugs found during smoke test.

Done when:
- Founder can complete one full loop on phone:
  scan -> ingredient list -> generate recipe -> cook -> nutrition log -> relaunch persistence.

## Phase 7 - Pre-TestFlight Gate

Do not invite 30 testers until all of these are true:

- The app installs on founder's iPhone as a development/native build.
- TypeScript passes.
- Core loop works on device.
- Beta limits are implemented and fair.
- Failed recipe generation does not consume quota.
- Feedback is available in app.
- Crash reporting is live.
- EAS preview build can be created.
- No active redesign task is modifying the same screens being stabilized.

## Delegation Matrix

Lead / Claude should own:
- Final decision on whether beta limits are 15/30 or need adjustment.
- Feedback copy and placement.
- Whether beta builds should show paywall at all.
- Manual QA checklist acceptance.
- Final adversarial review before TestFlight.

Codex should own:
- `eas.json` setup.
- Central beta/production limit config.
- Failed recipe generation quota fix.
- Feedback service implementation.
- Sentry wiring.
- TypeScript/build verification.
- Small targeted bug fixes found during phone smoke test.

Founder should own:
- Apple Developer account.
- EAS/Expo account login.
- Creating external service accounts/projects.
- Supplying env vars as EAS secrets.
- Running the real iPhone smoke test.
- Deciding when to invite the 30 testers.

## Explicit Non-Goals For This Phase

Do not spend time on these before the first TestFlight beta:
- More redesign polish.
- Micronutrients.
- Web recipe links.
- Favorites/saved recipes unless relaunch loss becomes a blocker.
- Full HealthKit polish beyond deciding whether to hide or wire the claim.
- Paid ads or UGC strategy.
- App Store screenshots.
- App Store public launch metadata beyond what is required for beta.

## Suggested Task Order

1. Freeze/checkpoint repo.
2. Run TypeScript and simulator smoke test.
3. Add `eas.json`.
4. Add beta mode limit config.
5. Fix failed recipe generation quota.
6. Add in-app feedback.
7. Add Sentry.
8. Build development client.
9. Run full phone smoke test.
10. Fix only bugs that block the core loop.
11. Create preview/TestFlight candidate build.
