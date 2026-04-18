# Mealkit Visual Redesign — Full Character Pass

## Context

The app currently looks like a scaffold: flat dark surfaces, system font only, no visual depth, no imagery, no gradient life. The direction from the moodboard (Zentra finance app, Exotic Fruit app, How We Feel app, health tracking app) is clear — the app needs gradient glow backgrounds, warm typography, organic visual elements, and real visual identity per screen. The current code has all the right structure; it just has zero visual personality. This plan adds character without rewriting the architecture.

Confirmed direction: dark theme stays, green accent stays, but now:
- Gradient glow blooms are the personality of every screen
- Organic food circles (decorative orbs) decorate the scan hero
- Bodoni Moda serif replaces system font for all display/heading text
- Recipe cards get cuisine-based gradient headers (no emoji)
- AI companion is now called **"Sous"** (culinary term, implies prep expertise)
- Recipe prompt gets strengthened with pantry staples, anti-hallucination rules, cuisine field

---

## Critical Files

| File | Change |
|------|--------|
| `package.json` | Add @expo-google-fonts/bodoni-moda + @expo-google-fonts/archivo + expo-font |
| `app/_layout.tsx` | Add useFonts + SplashScreen guard |
| `src/theme/typography.ts` | Bodoni Moda for display/heading, Archivo for body/UI |
| `src/theme/colors.ts` | Add glow tokens |
| `src/theme/animations.ts` | Stronger spring entrance |
| `src/stores/recipeStore.ts` | Add `cuisine` field to Recipe type |
| `app/(tabs)/scan.tsx` | Glow + orbs + bigger type + tinted icons |
| `app/onboarding.tsx` | Glow + ghost number + visual circle + fix "Sous" copy |
| `src/components/RecipeCard.tsx` | Cuisine gradient header strip, no emoji |
| `src/services/claude.ts` | Sous persona + pantry staples + cuisine field + better rules |

Secondary (glow treatment only, no layout changes):
- `app/(tabs)/nutrition.tsx` — add gradient glow background
- `app/recipes/index.tsx` — add gradient glow background

---

## Phase 1 — Font Installation + Theme Foundation

### 1a. Install packages

```bash
npx expo install expo-font @expo-google-fonts/bodoni-moda @expo-google-fonts/archivo
```

Two font families — chosen via impeccable font selection procedure (Fraunces + Plus Jakarta Sans are banned as AI monoculture):
- **Bodoni Moda** — display, titles, headings. Extreme stroke contrast, evokes Michelin menus and food magazines. The typographic identity of the app.
- **Archivo** — body, labels, numbers. Warm grotesque with genuine character, not cold like Inter.

**Bodoni Moda variants to load:**
- `BodoniModa_700Bold` — headings, card titles
- `BodoniModa_900Black` — hero text on scan home and onboarding
- `BodoniModa_400Regular_Italic` — italic ghost line in hero

**Archivo variants to load:**
- `Archivo_400Regular` — body, small, caption
- `Archivo_500Medium` — bodyMedium, smallMedium
- `Archivo_600SemiBold` — mono numbers, labels
- `Archivo_700Bold` — buttons, strong labels

### 1b. Update `app/_layout.tsx`

```ts
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BodoniModa_700Bold, BodoniModa_900Black, BodoniModa_400Regular_Italic,
} from '@expo-google-fonts/bodoni-moda';
import {
  Archivo_400Regular, Archivo_500Medium,
  Archivo_600SemiBold, Archivo_700Bold,
} from '@expo-google-fonts/archivo';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BodoniModa_700Bold, BodoniModa_900Black, BodoniModa_400Regular_Italic,
    Archivo_400Regular, Archivo_500Medium,
    Archivo_600SemiBold, Archivo_700Bold,
  });
  useEffect(() => {
    // ... existing 100ms timeout for store init
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  // rest unchanged
}
```

### 1c. Update `src/theme/typography.ts`

Full replacement of all font families:

```ts
display:     { fontFamily: 'BodoniModa_900Black',          fontSize: 44, letterSpacing: -2,    lineHeight: 46 }
title:       { fontFamily: 'BodoniModa_700Bold',           fontSize: 32, letterSpacing: -1,    lineHeight: 36 }
heading:     { fontFamily: 'BodoniModa_700Bold',           fontSize: 22, letterSpacing: -0.5,  lineHeight: 26 }
body:        { fontFamily: 'Archivo_400Regular',           fontSize: 16,                       lineHeight: 25 }
bodyMedium:  { fontFamily: 'Archivo_500Medium',            fontSize: 16,                       lineHeight: 25 }
small:       { fontFamily: 'Archivo_400Regular',           fontSize: 14,                       lineHeight: 21 }
smallMedium: { fontFamily: 'Archivo_500Medium',            fontSize: 14,                       lineHeight: 21 }
caption:     { fontFamily: 'Archivo_400Regular',           fontSize: 12, letterSpacing: 0.1,   lineHeight: 17 }
label:       { fontFamily: 'Archivo_600SemiBold',          fontSize: 11, letterSpacing: 0.8,   lineHeight: 14, textTransform: 'uppercase' }
mono:        { fontFamily: 'Archivo_600SemiBold',          fontSize: 16, fontVariant: ['tabular-nums'], lineHeight: 20 }
monoLarge:   { fontFamily: 'Archivo_700Bold',              fontSize: 32, letterSpacing: -0.5,  lineHeight: 38, fontVariant: ['tabular-nums'] }
monoSmall:   { fontFamily: 'Archivo_600SemiBold',          fontSize: 13, fontVariant: ['tabular-nums'], lineHeight: 16 }
heroGhost:   { fontFamily: 'BodoniModa_400Regular_Italic', fontSize: 44, letterSpacing: -1,    lineHeight: 46 }
// Apply opacity: 0.18 at the component level on heroGhost, not in the token
```

### Design rules applied:
- ❌ No gradient text (`background-clip: text`) anywhere
- ❌ No `border-left > 1px` accent stripes on cards
- ❌ No glassmorphism used decoratively
- ✅ Gradient glows are structural (they ARE the design), not decorative overlays

### 1d. Update `src/theme/colors.ts` — add glow tokens

```ts
// Glow layers — used as LinearGradient colors
glowGreen: 'rgba(74, 222, 128, 0.22)',
glowGreenMid: 'rgba(74, 222, 128, 0.08)',
glowAmber: 'rgba(220, 160, 60, 0.16)',
glowAmberMid: 'rgba(220, 160, 60, 0.06)',
glowBlue: 'rgba(120, 160, 255, 0.16)',
transparent: 'transparent',
```

### 1e. Update `src/theme/animations.ts` — stronger springs

Change stagger from 8px to 20px translateY, add scale:
```ts
export const SPRING_ENTER: WithSpringConfig = {
  damping: 20,
  stiffness: 180,
  mass: 0.8,
};
export const STAGGER_DELTA_Y = 20; // was 8
export const STAGGER_SCALE_FROM = 0.96; // scale up from this to 1
```

Update `getStaggerDelay` to use 60ms intervals.

---

## Phase 2 — Scan Home Redesign (`app/(tabs)/scan.tsx`)

### What changes:
1. **Gradient glow behind hero** — two LinearGradient blobs (green top-left + amber top-right)
2. **Food orbs** — 4 decorative circles, positioned top-right BELOW the topbar layer (`zIndex: 0`), smaller than prototype (max 56px)
3. **Hero text** — 44px BodoniModa_900Black, with an italic ghost line in BodoniModa_400Regular_Italic
4. **Eyebrow** — dynamic greeting: "Good morning" / "Good afternoon" / "Good evening"
5. **Mode icon tints** — receipt=green tint, barcode=amber tint, photo=blue tint
6. **StaggerItem** — upgrade to spring entrance with 20px translateY + scale

### Glow implementation:
```tsx
// Behind all content, z-index 0
<View style={StyleSheet.absoluteFill} pointerEvents="none">
  <LinearGradient
    colors={[colors.glowGreen, colors.glowGreenMid, colors.transparent]}
    style={{ position: 'absolute', top: -100, left: -80, width: 320, height: 320, borderRadius: 160 }}
  />
  <LinearGradient
    colors={[colors.glowAmber, colors.glowAmberMid, colors.transparent]}
    style={{ position: 'absolute', top: 40, right: -100, width: 240, height: 240, borderRadius: 120 }}
  />
</View>
```

### Food orbs (decorative only, pointer-events none):
```tsx
// All orbs at z-index 0, below topBar (z-index 10)
// Orb sizes: 56px, 36px, 28px, 20px
// Position: cluster at top-right, starting at y=50 (below notch area), x=screen_width-20 going left
// Use LinearGradient with borderRadius: size/2 for radial approximation
```

### Mode icon tints:
```tsx
const MODE_TINTS = {
  receipt: { bg: colors.accentDim,   border: 'rgba(74,222,128,0.2)'  },
  barcode: { bg: colors.carbDim,     border: 'rgba(220,160,60,0.2)'  },
  photo:   { bg: colors.proteinDim,  border: 'rgba(107,159,228,0.2)' },
};
```

---

## Phase 3 — Onboarding Redesign (`app/onboarding.tsx`)

### What changes:
1. **Gradient glow per panel** — same LinearGradient pattern, each panel gets unique glow color
2. **Ghost number as background** — huge low-opacity number (01, 02, 03) in BodoniModa_900Black at ~100px, `opacity: 0.06`, positioned behind the visual circle
3. **Visual circle per panel** — 100px circle with glow ring, per panel:
   - 01 · SCAN → camera/scan icon
   - 02 · COOK → cooking pot icon
   - 03 · TRACK → bar chart icon
4. **Hero text bigger** — `typography.display` (44px BodoniModa_900Black)
5. **Fix "Claude generates"** → change to:
   - `'Skip the grocery list. Sous, your personal AI chef, generates recipe ideas from whatever you scanned — matched to your taste.'`

### Glow per panel:
```ts
const PANEL_GLOWS = [
  { primary: colors.glowGreen,  secondary: colors.glowAmber },   // SCAN
  { primary: colors.glowAmber,  secondary: colors.glowGreen },   // COOK
  { primary: colors.glowBlue,   secondary: colors.glowGreen },   // TRACK
];
```

---

## Phase 4 — Recipe Card Redesign (`src/components/RecipeCard.tsx`)

### Remove: emoji hero entirely. No images. No emoji.

### New layout (top to bottom):
1. **Cuisine gradient header strip** — 72px tall, LinearGradient horizontal, recipe name in BodoniModa_700Bold overlaid in white, match % pill top-right
2. **Meta row** — time · difficulty pill · serving count (compact, 14px Archivo)
3. **AI reasoning** — `typography.small`, `color: textSecondary`, 2 lines max
4. **Divider**
5. **Macro chips row** — existing MacroChip component, already colored by type

### Cuisine → gradient mapping (new helper `getCuisineGradient(cuisine: string)`):
```ts
const CUISINE_GRADIENTS: Record<string, [string, string]> = {
  Italian:       ['#3d1208', '#6b1e0e'],   // deep rust
  Asian:         ['#0d0a2a', '#1a1048'],   // deep indigo
  Mediterranean: ['#051a24', '#0a2d3a'],   // deep ocean
  Mexican:       ['#2a1000', '#4a2000'],   // warm dark amber
  American:      ['#0e0e18', '#1a1a28'],   // cool slate
  Indian:        ['#2a1400', '#4a2800'],   // turmeric dark
  French:        ['#1a0e1a', '#2a1830'],   // dusty plum
  default:       ['#080e09', '#0d1a0e'],   // dark green (existing)
};
```

### Add `cuisine` field to `Recipe` interface in `src/stores/recipeStore.ts`:
```ts
cuisine: string;  // "Italian" | "Asian" | "Mediterranean" | etc.
```

---

## Phase 5 — Recipe Prompt Improvements (`src/services/claude.ts`)

### Persona rename:
```
You are Sous, the culinary AI behind Mealkit. Your only job is to generate realistic, delicious recipes from the exact ingredients the user has available.
```

### Add pantry staples clause:
```
Assume these pantry staples are always available: salt, black pepper, olive oil, vegetable oil, water, garlic, butter. Do not assume anything else beyond the scanned list and this pantry staple list.
```

### Strengthen anti-hallucination:
```
CRITICAL: Never suggest a recipe that requires an ingredient not in the scanned list or pantry staples above. If you cannot create a viable recipe without hallucinating ingredients, reduce the number of recipes returned — returning fewer real recipes is better than padding with impossible ones.
```

### Add `cuisine` to JSON schema:
```json
"cuisine": "string (Italian|Asian|Mediterranean|Mexican|American|Indian|French|Middle Eastern|Other)"
```

### Timing instruction for steps:
```
Each step must include a realistic time estimate in parentheses, e.g. "Sauté onions until translucent (4–5 min)". Use technique language: fold, sear, deglaze, simmer — not "cook until done".
```

### aiReasoning rule:
```
aiReasoning: one sentence explaining the specific combination of scanned ingredients that makes this recipe work. Never start with "This recipe". Never mention "Claude" or "AI" or "Sous".
```

---

## Phase 6 — Nutrition + Recipes Screen (glow treatment only)

`app/(tabs)/nutrition.tsx` — add the same LinearGradient glow pattern as scan home (no layout changes).

`app/recipes/index.tsx` — add the same LinearGradient glow pattern (no layout changes).

---

## New Component: `GlowBackground` (`src/components/GlowBackground.tsx`)

Reusable component — renders two absolutely positioned LinearGradient blobs. Used by every screen to avoid repeating the pattern.

```tsx
interface GlowBackgroundProps {
  primary?: 'green' | 'amber' | 'blue';
  secondary?: 'green' | 'amber' | 'blue' | null;
}
```

---

## Verification

1. Run `npx expo start` in Expo Go
2. Scan home: gradient glow visible, orbs don't overlap usage pill, hero text is large Bodoni Moda
3. Onboarding: ghost numbers visible, icon circle present, glow behind each panel, no "Claude" text
4. Recipes: recipe cards show cuisine gradient header strip (no emoji), name readable, macro chips colored
5. Run `npx tsc --noEmit` — confirm Recipe type change (cuisine field) passes TypeScript
6. Trigger recipe generation: confirm Sous persona active, aiReasoning doesn't say "Claude"

---

## What Is NOT Changing

- App architecture, navigation, stores (except Recipe.cuisine field)
- Animation library (reanimated stays)
- Color palette core tokens (only adding glow variants)
- Zustand stores (except recipeStore.ts cuisine field)
- All backend services (analytics, purchases, superwall)
- Swipe gesture system in RecipeSwipeDeck.tsx
