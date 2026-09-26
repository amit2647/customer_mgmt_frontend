import { useEffect, useRef } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { MODE_FRAMES, paintFrame, resolvePreset } from "thinking-orbs/engine";

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
 * scale factor — each carries its own dot count, dot size and speed, and
 * resolvePreset() throws for anything above 64.
 */
const SIZES = { lg: 64, sm: 32, xs: 20 };

/* Beyond 3x the extra pixels are invisible and only cost fill rate. */
const MAX_DPR = 3;

/*
 * Our themes are named for their accent, not light/dark, so the library's
 * `auto` cannot read them — it would fall through to prefers-color-scheme and
 * put dark ink on our dark themes whenever the OS was set to light. Pin it.
 */
const DARK_THEMES = new Set(["mint", "coral"]);

/*
 * The hero orb, drawn at its real on-screen size.
 *
 * <ThinkingOrb> sizes its backing store to the preset (64px, x2 at most), so
 * enlarging it meant stretching a finished 64px raster — which is why it read
 * soft. The engine's frames are pure vector (arcs and lines), so here the
 * 64px geometry is computed exactly as the library would and painted through a
 * scaled context instead: the tuning is untouched, the pixels are native.
 *
 * The on-screen size comes from CSS (`--orb-scale`), measured with a
 * ResizeObserver, so the breakpoint rule stays the one knob.
 */
function CrispOrb({ state, speed, dark, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx) {
      return undefined;
    }

    const base = SIZES.lg;
    const { mode, speed: baseSpeed, opts } = resolvePreset(state, base);
    const frameFn = MODE_FRAMES[mode];
    const tempo = baseSpeed * speed;

    let transform = [1, 0, 0, 1, 0, 0];

    function fit() {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const cssSize = canvas.clientWidth || base;
      const px = Math.round(cssSize * dpr);

      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }

      const k = px / base;
      transform = [k, 0, 0, k, 0, 0];
    }

    function paint(seconds) {
      ctx.setTransform(...transform);
      ctx.clearRect(0, 0, base, base);
      paintFrame(ctx, frameFn(base, seconds, opts), dark);
    }

    fit();

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      // The same still frame the library shows under reduced motion.
      paint(0.6);
      return undefined;
    }

    let raf = 0;
    let running = false;
    let visible = true;

    function loop() {
      paint((performance.now() / 1000) * tempo);

      if (running) {
        raf = requestAnimationFrame(loop);
      }
    }

    function start() {
      if (running) {
        return;
      }

      running = true;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Offscreen or in a background tab, stop drawing — as the library does.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;

      if (visible && document.visibilityState !== "hidden") {
        start();
      } else {
        stop();
      }
    });

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        stop();
      } else if (visible) {
        start();
      }
    }

    const ro = new ResizeObserver(fit);

    io.observe(canvas);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    paint((performance.now() / 1000) * tempo);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, speed, dark]);

  return (
    <canvas
      ref={ref}
      className="ai-orb-canvas"
      role="img"
      aria-label={label}
    />
  );
}

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
  const dark = DARK_THEMES.has(theme);
  const ariaLabel = `Assistant status: ${label}`;

  return (
    <div className={`ai-orb ai-orb-${size} is-${state}`}>
      {size === "lg" ? (
        <CrispOrb
          state={orb.state}
          speed={orb.speed}
          dark={dark}
          label={ariaLabel}
        />
      ) : (
        // The small sizes render at their native preset, already sharp.
        <ThinkingOrb
          state={orb.state}
          speed={orb.speed}
          size={SIZES[size] || SIZES.lg}
          theme={dark ? "dark" : "light"}
          aria-label={ariaLabel}
        />
      )}

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
