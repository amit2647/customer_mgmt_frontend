import { ThinkingOrb } from "thinking-orbs";

import { useTheme } from "../../context/ThemeContext";

const CAPTIONS = {
  idle: "Ready",
  listening: "Listening",
  processing: "Thinking",
  responding: "Responding",
  confirming: "Waiting for you",
};

/*
 * Our five states mapped onto the library's nine verbs, each a different
 * animation rather than the same one retimed. `speed` only nudges the preset's
 * own baked tempo — the presets are hand-tuned, so large multipliers undo them.
 */
const STATES = {
  idle: { state: "breathing", speed: 0.85 },
  listening: { state: "listening", speed: 1 },
  processing: { state: "working", speed: 1.2 },
  responding: { state: "composing", speed: 1.1 },
  confirming: { state: "shaping", speed: 0.9 },
};

/*
 * The library ships three sizes, and they are separate designs rather than a
 * scale factor — each carries its own dot count, dot size and speed. Passing
 * anything else, or scaling the canvas with CSS, throws that tuning away and
 * blurs the raster.
 */
const SIZES = { lg: 64, sm: 32, xs: 20 };

/*
 * Our themes are named for their accent, not light/dark, so the library's
 * `auto` cannot read them — it would fall through to prefers-color-scheme and
 * put dark ink on our dark themes whenever the OS was set to light. Pin it.
 */
const DARK_THEMES = new Set(["mint", "coral"]);

/*
 * The assistant's state, as a dotted thinking orb.
 *
 * The orb is `thinking-orbs` (MIT, Jakub Antalik) — a plain 2D canvas with no
 * WebGL and no filters, on a transparent background, so it sits on the glass
 * with no plate or edge behind it. It handles reduced motion, offscreen
 * pausing and tab visibility itself; everything here is the mapping.
 */
function AssistantOrb({ state = "idle", size = "lg", caption = true }) {
  const label = CAPTIONS[state] || CAPTIONS.idle;
  const orb = STATES[state] || STATES.idle;

  const { theme } = useTheme();

  return (
    <div className={`ai-orb ai-orb-${size} is-${state}`}>
      <ThinkingOrb
        state={orb.state}
        speed={orb.speed}
        size={SIZES[size] || SIZES.lg}
        theme={DARK_THEMES.has(theme) ? "dark" : "light"}
        aria-label={`Assistant status: ${label}`}
      />

      {caption && (
        /*
         * aria-live so a screen reader hears the transitions the orb is showing
         * sighted users; polite so it never interrupts the reply itself.
         */
        <span className="ai-orb-caption" aria-live="polite">
          {label}
        </span>
      )}
    </div>
  );
}

export default AssistantOrb;
