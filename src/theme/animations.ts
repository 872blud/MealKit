import { Easing } from 'react-native-reanimated';

// ─── Durations ──────────────────────────────────────────────────────────────

export const DURATION = {
  enter: 350,      // Things appearing
  exit: 220,       // Things disappearing (always faster than enter)
  toggle: 250,     // Things morphing in place
  button: 160,     // Button press feedback
  fast: 120,       // Micro-interactions
} as const;

// ─── Easing Curves ──────────────────────────────────────────────────────────

// Enter: expo-out — starts fast, decelerates. Used for all entrances.
export const EASING_ENTER = Easing.bezier(0.16, 1, 0.3, 1);

// Exit: ease-in — accelerates into disappearance. Used for all exits.
export const EASING_EXIT = Easing.bezier(0.7, 0, 0.84, 0);

// Toggle: ease-in-out — balanced. Used for things that morph.
export const EASING_TOGGLE = Easing.bezier(0.65, 0, 0.35, 1);

// Fast: quick snappy response. Used for micro-interactions.
export const EASING_FAST = Easing.bezier(0.23, 1, 0.32, 1);

// ─── Timing Configs ─────────────────────────────────────────────────────────

export const TIMING_ENTER = { duration: DURATION.enter, easing: EASING_ENTER };
export const TIMING_EXIT = { duration: DURATION.exit, easing: EASING_EXIT };
export const TIMING_TOGGLE = { duration: DURATION.toggle, easing: EASING_TOGGLE };
export const TIMING_BUTTON = { duration: DURATION.button, easing: EASING_ENTER };
export const TIMING_FAST = { duration: DURATION.fast, easing: EASING_FAST };

// ─── Spring Config ───────────────────────────────────────────────────────────

// For sheets, modals, drag interactions. No visible overshoot.
export const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 1,
} as const;

// ─── List Stagger ─────────────────────────────────────────────────────────

export const STAGGER_ITEM_MS = 40;   // Delay per item
export const STAGGER_MAX_MS = 300;    // Cap — no list takes more than 300ms total

export function getStaggerDelay(index: number): number {
  return Math.min(index * STAGGER_ITEM_MS, STAGGER_MAX_MS);
}

// ─── Entry Animation Rules (Emil Kowalski) ──────────────────────────────────
// ✅ Enter from scale(0.95) + opacity(0) — never from scale(0)
// ✅ Exit: faster than enter (220ms vs 350ms)
// ✅ Button press: scale(0.97), 160ms expo-out
// ✅ Sheets/modals: withSpring using SPRING_CONFIG
// ✅ Only animate transform + opacity — never width/height/padding
// ❌ No bouncy springs (damping < 15)
// ❌ No decorative animations — every animation has a purpose
