# Mealkit — Claude Handoff

## Project Overview
Mealkit is a React Native + Expo iOS app that scans groceries, generates AI recipes, and tracks nutrition.

- Project path: `~/Desktop/Mealkit/`
- Plan file: `~/Desktop/Mealkit/PLAN.md`
- PRD file: `~/Desktop/Mealkit/Mealkit_MVP_PRD.md`
- Stack: Expo managed workflow, TypeScript strict, expo-router, Zustand, react-native-reanimated
- Platform: iPhone only, iOS 17+

This file is a reality-checked handoff. It describes the code that actually exists on disk.

---

## Current State (as of 2026-04-17)

### Fully Implemented
- Theme system: `src/theme/colors.ts`, `spacing.ts`, `typography.ts`, `animations.ts`
- Root app shell: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`
- App entry routing: `app/index.tsx` — waits for Zustand-persist hydration, then routes to `/onboarding` or `/(tabs)/scan`
- Onboarding: `app/onboarding.tsx` — 4-panel paged scroll (3 editorial value-prop panels + 1 preference panel with diet chips, skill segmented, cuisine chips). Skip on panels 1–3. "Start cooking" commits preferences to `userStore` and marks `onboardingComplete: true`.
- Scan home: `app/(tabs)/scan.tsx` — three scan mode rows, usage meter, session resume card
- Three scan flows: `app/scan/barcode.tsx`, `app/scan/receipt.tsx`, `app/scan/photo.tsx`
- Ingredient list: `app/ingredients.tsx` + `src/stores/ingredientStore.ts` (session-based, not persisted)
- Recipe generation: `src/services/claude.ts` (Claude Sonnet direct calls)
- Recipe browsing: `app/recipes/index.tsx`, `src/components/RecipeSwipeDeck.tsx`, `src/components/RecipeFilterSheet.tsx`, `src/components/RecipeCard.tsx`
- Recipe detail + cooking: `app/recipes/[id].tsx`, `src/components/CookingMode.tsx`
- Nutrition dashboard: `app/(tabs)/nutrition.tsx`, `src/components/CalorieArc.tsx`, `src/components/MacroBar.tsx`, `src/components/WeeklyBars.tsx`, `src/components/GoalSettingModal.tsx`
- Paywall fallback: `app/paywall.tsx` — hero + 4 value props, monthly/annual plan cards, CTA, Restore · Terms · Privacy footer. Wired to RevenueCat helper methods for subscribe/restore, but real purchases still require a development build
- Analytics: `src/services/analytics.ts` — PostHog wired for full scan → recipe → cook → paywall funnel events
- Babel config: `babel.config.js` exists and includes `react-native-reanimated/plugin` — required for the current animation-heavy UI to boot correctly
- Expo runtime compatibility: pin `react-native-reanimated` to `4.1.1`, `react-native-worklets` to `0.5.1`, and `@react-native-async-storage/async-storage` to `2.2.0` to match Expo 54's bundled native modules. Do not loosen these version ranges casually.
- Router/analytics runtime dependencies: keep `expo-linking` and `react-native-svg` installed. Expo Router needs the former; PostHog's survey bundle pulls in the latter even when surveys are not actively used.

### Still Placeholder or Not Wired
- `src/services/superwall.ts` — exists; native Superwall register falls back to `/paywall` when unavailable
- `src/services/healthkit.ts` — helper exists, but nothing in the cook flow calls it yet
- `src/services/nutrition.ts` — placeholder
- `src/utils/api.ts` — placeholder
- `src/utils/formatters.ts` — placeholder
- RevenueCat in Expo Go — intentionally skipped in `purchases.ts`; use a development build or Test Store key for real purchase testing
- Native sharing in Expo Go — `app/recipes/[id].tsx` falls back to React Native's built-in `Share` API because `react-native-share` is not available in Expo Go
- HealthKit and RevenueCat native flows still need a development build for real device/simulator validation

### Partial
- `app/ingredients.tsx` — manual add is there, but animated slide-up entry and empty state shortcuts are not done
- `app/recipes/[id].tsx` — share prompt after "Mark as Cooked" is not implemented
- `app/(tabs)/_layout.tsx` — tabs work, but deep-linking and Pro entitlement gating are pending

---

## Bugs Fixed (all by Codex on 2026-04-17)

1. **Nutrition serving math** — macros were multiplied twice. Fixed in `app/recipes/[id].tsx`.
2. **Local date keys** — UTC slicing shifted meals and monthly resets. Fixed with `src/utils/date.ts`; all day/week/month logic now uses local calendar dates.
3. **Free scan enforcement** — `FREE_SCAN_LIMIT` existed but was never checked or incremented. Fixed in all three scan flows.
4. **Session ingredient behavior** — `ingredientStore` persisted to AsyncStorage; "New Scan" didn't clear state. Converted to in-memory session state.

---

## Monetization Stack (decided 2026-04-17)

| Layer | Responsibility |
|-------|---------------|
| **RevenueCat** | Canonical entitlement backend — subscription state, receipts, restore, cross-device sync |
| **Superwall** | Paywall UI layer — remotely editable without shipping an app update; delegates purchases to RevenueCat |
| **PostHog** | Analytics funnel — already wired; paywall impression/convert/dismiss events flow here |

**Wiring plan:**
1. `_layout.tsx` initializes RevenueCat (user ID) and Superwall (API key + RC purchase controller) on app open
2. Gate hits call `Superwall.register(event: 'scan_limit' | 'recipe_limit')` instead of `router.push('/paywall')`
3. Superwall renders remotely-configured paywall; on purchase hands transaction to RevenueCat
4. `purchases.ts` exposes `isPro()` reading RevenueCat active entitlement; all gate checks consult this for Pro users
5. `app/paywall.tsx` remains as hard fallback for offline / Superwall-failure cases only

---

## What Still Needs To Be Built

### Priority 1 — Monetization (blocks Pro features everywhere)
- Finish development-build validation for RevenueCat and Superwall
- Confirm entitlement behavior in a custom dev build (Expo Go now intentionally skips RevenueCat native setup)
- Replace any remaining direct `/paywall` fallback calls with `presentPaywall(event)` where needed

### Priority 2 — Share Flow
- `src/components/RecipeShareCard.tsx` — composited card (recipe name, AI food photo, stats, wordmark, free-tier watermark)
- DALL-E 3 integration in `openai.ts` — `generateFoodImage()`, cached in recipeStore
- Development build: validate `react-native-view-shot` + `react-native-share` native share-card path end to end
- Expo Go: fallback is plain text share via React Native `Share`
- Share prompt after "Mark as Cooked" in `app/recipes/[id].tsx`

### Priority 3 — Apple Health
- `src/services/healthkit.ts` — `requestHealthPermissions()`, `logNutrition(macros, date)` via `react-native-health`
- Pro-gated on "Mark as Cooked"
- `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` in `app.json`

### Priority 4 — Polish
- Ingredients UX: animated slide-up add, empty-state scan shortcuts
- Before App Store: move Anthropic, OpenAI, USDA calls behind a backend proxy (currently client-side — OK for TestFlight)

---

## Design and Technical Rules
- Use `colors.*` tokens only — no raw hex in components
- Dark mode only
- System font only
- `fontVariant: ['tabular-nums']` on all numeric Text — no exceptions
- `react-native-reanimated` for animations; never the legacy `Animated` API
- `expo-router` for navigation
- Zustand for app state

## Execution Rules
- Delegate mechanical coding tasks to Codex (`codex:codex-rescue`); keep design, color, typography, animation, and layout decisions with Claude
- Use `superpowers:subagent-driven-development` for bounded implementation tasks
- Lead session owns: navigation, cross-store logic, monetization flow, entry screens, handoff docs
- A UI task is not done until it passes a visual quality pass against design rules — not just because it builds
- After any cross-cutting change, update `PLAN.md` and this file in the same turn

## Verification
- `npx tsc --noEmit` passes clean as of 2026-04-18
- No test scripts in `package.json`
- No lint scripts in `package.json`

## Notes For The Next Session
- Trust the codebase and this file over older progress markers
- Treat `PLAN.md` as the current execution map
- Onboarding, scan home, and paywall fallback are all real — do not treat them as placeholders
- RevenueCat helpers and Superwall fallback service exist, but Expo Go skips native purchases on purpose
- PostHog is safe to leave unconfigured in preview builds now; `analytics.ts` uses a disabled placeholder key when `POSTHOG_API_KEY` is absent so the app still boots
- If the app suddenly reports many "missing default export" route warnings, first suspect an earlier module crash; Expo Router emits those warnings secondarily when a route import fails
- Reanimated requires `babel.config.js` with `react-native-reanimated/plugin`; if that file disappears, the app will crash early from animated component imports
- If `react-native-worklets` drifts above Expo 54's bundled version, expect `Exception in HostFunction` crashes from animated imports even when the Babel config is correct
- Expo Go cannot validate the real `react-native-share`, RevenueCat store flow, or HealthKit path; use a development build for those checks
- The four Codex bug fixes on 2026-04-17 are stable — do not re-open them without a regression
- Delegate implementation work to Codex; design stays with Claude
