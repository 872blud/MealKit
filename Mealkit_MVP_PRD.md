# Mealkit — MVP Product Requirements

**What it is:** An iPhone app (React Native) that lets you scan your groceries (receipt, barcode, or photo) and instantly generates AI-powered recipes from what you have, with automatic nutrition tracking.

**Tagline:** Scan your groceries. Get personalized recipes. Track your nutrition.

**Platform:** iPhone only (iOS 17+), built with React Native + Expo
**Monetization:** Freemium + subscription ($4.99/mo or $34.99/yr)

---

## The Problem

People waste food, time, and money because they don't know what to cook with what they already have. Current recipe apps make you search a massive catalogue manually (Paprika, Yummly) or type in your ingredients one by one. Nobody wants to do that. Mealkit removes the friction — scan what you have, get what to cook.

---

## Core Feature 1: Ingredient Capture (3 Scan Modes)

Users should never type a list of ingredients. Three ways to get ingredients into the app:

### Mode A — Receipt Scan
User photographs a grocery receipt. AI reads it and extracts the food items.

- Camera opens in receipt-optimized mode via `expo-camera`
- Image sent to LLM Vision API (GPT-4o Vision or Claude Vision) which reads the receipt text and classifies food items in one pass
- Smart filtering: strips brand names ("Kirkland Organic Chicken Breast 2pk" becomes "chicken breast"), removes non-food items (soap, paper towels, etc.)
- User sees the extracted list immediately with checkboxes to confirm or remove items
- Multiple receipts can be stacked in one session
- Works with printed receipts, email receipt screenshots, and digital receipts

### Mode B — Barcode Scan
User scans barcodes on packaged grocery items one at a time. Fast, familiar, zero learning curve.

- Uses `expo-camera` barcode detection (supports EAN-13, UPC-A, etc.)
- Looks up item against Open Food Facts API (and/or USDA FoodData Central) to get product name, category, and nutritional info
- Haptic feedback on successful scan via `expo-haptics` (rigid impact — feels like a checkout scanner)
- Continuous scan mode: scan one item, it registers, immediately scan the next without tapping anything
- Running list builds on screen as user scans with animated entry
- Manual fallback: if a barcode doesn't resolve, user can type the item name
- Session ends when user taps "Done" — all items passed to recipe generation

### Mode C — Counter / Flat-Lay Photo
User spreads ingredients on a counter or table, takes one photo. AI identifies everything visible.

- Single-shot multi-item identification using GPT-4o Vision or Claude Vision API
- Results shown on a review screen where user can correct or remove items
- "Did we miss anything?" prompt with a quick-add text field
- Best for fresh produce, loose items, anything without a barcode
- Pairs well with Mode B: barcode scan the packaged stuff, then photo the produce

---

## Core Feature 2: Ingredient List (MVP-scope)

For MVP, ingredient capture creates a simple session-based list that feeds into recipe generation. Intentionally lightweight.

- All three scan modes build a single ingredient list for the current session
- User can manually add or remove any item before generating recipes
- List persists through the app session — cleared when user starts a new scan
- Basic ingredient history: last scan is saved so user can re-generate or tweak without re-scanning

**Deferred to v1.5:** Persistent cross-session pantry, quantity tracking, "Used this" depletion, expiry estimation, push notification alerts.

---

## Core Feature 3: AI Recipe Generation

Once ingredients are captured, AI generates recipes immediately.

- Generates 3-5 recipe options ranked by: (1) ingredient match %, (2) user preferences, (3) nutritional fit
- Each recipe card shows: name, total cook time, calories, macros at a glance, difficulty level, and ingredient match (e.g., "You have 8/9 ingredients")
- Missing ingredient flag: clearly shows what's needed that the user doesn't have, with substitution suggestions
- AI explains WHY it chose each recipe in one sentence
- "Surprise me" mode: generates one bold, creative recipe from the ingredient list
- Filters at generation time: cuisine type, dietary restrictions, cook time, difficulty, calorie range
- Full recipe view includes: ingredient list with quantities, step-by-step instructions, serving size selector that auto-scales quantities
- "Chef tips" powered by AI: technique notes, substitution suggestions, storage tips

---

## Core Feature 4: Nutrition Tracking

Auto-calculated, zero manual entry. When a user cooks a recipe from Mealkit, nutrition is logged.

- Macros per serving: calories, protein, carbs, fat, fiber, sugar
- Micronutrient view (Pro tier): vitamins, minerals, sodium breakdown
- Daily nutrition dashboard: running totals for the day
- Weekly nutrition summary: trends, best/worst days, top nutrient sources
- Apple Health integration via `react-native-health` for nutrition write
- Goal setting: user sets daily calorie/protein/carb/fat targets — recipe generation adapts to those goals
- "How does this fit my day?" — shows how a recipe fits remaining macro budget before cooking

---

## Core Feature 5: Recipe Cards — Social Sharing

Every recipe gets a shareable card. Built for TikTok/IG virality.

- Auto-generated recipe card: recipe name, hero image (AI-generated food photo), key stats (calories, time, servings), Mealkit branding
- One-tap share via React Native Share API to TikTok, Instagram Stories/Reels
- "Made this" button: marks recipe as cooked, logs nutrition, prompts user to take a photo for their share card
- User photo can replace the AI-generated food image
- Short link to a web view of the recipe (drives organic acquisition from social)

---

## User Flows

### First-Time User (Onboarding)
Goal: First AI-generated recipe in under 90 seconds.

1. App opens — brief value prop (3 swipeable panels). "Scan. Cook. Track." No account required.
2. Quick preference setup (30 seconds max): dietary restrictions, cooking skill, cuisine preferences. Can skip.
3. "Let's scan your groceries" — choose capture mode: Receipt / Barcode / Counter Photo.
4. Scan completes — ingredient list populated — recipe generation starts automatically.
5. First recipe results shown — "Get cooking" CTA.
6. Soft paywall at 3rd recipe view. Not in first session.

### Core Loop
1. User gets groceries — opens Mealkit — scans receipt or items — ingredient list built
2. Opens app — "What should I cook?" — AI recommends from ingredients + preferences
3. Selects recipe — cooks — marks as made — nutrition auto-logged
4. Shares recipe card to TikTok/IG

---

## Monetization

### Free Tier
- 3 scans / month (any mode)
- 5 recipes / month
- Basic nutrition (calories + macros)
- Recipe cards with Mealkit watermark

### Pro — $4.99/mo or $34.99/yr
- Unlimited scans
- Unlimited recipes
- Micronutrient detail
- Apple Health sync
- Clean recipe cards (no watermark)
- 7-day free trial, no credit card upfront

---

## Technical Stack (React Native)

| Component | Approach |
|-----------|----------|
| Framework | React Native + Expo (managed workflow) |
| Receipt Scan | `expo-camera` for photo capture → LLM Vision API (GPT-4o or Claude) for OCR + ingredient classification in one pass |
| Barcode Scan | `expo-camera` barcode detection (EAN-13, UPC-A) → Open Food Facts API + USDA FoodData Central lookup |
| Counter Photo ID | `expo-camera` photo capture → GPT-4o Vision or Claude Vision API for multi-item identification |
| Recipe Generation | Structured prompts to Claude API (claude-sonnet) with ingredient list, preferences, nutritional targets. Returns JSON. |
| Nutrition Calculation | USDA FoodData Central API for nutritional values. AI maps recipe ingredients to USDA entries. |
| Recipe Card Image | DALL-E 3 or Stable Diffusion API for AI food photography. Generated once per recipe, cached. |
| Paywall | RevenueCat via `react-native-purchases` for subscription management |
| Health Integration | `react-native-health` for Apple HealthKit nutrition write |
| Haptics | `expo-haptics` for scan feedback and interactions |
| Local Storage | `@react-native-async-storage/async-storage` for preferences + session data |
| Navigation | `expo-router` (file-based routing) |
| State Management | Zustand for global state |
| Animations | `react-native-reanimated` for all animations (Emil Kowalski easing system) |
| Sharing | React Native Share API + `react-native-view-shot` for recipe card capture |

### Platform
- iOS 17+ minimum
- iPhone only for v1.0
- AsyncStorage for local data, basic iCloud sync deferred to v1.5
- Apple HealthKit integration for nutrition write
- Offline mode: saved recipes available offline; scan features need network

### Privacy
- No photos stored on server — processed via API and discarded immediately
- Nutrition data stored locally — user owns their data
- No ads. No selling user data.
