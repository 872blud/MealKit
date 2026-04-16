# Mealkit — Claude Instructions

## Project Overview
Mealkit is a React Native (Expo) iOS app that scans groceries via receipt photo, barcode, or counter photo, generates AI recipes, and tracks nutrition automatically. Monetized via RevenueCat subscriptions.

**Project path:** `~/Desktop/Mealkit/`
**Plan file:** `~/Desktop/Mealkit/PLAN.md`
**PRD file:** `~/Desktop/Mealkit/PRD.md`

---

## Bismillah / Alhamdulillah Rule
- Say **bismillah** before every crucial step (builds, commits, writing a major file, wiring navigation)
- Say **alhamdulillah** when something goes well (build succeeds, tests pass, task complete)

---

## MANDATORY CHECKPOINT RULE
**Stop and check in with the user after every 3 completed tasks. No exceptions.**
- After completing 3 tasks → STOP, report what was built, ask "ready to continue?"
- Repeat for every batch of 3
- On final tasks → STOP, final report

---

## MANDATORY SKILLS
Read and apply these skills before writing ANY view or component code. These are not optional.

| Skill | What it owns | When to reference |
|-------|-------------|-------------------|
| **ui-ux-pro-max** | Touch targets (≥44pt), spacing rhythm (4/8pt grid), navigation patterns, accessibility, haptics, safe areas | Before writing any screen or component |
| **impeccable** | Color (OKLCH, no pure black/white, tinted neutrals), typography bans, motion bans (no gradient text, no side-stripe borders, no glassmorphism everywhere), spatial rules | Before choosing any color, font, or layout pattern |
| **emil-design-eng** | Animation precision (custom easings via reanimated, spring configs, scale(0.95) not scale(0), exit faster than enter, stagger 30-80ms, button scale(0.97) on press) | Before writing any animation or transition |
| **context7** | Up-to-date documentation lookups for React Native, Expo, and all npm packages. Use before implementing any package integration. | Before using any library or API you haven't used in this session |
| **brains / superpower** | Agentic execution — subagent-driven development. One subagent per task. Spec review + quality review after each. | For task execution workflow |

**Workflow:** Before writing any view → run ui-ux-pro-max design system query → read impeccable rules → read Emil animation rules → then write code. No shortcuts.

---

## AI Services — Split by Complexity

| Task | Service | Model | Why |
|------|---------|-------|-----|
| Recipe generation | Claude API | claude-sonnet-4-6 | Complex — quality is the core product |
| Receipt OCR + classification | OpenAI API | gpt-4o-mini | Vision + simple extraction — cheap |
| Photo ingredient ID | OpenAI API | gpt-4o-mini | Simple vision — cheap |

**Never use Claude for receipt/photo tasks. Never use OpenAI for recipe generation.**

---

## API Keys
All keys live in a `.env` file at project root (gitignored). Accessed via `expo-constants` or `react-native-dotenv`.

Required keys:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `REVENUECAT_API_KEY`
- `USDA_API_KEY`

---

## Paywall Architecture
**RevenueCat** (`react-native-purchases`) handles subscription management, paywall UI, and entitlement validation.

Free tier: 3 scans + 5 recipe generations per month.
Pro: unlimited everything, micronutrients, Apple Health sync, clean recipe cards.

Track scan count and recipe count in Zustand store + AsyncStorage. Check entitlements via RevenueCat before gated features.

---

## Design System — Non-Negotiable Rules

### Colors
- All colors use `theme.*` tokens — never raw hex in components, never `#000000` or `#FFFFFF`
- Dark mode only — set at app level
- Green-tinted neutrals (OKLCH-derived): background `#0C120E`, surface `#141A15`
- Accent green: `theme.accent` (`#3DB85A`) — use sparingly (10% rule)
- 60% surface / 30% secondary text+borders / 10% accent
- **Banned:** cyan-on-dark, purple-to-blue gradients, neon glows, gradient-filled text, side-stripe accent borders

### Typography
- System font with rounded design where possible. On iOS React Native, use `System` font with appropriate weights.
- Monospaced for all numbers (calories, macros, timers) — use `fontVariant: ['tabular-nums']` on all numeric Text
- Type scale: 12 / 14 / 16 / 20 / 24 / 32. Min 16pt for body text.
- **Banned:** Inter, Syne, IBM Plex, Space Grotesk, DM Sans

### Animations (Emil Kowalski system — via react-native-reanimated)
- Enter: expo-out 350ms — `withTiming(value, { duration: 350, easing: Easing.bezier(0.16, 1, 0.3, 1) })`
- Exit: ease-in 220ms — `withTiming(value, { duration: 220, easing: Easing.bezier(0.7, 0, 0.84, 0) })`
- Toggle: ease-in-out 250ms — `withTiming(value, { duration: 250, easing: Easing.bezier(0.65, 0, 0.35, 1) })`
- Button press: scale(0.97) with 160ms expo-out
- Sheets/modals: spring `withSpring(value, { damping: 20, stiffness: 200 })`
- List stagger: 40ms per item, capped at 300ms total
- **Never** animate from `scale(0)` — always start at `scale(0.95)` + `opacity(0)`
- **Never** use bouncy springs with damping < 15. No visible overshoot.
- **Only animate `transform` and `opacity`** — never animate width/height/padding

### Layout
- 4pt base spacing scale: `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32, xxxl=48`
- All tap targets ≥ 44x44pt
- Safe areas: use `useSafeAreaInsets()` from `react-native-safe-area-context` for all edge content
- No cards nested inside cards
- Not every row needs a card — use dividers + spacing for list hierarchy
- Skeleton screens (not spinners) for any operation >300ms

### The AI Slop Test
Before marking any view done, ask: "Would someone immediately say an AI made this?" Signs to eliminate: every section in a card, all cards same size, purple-blue gradient accents, side-stripe borders, modal for every sub-action, rounded rect with generic drop shadow everywhere.

---

## File Structure
```
Mealkit/
├── app/                          # expo-router file-based routing
│   ├── _layout.tsx               # Root layout (dark mode, providers)
│   ├── index.tsx                 # Entry → onboarding or main
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── scan.tsx              # Scan home (mode picker)
│   │   └── nutrition.tsx         # Nutrition dashboard
│   ├── scan/
│   │   ├── receipt.tsx           # Receipt scan screen
│   │   ├── barcode.tsx           # Barcode scan screen
│   │   └── photo.tsx             # Counter photo screen
│   ├── ingredients.tsx           # Ingredient list + "Get Recipes" CTA
│   ├── recipes/
│   │   ├── index.tsx             # Recipe cards (swipeable)
│   │   └── [id].tsx              # Recipe detail + cooking mode
│   ├── onboarding.tsx            # 3-panel onboarding
│   └── paywall.tsx               # RevenueCat paywall
├── src/
│   ├── services/
│   │   ├── claude.ts             # Claude API — recipe generation ONLY
│   │   ├── openai.ts             # OpenAI API — receipt OCR + photo ID ONLY
│   │   ├── barcode.ts            # Open Food Facts + USDA barcode lookup
│   │   ├── nutrition.ts          # USDA FoodData Central
│   │   ├── healthkit.ts          # Apple HealthKit write
│   │   └── purchases.ts         # RevenueCat setup + entitlement checks
│   ├── stores/
│   │   ├── ingredientStore.ts    # Zustand — session ingredient list
│   │   ├── recipeStore.ts        # Zustand — generated recipes
│   │   ├── nutritionStore.ts     # Zustand — daily nutrition log
│   │   └── userStore.ts          # Zustand — preferences, onboarding state, scan counts
│   ├── theme/
│   │   ├── colors.ts             # OKLCH-derived color tokens
│   │   ├── spacing.ts            # 4pt scale
│   │   ├── typography.ts         # Font presets
│   │   └── animations.ts         # Emil easing curves for reanimated
│   ├── components/
│   │   ├── MacroChip.tsx
│   │   ├── IngredientRow.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── PressableScale.tsx    # Button wrapper with scale(0.97) press
│   │   └── EmptyState.tsx
│   └── utils/
│       ├── api.ts                # Shared fetch helpers
│       └── formatters.ts         # Number/date formatters
├── assets/
├── .env                          # API keys (gitignored)
├── .gitignore
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
├── CLAUDE.md                     # This file
├── PLAN.md                       # Implementation plan
└── PRD.md                        # Product requirements
```

---

## Technical Rules
- React Native + Expo (managed workflow), TypeScript strict mode
- `expo-router` for all navigation (file-based routing)
- Zustand for all global state — no Redux, no Context API for state
- `react-native-reanimated` for ALL animations — no Animated API
- All API calls are `async/await` with proper error handling and loading states
- All services are singleton modules (export functions, not classes)
- EAS Build for TestFlight distribution
- Commit after each task with conventional commit format: `feat:`, `fix:`, etc.
- Build and test on iOS Simulator after every task

---

## NPM Packages (install at project init)

### Core
- `expo` (latest SDK)
- `expo-router`
- `expo-camera`
- `expo-haptics`
- `expo-constants`
- `expo-image-picker` (fallback for photo mode)
- `expo-keep-awake`
- `react-native-reanimated`
- `react-native-gesture-handler`
- `react-native-safe-area-context`
- `react-native-screens`

### Data & State
- `zustand`
- `@react-native-async-storage/async-storage`

### Integrations
- `react-native-purchases` (RevenueCat)
- `react-native-health` (Apple HealthKit)
- `react-native-view-shot` (recipe card screenshot for sharing)
- `react-native-share`

### Dev
- `typescript`
- `react-native-dotenv` or `expo-constants` for env vars
