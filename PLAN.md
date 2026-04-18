# Mealkit — Build Plan

## Project Overview
Mealkit is a React Native (Expo) iOS app that scans groceries via receipt photo, barcode, or counter photo, generates AI recipes, and tracks nutrition automatically. Monetized via RevenueCat subscriptions.

**Project path:** `~/Desktop/Mealkit/`
**Stack:** Expo managed workflow, TypeScript strict, expo-router, Zustand, react-native-reanimated
**iOS only** — iOS 17+ minimum

---

## Runtime Notes (2026-04-18)
- `babel.config.js` is required and must include `react-native-reanimated/plugin`. Without it, animated imports crash early and Expo Router emits misleading "missing default export" route warnings.
- Keep `react-native-reanimated` pinned to `4.1.1`, `react-native-worklets` pinned to `0.5.1`, and `@react-native-async-storage/async-storage` pinned to `2.2.0` for Expo 54 compatibility. A looser semver range can reinstall incompatible JS/native pairs and resurrect the HostFunction crash.
- Keep `expo-linking` and `react-native-svg` present in `package.json`; Expo Router and PostHog's survey bundle resolve them at load time.
- Expo Go is only a preview shell for this repo. It can boot the JS app, but it is not the right place to validate real RevenueCat purchases, HealthKit writes, or `react-native-share`.
- `src/services/purchases.ts` now intentionally skips native RevenueCat configuration in Expo Go to avoid invalid-key/runtime errors there. Real purchase testing belongs in a development build.
- `app/recipes/[id].tsx` now falls back to React Native's built-in `Share` API when the native share-card stack is unavailable, so the route can still load in Expo Go.
- `src/services/analytics.ts` must not instantiate PostHog with an empty key; preview builds use a disabled placeholder key instead.

---

## Bismillah / Alhamdulillah Rule
- Say **bismillah** before every crucial step (builds, commits, writing a major file, wiring navigation)
- Say **alhamdulillah** when something goes well (build succeeds, tests pass, task complete)

---

## Mandatory Checkpoint Rule
**Stop and check in with the user after every 3 completed tasks. No exceptions.**
- After completing 3 tasks → STOP, report what was built, ask "ready to continue?"
- Repeat for every batch of 3
- On final tasks → STOP, final report

---

## Mandatory Skills
Invoke these skills before writing ANY view or component code. Not optional.

| Skill | What it owns | When to invoke |
|-------|-------------|----------------|
| **ui-ux-pro-max** | Touch targets (≥44pt), spacing rhythm, navigation patterns, accessibility, haptics, safe areas | Before any screen or component |
| **impeccable** | Color tokens, typography bans, motion bans (no gradient text, no side-stripe borders, no glassmorphism), spatial rules | Before any color, font, or layout decision |
| **emil-design-eng** | Animation precision: custom easings, spring configs, scale(0.95) not scale(0), exit faster than enter, stagger timing | Before any animation or transition |
| **context7** | Up-to-date docs for React Native, Expo, and all npm packages | Before using any library or API not already used this session |
| **superpowers:subagent-driven-development** | One subagent per task. Spec compliance review → code quality review after each task before marking done | For all task execution |

**Workflow:** Before any view → ui-ux-pro-max query → impeccable rules → Emil animation rules → write code. No shortcuts.

**Design tasks:** Pause and ask user to set effort to maximum before proceeding.

---

## Project Execution Rules

These rules are Mealkit-specific. They exist because subagent-driven development has been productive here, but the repo also showed design drift, integration drift, and stale handoff docs.

### Keep Superpowers, But Tighten Control
- Continue using `superpowers:subagent-driven-development` for bounded implementation tasks.
- Follow the actual Superpowers order: implementer subagent → spec compliance review → code quality review.
- For Mealkit UI work, add one more gate after code review: a lead-session visual review against the design rules in this file before marking the task done.
- Do not let implementer subagents invent product behavior or visual direction from scratch when the task is user-facing.

### What Must Stay Lead-Owned
- The lead session should own app-shell decisions, navigation changes, and cross-cutting product logic.
- The lead session should own `app/(tabs)/scan.tsx`, `app/onboarding.tsx`, and `app/paywall.tsx` direction, because these define first impression, monetization, and flow.
- The lead session should own cross-store logic, entitlement/gating rules, and docs/memory reconciliation.
- Subagents should implement bounded slices. The lead should integrate, verify, and decide.

### UI Task Rule
- Before dispatching a subagent on any visible screen or component, write a short design brief in the task context:
  - screen goal
  - information hierarchy
  - key states: default, loading, empty, error
  - interaction model
  - visual direction in plain language
- If those five things are not defined, the task is not ready for subagent implementation.
- React Native will improve iteration speed here, but it will not automatically improve taste. Taste must be specified.

### Definition Of Done For UI
- A UI task is not done just because it compiles.
- A UI task is only done when:
  - it follows `colors.*`, spacing, typography, and motion rules
  - it has intentional hierarchy and does not look generic or placeholder-heavy
  - it includes loading, empty, and error states where relevant
  - tap targets are at least 44pt and safe areas are handled
  - copy is product-quality, not scaffolding copy
  - the lead session has done a final visual pass and accepted it

### Best Use Of Subagents In This Repo
- Good subagent tasks:
  - isolated services
  - isolated Zustand store work
  - bounded component implementation
  - targeted bug fixes
  - test additions
  - file-scoped refactors
- Bad subagent tasks unless the lead pre-specifies them tightly:
  - app entry flow design
  - onboarding UX
  - paywall UX
  - navigation architecture changes
  - broad visual redesigns
  - multi-screen polish passes

### Integration Discipline
- After any task that touches more than one store, more than one route, or a user-facing quota/gating rule, run an integration audit before moving on.
- The audit must check all call sites, not just the edited file.
- If behavior changed, update `PLAN.md` and `CLAUDE.md` in the same turn.
- If a bug was fixed, record:
  - what was wrong
  - what changed
  - current state after the fix
  - whether the fix was done by Codex or Claude

### Parallelism Rule
- Do not run multiple implementer subagents in parallel on overlapping files.
- Split by write ownership, not by vague feature area.
- If two tasks would both touch navigation, shared stores, or the same screen, sequence them instead of parallelizing them.

### Recommended Mealkit Workflow
1. Lead session defines the task and, for UI work, writes the mini design brief.
2. Implementer subagent executes one bounded task.
3. Spec reviewer checks scope correctness.
4. Code quality reviewer checks implementation quality.
5. Lead session performs visual/integration review.
6. Update docs if project state changed.

---

## AI Services — Hard Split

| Task | Service | Model |
|------|---------|-------|
| Recipe generation | Claude API | `claude-sonnet-4-6` |
| Receipt OCR + classification | OpenAI API | `gpt-4o-mini` |
| Counter photo ingredient ID | OpenAI API | `gpt-4o-mini` |
| Food image generation (sharing) | OpenAI API | DALL-E 3 |

**Never use Claude for receipt/photo tasks. Never use OpenAI for recipe generation.**

---

## API Keys
All keys in `.env` at project root (gitignored). Access via `expo-constants`.

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `REVENUECAT_API_KEY`
- `USDA_API_KEY`

---

## Paywall Architecture

**Two-layer monetization stack:**

| Layer | Responsibility | Why |
|---|---|---|
| **Superwall** | Paywall UI / presentation | Edit paywall copy, pricing display, layout, and A/B tests from the Superwall dashboard without shipping an app update |
| **RevenueCat** | Entitlements + receipts | Canonical subscription state, cross-device sync, restore purchases, store-receipt validation. Superwall delegates purchase calls to RevenueCat. |
| **PostHog** | Analytics | Already wired in `src/services/analytics.ts`. Paywall impression/convert/dismiss events flow here for funnel analysis. |

**Install:**
- `react-native-purchases` ✅ already in `package.json`
- `@superwall/react-native-superwall` ⬜ needs install
- `posthog-react-native` ✅ already in `package.json`

**Flow:**
1. On app open, `_layout.tsx` initializes **RevenueCat** (user id) and **Superwall** (api key, purchase controller = RevenueCat).
2. Gated action (scan limit or recipe limit hit) calls `Superwall.shared.register(event: 'scan_limit')` instead of `router.push('/paywall')`.
3. Superwall renders the remotely-configured paywall. On purchase, Superwall hands the transaction to RevenueCat. RevenueCat updates entitlements.
4. `purchases.ts` exposes `isPro()` reading RevenueCat's active entitlement. All gate checks consult this instead of local scan counts for Pro users.
5. PostHog receives `paywall_viewed`, `paywall_converted`, `paywall_dismissed` alongside the existing funnel events.

**Free tier:** 3 scans + 5 recipe generations per month (enforced locally via `userStore` for non-Pro only).
**Pro:** unlimited scans/recipes, micronutrients, Apple Health sync, watermark-free share cards.

**Fallback:** `app/paywall.tsx` is still implemented as a native screen and kept as a hard fallback for offline or Superwall-failure cases. Primary presentation is always Superwall.

---

## Design System — Non-Negotiable Rules

### Colors
- **All colors use `colors.*` tokens** — never raw hex in components. No exceptions.
- Dark mode only — set at app level, never overridden
- Color token file: `src/theme/colors.ts`

| Token | Value | Use |
|-------|-------|-----|
| `background` | `#0C120E` | App background |
| `surface` | `#141A15` | Cards, inputs |
| `surfaceElevated` | `#1C241D` | Sheets, popovers |
| `text` | `#E8EDE9` | Primary text |
| `textSecondary` | `#9FA89F` | Labels, captions |
| `textDisabled` | `#5A635B` | Disabled states |
| `accent` | `#3DB85A` | CTAs, match %, success (10% rule) |
| `accentDim` | `rgba(61,184,90,0.12)` | Accent background tint |
| `onAccent` | `#FFFFFF` | Text/icons on accent surfaces only |
| `border` | `rgba(255,255,255,0.08)` | Standard hairline border |
| `borderStrong` | `rgba(255,255,255,0.14)` | Emphasized border |
| `error` | `#E05252` | Error states |
| `scrim` | `rgba(0,0,0,0.6)` | Modal overlays |

**Macro colors:** `protein` #6B9FE4 / `carb` #E4A96B / `fat` #D4C56B / `fiber` #9FD4A0

**Banned color patterns:**
- Raw `#000000` or `#FFFFFF` anywhere in component code
- Cyan-on-dark, purple-to-blue gradients, neon glows
- Gradient-filled text (`background-clip: text`)
- Side-stripe accent borders (`border-left/right > 1px` with an accent color)
- Glassmorphism used decoratively

### Typography
- **System font only** — no external font packages
- `fontVariant: ['tabular-nums']` on **all** numeric Text (calories, macros, timers, counts, percentages) — absolute rule, no exceptions
- Type scale: 12 / 14 / 16 / 20 / 24 / 32. Body text minimum 16pt.
- Presets in `src/theme/typography.ts`

**Banned fonts:** Inter, Syne, IBM Plex, Space Grotesk, DM Sans (and all fonts on the impeccable reflex list)

### Animations (Emil Kowalski system)
All animations via `react-native-reanimated`. Never use the old `Animated` API.

| Animation | Config |
|-----------|--------|
| Enter | `withTiming(val, { duration: 350, easing: Easing.bezier(0.16, 1, 0.3, 1) })` |
| Exit | `withTiming(val, { duration: 220, easing: Easing.bezier(0.7, 0, 0.84, 0) })` |
| Toggle | `withTiming(val, { duration: 250, easing: Easing.bezier(0.65, 0, 0.35, 1) })` |
| Button press | `scale(0.97)`, 160ms expo-out |
| Spring (sheets/modals) | `withSpring(val, { damping: 20, stiffness: 200, mass: 1 })` |
| List stagger | `withDelay(getStaggerDelay(index), withTiming(...))` — 40ms/item, capped 300ms |

**Animation rules:**
- **Never** start from `scale(0)` — always `scale(0.95) + opacity(0)`
- **Exit is always faster than enter** (220ms vs 350ms)
- **Stagger = `withDelay()`** — never extend duration to fake stagger
- **Never animate** `width`, `height`, `padding`, `margin` — only `transform` and `opacity`
- **No bouncy springs** — damping must be ≥ 15, no visible overshoot
- **`useCallback` hooks** must be declared before any conditional early returns (Rules of Hooks)

### Layout
- 4pt spacing scale: `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32, xxxl=48, xxxxl=64`
- All tap targets **≥ 44×44pt** (enforced by PressableScale via `minWidth`/`minHeight` + `hitSlop`)
- Safe areas via `useSafeAreaInsets()` for all edge content
- Skeleton screens (not spinners) for any async operation >300ms
- No cards nested inside cards
- Not every row needs a card — use dividers + spacing

### The AI Slop Test
Before marking any view done: "Would someone immediately say an AI made this?"
Eliminate: every section in a card, all cards same size, purple-blue gradient accents, side-stripe borders, modal for every sub-action, rounded rect with generic drop shadow everywhere.

---

## Technical Rules
- TypeScript strict mode — no `any` casts, no suppressed errors without a comment
- `expo-router` for all navigation — no React Navigation used directly
- Zustand for all global state — no Redux, no Context API for state management
- All API calls `async/await` with proper error handling and loading states
- All services are singleton modules (export functions, not classes)
- Commit after each task: conventional commit format (`feat:`, `fix:`, `refactor:`)
- Non-greedy JSON regex for AI response parsing: `/\[[\s\S]*?\]/`
- `clearTimeout` in both success and catch paths (no dangling timers)

---

## File Structure

```
Mealkit/
├── app/
│   ├── _layout.tsx               # Root layout — providers, store hydration
│   ├── index.tsx                 # Entry → waits for Zustand hydration → /onboarding or /(tabs)/scan
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Custom tab bar
│   │   ├── scan.tsx              # Scan home (mode picker)
│   │   └── nutrition.tsx         # Nutrition dashboard
│   ├── scan/
│   │   ├── receipt.tsx           # Receipt scan
│   │   ├── barcode.tsx           # Barcode scan
│   │   └── photo.tsx             # Counter photo scan
│   ├── ingredients.tsx           # Ingredient list + Get Recipes CTA
│   ├── recipes/
│   │   ├── index.tsx             # Swipeable recipe cards
│   │   └── [id].tsx              # Recipe detail + cooking mode
│   ├── onboarding.tsx            # 4-panel onboarding (3 value props + preferences)
│   └── paywall.tsx               # Fallback paywall (Superwall is primary)
├── src/
│   ├── services/
│   │   ├── claude.ts             # Claude — recipe generation ONLY
│   │   ├── openai.ts             # OpenAI — receipt OCR + photo ID ONLY
│   │   ├── barcode.ts            # Open Food Facts + USDA lookup
│   │   ├── healthkit.ts          # Apple HealthKit write
│   │   └── purchases.ts          # RevenueCat
│   ├── stores/
│   │   ├── ingredientStore.ts    # Session ingredient list
│   │   ├── recipeStore.ts        # Generated recipes + filters
│   │   ├── nutritionStore.ts     # Daily nutrition log
│   │   └── userStore.ts          # Onboarding state, scan counts, prefs
│   ├── theme/
│   │   ├── colors.ts             # Color tokens (source of truth)
│   │   ├── spacing.ts            # 4pt scale
│   │   ├── typography.ts         # Font presets
│   │   └── animations.ts         # Emil easing constants
│   ├── components/
│   │   ├── PressableScale.tsx    # scale(0.97) press, ≥44pt target
│   │   ├── SkeletonLoader.tsx    # Shimmer placeholder
│   │   ├── EmptyState.tsx        # Icon + heading + body + action
│   │   ├── MacroChip.tsx         # Macro pill, tabular-nums
│   │   ├── IngredientRow.tsx     # Swipeable ingredient list row
│   │   ├── RecipeCard.tsx        # Recipe summary card
│   │   └── RecipeShareCard.tsx   # Composited share card
│   └── utils/
│       └── formatters.ts         # Number/date formatters
├── .env                          # API keys (gitignored)
├── app.json
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── PLAN.md                       # This file
```

---

## Progress Key
- ✅ Done
- 🟡 Partial
- ⬜ Not started
- 🛠 Fixed by Codex

---

## Phase 1 — Foundation

**Status:** ✅ Done

### Task 1.1 — Project Init + Package Install

**Status:** ✅ Done
- Expo blank TypeScript template
- All packages installed (expo-camera, expo-haptics, reanimated, zustand, async-storage, etc.)
- `tsconfig.json`: strict mode, `@/` → `src/` path alias
- `.env.template` with all 4 key placeholders
- `app.json`: iOS 17+, `com.mealkit.app` bundle ID, camera/health permissions, dark interface style, splash `#0C120E`
- Full directory skeleton created

**Commit:** `feat: project scaffold, packages, env template, app config`

### Task 1.2 — Theme System + Shared Components

**Status:** ✅ Done
- `src/theme/colors.ts` — full OKLCH-derived token palette (see Design System above)
- `src/theme/spacing.ts` — 4pt scale xs→xxxxl
- `src/theme/typography.ts` — 12 presets, System font, tabular-nums on all mono variants, no `color` in display variant
- `src/theme/animations.ts` — TIMING_ENTER/EXIT/TOGGLE/BUTTON/FAST, SPRING_CONFIG, getStaggerDelay()
- `src/components/PressableScale.tsx` — scale(0.97), minWidth/minHeight 44, hitSlop 8pt all sides
- `src/components/SkeletonLoader.tsx` — opacity pulse 0.4→0.9, 900ms, repeat(-1, true)
- `src/components/EmptyState.tsx` — mount animation scale(0.95→1) + opacity
- `src/components/MacroChip.tsx` — 5 macro types, defaultUnit per type, Math.round values, tabular-nums

**Commit:** `feat: theme system, animations constants, shared base components`

### Task 1.3 — Navigation Skeleton + Root Providers

**Status:** ✅ Done
- `app/_layout.tsx` — GestureHandlerRootView → SafeAreaProvider → StatusBar(light) → Stack
- `app/(tabs)/_layout.tsx` — custom tab bar with PressableScale, hairline top border, theme colors, `accessibilityRole="tab"`, CommonActions.navigate with target key
- `app/index.tsx` — still `<Redirect href="/(tabs)/scan" />`; onboarding redirect remains a Phase 5 item
- Initial placeholder route skeleton was created and then built on in later phases

**Commit:** `feat: navigation skeleton, root providers, all route placeholders`

---

## Phase 2 — Three Scan Modes

**Status:** ✅ Done

### Task 2.1 — Barcode Scan

**Status:** ✅ Done
- `app/scan/barcode.tsx` — CameraView with `barcodeScannerSettings: { barcodeTypes: ['ean13','upc_a','ean8','upc_e'] }`
- `src/services/barcode.ts` — Open Food Facts API → USDA FoodData Central fallback, `fetchWithTimeout` (5s AbortController), brand name cleaning regex
- Race-condition-safe dedup: two ref Sets (`scannedBarcodes` + `processingBarcodes`), synchronous check before any await
- Haptics: `ImpactFeedbackStyle.Rigid` on detection, `NotificationFeedbackType.Success/Error` on result
- `ScannedItemRow` outside parent component, `withDelay` stagger enter
- List: `ScrollView` with `keyboardShouldPersistTaps="handled"`
- Done handler: strips `id` + `pending` before passing to `addIngredient`
- Scan frame: 260×160pt, `borderRadius:12`, 2pt solid `colors.accent` border
- 🛠 Fixed by Codex on 2026-04-17: free scan count is now checked and incremented, and limit-reached state routes to `/paywall`

**Commit:** `feat: barcode scan mode, Open Food Facts + USDA lookup, haptics`

### Task 2.2 — Receipt Scan

**Status:** ✅ Done
- `app/scan/receipt.tsx` — 4 states: `camera | processing | review | error`
- `src/services/openai.ts` — `extractReceiptIngredients(base64Image)`: gpt-4o-mini vision, brand-stripping system prompt, 30s timeout, non-greedy JSON regex `/\[[\s\S]*?\]/`, returns `[]` on any error
- Processing: 4 SkeletonLoader rows, no spinner
- `CheckboxRow` outside parent; `withDelay(delay, withTiming(1, TIMING_ENTER))` stagger
- All items checked by default; "Add X items" disabled at zero checked
- `addBtnText` uses `fontVariant: ['tabular-nums']`
- Only checked items passed to ingredientStore
- 🛠 Fixed by Codex on 2026-04-17: free scan count is now checked and incremented, and limit-reached state routes to `/paywall`

**Commit:** `feat: receipt scan, OpenAI vision OCR, ingredient extraction + review checklist`

### Task 2.3 — Counter Photo Scan

**Status:** ✅ Done
- `app/scan/photo.tsx` — 4 states: `camera | processing | review | error`
- `src/services/openai.ts` — `identifyCounterIngredients(base64Image)`: gpt-4o-mini vision, generic-names prompt, 30s timeout, non-greedy JSON regex, `clearTimeout` in both success and catch paths
- `RemovableRow` outside parent: `scale(0.95→1)` + `opacity(0→1)` + `translateY(8→0)` stagger enter; matching exit (scale→0.95, opacity→0, translateY→-8) then filter after `TIMING_EXIT.duration`
- Quick-add: TextInput + add-circle button; items **prepended** with `source:'manual'`, `category:'other'`
- Done header button + bottom CTA, both disabled at `items.length === 0`
- All `useCallback` hooks declared before permission early returns (Rules of Hooks compliant)
- No raw hex: `colors.onAccent` used for text/icons on accent surfaces
- 🛠 Fixed by Codex on 2026-04-17: free scan count is now checked and incremented, and limit-reached state routes to `/paywall`

**Commit:** `feat: counter photo scan, OpenAI multi-item ID, review + quick-add`

---

## Phase 3 — Ingredient List + Stores + Recipe Generation

**Status:** 🟡 Partial

### Task 3.1 — Zustand Stores

**Status:** ✅ Done
- `src/stores/ingredientStore.ts` — `{ id, name, category, source, nutrition? }`, actions: add/remove/clear/setFromScan
- `src/stores/recipeStore.ts` — recipes array, loading state, filters `{ cuisine, dietary, cookTime, difficulty, calorieRange }`, current index
- `src/stores/nutritionStore.ts` — daily log entries `{ recipeId, servings, date, macros }`, daily totals, weekly summary, AsyncStorage persistence
- `src/stores/userStore.ts` — onboarding flag, preferences `{ dietaryRestrictions[], skill, cuisines[], dailyCalorieTarget, dailyMacroTargets }`, scanCount, recipeCount, lastResetMonth, AsyncStorage persistence
- AsyncStorage-backed hydration is active for recipe, nutrition, and user state; ingredient state is session-based by design
- 🛠 Fixed by Codex on 2026-04-17: ingredientStore is now session-based instead of persisted, matching the PRD
- 🛠 Fixed by Codex on 2026-04-17: monthly reset now uses local month keys instead of UTC month slicing

### Task 3.2 — Ingredient List Screen

**Status:** 🟡 Partial
- `app/ingredients.tsx` — full ingredient list UI `✅`
- Top: count summary + source badges (receipt/barcode/photo icons) `✅`
- `src/components/IngredientRow.tsx` — name, category, remove button; exit animation: `opacity→0 + translateX` via TIMING_EXIT, filter after duration `✅`
- Manual add: TextInput at bottom `✅`; animated slide-up entry `⬜`
- Empty state: "Nothing scanned yet" with EmptyState component `✅`; scan mode shortcuts `⬜`
- CTA: "Get Recipes" PressableScale — disabled if list empty `✅`; currently checks recipe count and routes to `/paywall` on free-limit hit `✅`
- "New Scan" navigates back to `(tabs)/scan` `✅`
- 🛠 Fixed by Codex on 2026-04-17: "New Scan" now clears the current ingredient session before navigating away

### Task 3.3 — Claude Recipe Generation Service

**Status:** ✅ Done
- `src/services/claude.ts` — `generateRecipes(ingredients, filters, preferences): Promise<Recipe[]>`
- Model: `claude-sonnet-4-6` via direct Anthropic Messages API call
- Structured prompt with ingredient list, preferences, filter constraints, daily macro budget
- JSON response schema: `Recipe { id, name, ingredients[{name,quantity,unit}], steps[], cookTime, prepTime, difficulty, servings, nutrition{calories,protein,carbs,fat,fiber,sugar}, chefTips[], ingredientMatch{percent,missing[],substitutions}, aiReasoning }`
- Returns 3-5 recipes ranked by ingredient match %
- Retry once on failure, typed response validation

**Phase 3 checkpoint → stop, report, wait for go.**

---

## Phase 4 — Recipe UI + Cooking Mode + Nutrition Tracking

**Status:** 🟡 Partial

### Task 4.1 — Recipe Cards UI

**Status:** ✅ Done
- `app/recipes/index.tsx` — skeleton while Claude generates, then swipeable card stack
- `src/components/RecipeCard.tsx` — recipe name, cook time, difficulty badge, calories, macros row (MacroChip), ingredient match % badge, AI reasoning (one sentence), "Missing: X items"
- Horizontal swipe stack (react-native-gesture-handler PanGesture), cards stagger-enter on load
- "Surprise me" card at end of stack
- Filter bottom sheet: cuisine, dietary, cook time, difficulty, calorie range — re-triggers generation on apply
- Tap card → `app/recipes/[id].tsx`

### Task 4.2 — Recipe Detail + Cooking Mode

**Status:** 🟡 Partial
- `app/recipes/[id].tsx` — hero section (name, stats bar, ingredient match %), ingredients list with quantities, serving size stepper (scales all quantities), chef tips `✅`
- "Start Cooking" → cooking mode (full-screen overlay) `✅`
- Cooking mode: step-by-step text, progress indicator, prev/next nav, `expo-keep-awake`, countdown timer per step `✅`
- "Mark as Cooked" → `nutritionStore.logMeal` → celebration micro-animation `✅`
- Share prompt after cook completion `⬜`
- 🛠 Fixed by Codex on 2026-04-17: logged meal macros no longer double-count after serving-size changes
- 🛠 Fixed by Codex on 2026-04-17: recipe detail now uses local date keys for today's nutrition fit

### Task 4.3 — Nutrition Dashboard + Goal Setting

**Status:** ✅ Done
- `app/(tabs)/nutrition.tsx` — daily view: date header with prev/next, calorie arc, macro bars, "X remaining"
- Logged meals list: recipe name, time, calories, macros, servings
- Goal setting modal: stepper inputs for calorie + macro targets → saved to userStore
- Weekly tab: 7-day bar chart, best/worst day, top sources
- Recipe detail pre-cooking: "How does this fit my day?" mini macro breakdown
- 🛠 Fixed by Codex on 2026-04-17: nutrition day/week logic now uses local date keys instead of UTC slicing

**Phase 4 checkpoint → stop, report, wait for go.**

---

## Phase 5 — Sharing + Apple Health + Paywall + Onboarding

**Status:** 🟡 Partial

### Task 5.1 — Recipe Card Sharing

**Status:** ⬜ Not started
- DALL-E 3 integration in `openai.ts` — `generateFoodImage(recipeName, ingredients)`, cached in recipeStore
- `src/components/RecipeShareCard.tsx` — 1080×1920 logical px: recipe name, AI food photo, stats, Mealkit wordmark; free tier watermark overlay
- react-native-view-shot → PNG capture
- react-native-share → system share sheet
- "Made This": logs nutrition, expo-image-picker for user photo, replaces AI image in card

### Task 5.2 — Apple Health Integration

**Status:** ⬜ Not started
- `src/services/healthkit.ts` — `requestHealthPermissions()` + `logNutrition(macros, date)` via react-native-health
- Writes calories, protein, carbs, fat to HealthKit
- Pro-gated: only on "Mark as Cooked" if entitlement granted + permission approved
- `NSHealthShareUsageDescription` + `NSHealthUpdateUsageDescription` in app.json
- Free users: Health sync shown as locked feature

### Task 5.3 — Superwall + RevenueCat + Onboarding

**Status:** 🟡 Partial
- `src/services/purchases.ts` — RevenueCat init (entitlement backend), `isPro()`, `getCustomerInfo()`, `restorePurchases()`; wires Superwall's purchase controller to RevenueCat so Superwall delegates transactions. Called from `_layout.tsx` on app open `⬜`
- `src/services/superwall.ts` — Superwall init, `presentPaywall(event)` helper, listener hooks for `paywall_viewed` / `paywall_converted` → PostHog `⬜`
- Install `@superwall/react-native-superwall` package `⬜`
- `app/paywall.tsx` — **fallback only**. Native screen kept for offline or Superwall-failure cases: hero + 4 value props, monthly/annual plan cards, CTA, Restore · Terms · Privacy footer; calls Alert stub until `purchases.ts` is wired ✅ (built 2026-04-17)
- Scan/recipe gate flips from `router.push('/paywall')` to `Superwall.shared.register({ event: 'scan_limit' | 'recipe_limit' })` once Superwall is wired; paywall route remains reachable as fallback `🟡`
- `app/onboarding.tsx` — 4-panel paged scroll: 3 editorial value-prop panels (01 · SCAN / 02 · COOK / 03 · TRACK) + 1 preference panel (diet chips, skill segmented, cuisine chips); Skip always visible on panels 1-3; "Start cooking" on panel 4 commits preferences and marks onboarding complete ✅ (built 2026-04-17)
- Wire `app/index.tsx` → real onboarding state check from userStore; waits for zustand-persist hydration before routing ✅ (built 2026-04-17)
- `app/(tabs)/scan.tsx` real scan-home launcher ✅ (built 2026-04-17)
- 🛠 Fixed by Codex on 2026-04-17: scan gating primitives now exist and enforce the free scan limit; gates route to `/paywall` (now a real fallback screen) until Superwall is wired

**Phase 5 checkpoint → stop, final report.**

---

## Bug Tracker

### 🛠 Fixed By Codex — 2026-04-17
1. Nutrition serving math
   - Was wrong: serving adjustments were being applied twice
   - Fixed in: `app/recipes/[id].tsx`
   - Current state: totals now multiply once, correctly

2. Local date and month keys
   - Was wrong: UTC date slicing could shift meals and monthly resets for local users
   - Fixed in: `src/utils/date.ts`, `app/(tabs)/nutrition.tsx`, `src/stores/userStore.ts`, `src/stores/nutritionStore.ts`, `src/components/WeeklyBars.tsx`, `app/recipes/[id].tsx`
   - Current state: day/week/month logic now follows local calendar dates

3. Free scan enforcement
   - Was wrong: `FREE_SCAN_LIMIT` existed but no scan flow incremented or checked `scanCount`
   - Fixed in: `app/scan/receipt.tsx`, `app/scan/barcode.tsx`, `app/scan/photo.tsx`
   - Current state: successful scans increment count, and the app blocks after 3 monthly scans

4. Session-based ingredients
   - Was wrong: ingredient state persisted across sessions and "New Scan" did not clear the list
   - Fixed in: `src/stores/ingredientStore.ts`, `app/ingredients.tsx`
   - Current state: ingredient state is session-based, and "New Scan" starts clean

### ⬜ Open Product Bugs
- No confirmed open correctness bugs from the 2026-04-17 Codex review pass
- Remaining issues are mostly incomplete Phase 5 work rather than active data-flow bugs

### Deferred Release Hardening
- Anthropic, OpenAI, and USDA API calls are still made directly from the client for current beta/TestFlight work
- Before App Store release, move these behind a backend or serverless proxy

---

## APIs and Services

| Service | URL / Package | Used For |
|---------|--------------|----------|
| OpenAI API | `https://api.openai.com/v1/chat/completions` | Receipt OCR + counter photo ID (gpt-4o-mini) |
| OpenAI DALL-E 3 | `https://api.openai.com/v1/images/generations` | AI food photography for share cards |
| Claude API | Anthropic Messages API | Recipe generation (claude-sonnet-4-6) |
| Open Food Facts | `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` | Barcode product lookup |
| USDA FoodData Central | `https://api.nal.usda.gov/fdc/v1/` | Barcode fallback + nutritional data |
| RevenueCat | `react-native-purchases` | Entitlements backend (canonical subscription state) |
| Superwall | `@superwall/react-native-superwall` | Remotely-editable paywall UI; delegates purchases to RevenueCat |
| PostHog | `posthog-react-native` | Funnel analytics (scan → recipe → cook → paywall) |
| Apple HealthKit | `react-native-health` | Nutrition write (Pro only) |

---

## Paywall Pricing

- **Free tier:** 3 scans/month + 5 recipe generations/month, basic nutrition, watermarked share cards
- **Pro:** $4.99/month or $34.99/year (saves ~42%), unlimited everything, micronutrients, Health sync, no watermark
- **Trial:** 7-day free trial on Pro
- **Gate timing:** Paywall appears when free limits are hit — **never mid-session** (never interrupt a scan or cooking flow)

---

## What Is NOT in MVP

- No persistent pantry/inventory (session-based ingredient list only)
- No expiry tracking or push notifications
- No AR scanning
- No grocery delivery integration
- No meal planning calendar
- No Android
- No iPad
- No social/community features
- No restaurant/menu scanning
- No micronutrients on free tier

---

## Onboarding Goal

**First recipe in under 90 seconds** from cold open. Onboarding → first scan → first recipe must be achievable without any friction. Skip button always visible on every onboarding panel.

---

## Dependency Chain

```
Phase 1 (theme/nav) ← must exist before ANY screen work
Phase 2 (scans) ← camera + API services, independent of Phase 3
Phase 3 (stores + ingredients + Claude) ← stores needed by everything, Claude needed for Phase 4
Phase 4 (recipe UI + cooking + nutrition) ← requires Phase 3 stores + services
Phase 5 (sharing + health + paywall) ← requires Phase 4 features + RevenueCat SDK
```

---

## Verification Per Phase

**Phase 1:** `npx expo start` → app loads on iOS Simulator → tabs navigate → background color = `#0C120E` → no white/black anywhere

**Phase 2:** On device/simulator: barcode scan resolves item + haptic fires → receipt photo extracts items with checklist → counter photo identifies items with remove + quick-add → free scan count increments on completion

**Phase 3:** Manually add ingredients → tap "Get Recipes" → Claude returns 3-5 recipe JSON → recipeStore populated → ingredient list shows source badges → "New Scan" clears the current ingredient session

**Phase 4:** Browse recipe cards → tap to open detail → change servings → tap "Start Cooking" → walk through steps → "Mark as Cooked" → nutrition entry appears correctly in dashboard under the local day

**Phase 5:** Hit free scan limit → paywall appears → purchase (sandbox) → limits lifted → recipe card generates with AI food image → share sheet opens → HealthKit shows nutrition entry

---

## Known Bugs (found by adversarial review 2026-04-17)

### BUG-1 — Pro users still get blocked [CRITICAL]
**Files:** `app/(tabs)/scan.tsx`, `app/scan/barcode.tsx`, `app/scan/photo.tsx`, `app/scan/receipt.tsx`, `app/ingredients.tsx`
All scan and recipe gates check only `scanCount >= FREE_SCAN_LIMIT`. `isPro()` is never called at any gate. A paying subscriber hits the exact same wall as a free user.
**Fix:** Call `isPro()` at each gate; if true, skip the limit check entirely.

### BUG-2 — Fallback paywall buttons do nothing [HIGH]
**File:** `app/paywall.tsx:127-149`
`handleSubscribe` and `handleRestore` show "coming soon" alerts. This screen is the recovery path when Superwall fails — meaning any SDK error leaves the user with a fake paywall they cannot buy through.
**Fix:** Wire `handleSubscribe` to `getOfferings()` + `purchasePackage()` via `src/services/purchases.ts`, and `handleRestore` to `restorePurchases()`.

### BUG-3 — App can freeze on blank screen at launch [HIGH]
**File:** `app/index.tsx:8-18`
Hydration state is sampled once on render, then waits for `onFinishHydration` callback. If AsyncStorage finishes loading between those two moments, the callback fires before the listener is registered and `setHydrated(true)` never runs. App shows a blank splash indefinitely.
**Fix:** Re-check `hasHydrated()` inside the effect before subscribing to the callback.

### BUG-4 — Scanned groceries lost on app kill/crash [HIGH — intentional trade-off, not a regression]
**File:** `src/stores/ingredientStore.ts`
Ingredient store is in-memory only. This was a deliberate fix by Codex (2026-04-17) — persistence was removed because "New Scan" wasn't clearing saved ingredients. The adversarial review flagged this as a regression, but it's the same Codex contradicting its own earlier decision.
The UX problem is real (iOS background kills wipe the basket) but the cause is a known trade-off.
**Fix when ready:** Restore AsyncStorage persistence and have "New Scan" call `clearIngredients()` explicitly — that way persistence and clearing both work without conflicting.

### BUG-5 — Pro users can still get locked on cold start [HIGH]
**Files:** `app/_layout.tsx`, `src/services/purchases.ts`, `app/(tabs)/scan.tsx`, `app/scan/barcode.tsx`, `app/scan/photo.tsx`, `app/scan/receipt.tsx`
`configurePurchases()` is delayed by 100ms in `_layout.tsx`, but the scan surfaces call `isPro()` immediately on first focus. If RevenueCat is not configured yet, `isPro()` falls back to `false`, marks Pro status as loaded, and the user can land on the free-limit lock state until they refocus the screen.
**Fix:** Remove the race by making purchase init deterministic before the first gate check, or make `isPro()` expose an "unknown/loading" state instead of collapsing setup failures to `false`.
**Delegate:** Lead-owned integration fix. This touches app bootstrap plus every scan gate, so it should not be given to a UI-only subagent.

### BUG-6 — Client bundle still contains live API secrets [HIGH]
**Files:** `app.config.js`, `src/services/openai.ts`, `src/services/claude.ts`, any client-side service reading `Constants.expoConfig?.extra`
Anthropic, OpenAI, RevenueCat, Superwall, USDA, and PostHog keys are injected into `expoConfig.extra` and used directly from the client app. Anyone with the bundle or a proxy can extract and reuse those keys.
**Fix:** Move AI and data-provider calls behind a server/edge layer, keep only publishable client keys in the app, and rotate any secrets already exposed in shipped builds or chat logs.
**Delegate:** Lead decision first. This is architecture/security work, not a bounded view fix.

### BUG-7 — Fallback paywall can display one price and buy another [MEDIUM]
**Files:** `app/paywall.tsx`, `src/services/purchases.ts`
The fallback paywall hardcodes `$29.99 / year` and `$4.99 / month`, but the actual purchased package comes from live RevenueCat offerings. If the dashboard pricing or package ordering changes, the UI can advertise one price and purchase a different package.
**Fix:** Render plan labels and prices from the currently loaded offering/package metadata, not from hardcoded copy. Keep the fallback empty/error state explicit when offerings are unavailable.
**Delegate:** Safe bounded task for a single implementer touching paywall + purchases metadata only.

### BUG-8 — Photo library mode is blocked by camera permission [MEDIUM]
**Files:** `app/scan/photo.tsx`
The redesigned photo screen adds a Camera/Library toggle, but the screen returns early on the camera-permission gate before the toggle is reachable. A user who denies camera access cannot use the library import path even though that mode should not require camera permission.
**Fix:** Split permission handling by mode. Library flow should remain available with photo-library permission even when camera permission is denied.
**Delegate:** Good bounded fix for a single implementer in `app/scan/photo.tsx`.

### BUG-9 — Apple Health sync is sold but not wired into cooking flow [MEDIUM]
**Files:** `app/paywall.tsx`, `app/recipes/[id].tsx`, `src/services/healthkit.ts`
The paywall still advertises "Apple Health sync", and the HealthKit service exists, but "Mark as Cooked" only logs to the local nutrition store. No permission request or HealthKit write happens from the recipe flow.
**Fix:** Either wire `requestHealthPermissions()` + `logNutrition()` into the cooked-meal path with clear failure handling, or remove the claim from the paywall until the feature is real.
**Delegate:** Lead product decision first. After that, this can be a bounded implementation task across recipe detail + health service.

---

## Full Scan → Recipe Flow

```
(tabs)/scan
    ↓
scan/barcode | scan/receipt | scan/photo
    ↓  (ingredientStore)
ingredients.tsx  ← "Get Recipes" CTA
    ↓  (claude.ts → recipeStore)
recipes/index.tsx  ← swipeable cards
    ↓
recipes/[id].tsx  ← detail + cooking mode
    ↓  (nutritionStore.logMeal)
(tabs)/nutrition
```
