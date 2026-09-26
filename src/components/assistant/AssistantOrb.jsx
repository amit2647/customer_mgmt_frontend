import { useEffect, useRef } from "react";
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
 * resolvePreset() throws for anything above 64. The canvas's on-screen size is
 * set in CSS; this is only which tuning to draw with.
 */
const SIZES = { lg: 64, sm: 32, xs: 20 };

/* Beyond 3x the extra pixels are invisible and only cost fill rate. */
const MAX_DPR = 3;

/* Long enough to watch the shape travel, short enough not to lag the state. */
const MORPH_MS = 900;

/*
 * Our themes are named for their accent, not light/dark, so the library's
 * `auto` cannot read them — it would fall through to prefers-color-scheme and
 * put dark ink on our dark themes whenever the OS was set to light. Pin it.
 */
const DARK_THEMES = new Set(["mint", "coral"]);

const lerp = (a, b, f) => a + (b - a) * f;

const easeInOut = (p) =>
  p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;

/*
 * A source is `now => frame`: one state's animation running on its own clock.
 * Keeping each on the wall clock means neither animation pauses or rewinds
 * while the two are being blended.
 */
function sourceFor(state, speed, base) {
  const { mode, speed: baseSpeed, opts } = resolvePreset(state, base);
  const frameFn = MODE_FRAMES[mode];
  const tempo = baseSpeed * speed;

  return (now) => frameFn(base, (now / 1000) * tempo, opts);
}

/* Dots in angular order around the centre, so partners are neighbours. */
function byAngle(dots, c) {
  return dots
    .map((d) => ({ d, angle: Math.atan2(d.y - c, d.x - c) }))
    .sort((a, b) => a.angle - b.angle)
    .map((entry) => entry.d);
}

/*
 * One frame part-way between two states.
 *
 * Every dot of the old shape travels to a dot of the new one rather than the
 * two crossfading — that is what makes it read as the orb changing form. Dots
 * are paired in angular order so each travels a short way round, and the
 * whole swarm swirls and draws in slightly at the midpoint, like a breath
 * between shapes.
 *
 * The two frames rarely have the same number of dots. The shorter side is
 * stretched to match, and its duplicate copies are invisible at their own end
 * of the morph, so dots split off or merge in rather than doubling up in
 * brightness.
 */
function blend(from, to, p, c) {
  const e = easeInOut(p);
  const hump = Math.sin(Math.PI * p);

  const swirl = hump * 0.9;
  const pull = 1 - hump * 0.18;
  const cos = Math.cos(swirl);
  const sin = Math.sin(swirl);

  const place = (x, y) => {
    const dx = x - c;
    const dy = y - c;

    return [
      c + (dx * cos - dy * sin) * pull,
      c + (dx * sin + dy * cos) * pull,
    ];
  };

  const a = byAngle(from.dots, c);
  const b = byAngle(to.dots, c);
  const n = Math.max(a.length, b.length);

  const dots = [];

  for (let i = 0; i < n; i += 1) {
    const ia = a.length ? Math.floor((i * a.length) / n) : -1;
    const ib = b.length ? Math.floor((i * b.length) / n) : -1;

    const da = a[ia];
    const db = b[ib];

    // A dot with no partner grows out of, or shrinks into, the centre.
    const src = da || { x: c, y: c, r: 0, a: 0, white: db.white, z: db.z };
    const dst = db || { x: c, y: c, r: 0, a: 0, white: da.white, z: da.z };

    const firstA = i === 0 || Math.floor(((i - 1) * a.length) / n) !== ia;
    const firstB = i === 0 || Math.floor(((i - 1) * b.length) / n) !== ib;

    const [x, y] = place(lerp(src.x, dst.x, e), lerp(src.y, dst.y, e));

    dots.push({
      x,
      y,
      r: lerp(src.r, dst.r, e),
      a: lerp(firstA ? (src.a ?? 1) : 0, firstB ? (dst.a ?? 1) : 0, e),
      white: lerp(src.white, dst.white, e),
      z: lerp(src.z, dst.z, e),
    });
  }

  dots.sort((d1, d2) => d1.z - d2.z);

  // Connecting strokes cannot be paired like dots, so they ride the same swirl
  // and fade across instead.
  const carry = (lines, weight) =>
    lines.map((line) => {
      const [x1, y1] = place(line.x1, line.y1);
      const [x2, y2] = place(line.x2, line.y2);

      return { ...line, x1, y1, x2, y2, a: (line.a ?? 1) * weight };
    });

  return {
    dots: dots.filter((d) => d.a >= 0.02),
    lines: [...carry(from.lines, 1 - e), ...carry(to.lines, e)],
  };
}

/*
 * The orb, drawn with the library's engine at its real on-screen size.
 *
 * Two reasons this does not use <ThinkingOrb>. That component sizes its
 * backing store to the preset (64px, x2 at most), so enlarging it meant
 * stretching a finished raster, which read soft. And it restarts from scratch
 * when its state changes, so states swapped rather than morphed. The engine's
 * frames are pure vector geometry, so here the preset's own frames are
 * computed exactly as the library would, blended when the state changes, and
 * painted through a scaled context.
 *
 * The on-screen size comes from CSS, measured with a ResizeObserver, so
 * `--orb-scale` stays the one knob.
 */
function MorphOrb({ state, speed, base, dark, label }) {
  const ref = useRef(null);

  // Mutable across frames; never read during render.
  const live = useRef({ to: null, from: null, start: 0, repaint: null });

  // Declared before the drawing effect so the first target exists by the time
  // it runs.
  useEffect(() => {
    const next = sourceFor(state, speed, base);
    const current = live.current;
    const now = performance.now();

    if (current.to) {
      const progress = current.from
        ? Math.min(1, (now - current.start) / MORPH_MS)
        : 1;

      // Interrupted mid-morph: start from what is on screen now, frozen at
      // that point of the blend, rather than jumping back to either end.
      if (progress < 1) {
        const { from, to } = current;
        const c = base / 2;

        current.from = (t) => blend(from(t), to(t), progress, c);
      } else {
        current.from = current.to;
      }

      current.start = now;
    }

    current.to = next;
    current.repaint?.();
  }, [state, speed, base]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx) {
      return undefined;
    }

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

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

    function frameAt(now) {
      const current = live.current;

      if (!current.from || reduced) {
        current.from = null;
        return current.to(now);
      }

      const p = (now - current.start) / MORPH_MS;

      if (p >= 1) {
        current.from = null;
        return current.to(now);
      }

      return blend(current.from(now), current.to(now), p, base / 2);
    }

    function paint(now) {
      ctx.setTransform(...transform);
      ctx.clearRect(0, 0, base, base);
      paintFrame(ctx, frameAt(now), dark);
    }

    fit();

    if (reduced) {
      // The same still frame the library shows under reduced motion, redrawn
      // when the state changes instead of animating between them.
      const still = () => paint(600);

      live.current.repaint = still;
      still();

      return () => {
        live.current.repaint = null;
      };
    }

    let raf = 0;
    let running = false;
    let visible = true;

    function loop() {
      paint(performance.now());

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

    const ro = new ResizeObserver(() => {
      fit();
      paint(performance.now());
    });

    io.observe(canvas);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    paint(performance.now());

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [base, dark]);

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
 * The drawing is `thinking-orbs` (MIT, Jakub Antalik): a plain 2D canvas with
 * no WebGL and no filters, on a transparent background, so it sits on the
 * glass with no plate or edge behind it. Everything here is the mapping and
 * the morph between states.
 */
function AssistantOrb({ state = "idle", size = "lg", caption = true }) {
  const label = CAPTIONS[state] || CAPTIONS.idle;
  const orb = STATES[state] || STATES.idle;

  const { theme } = useTheme();

  return (
    <div className={`ai-orb ai-orb-${size} is-${state}`}>
      <MorphOrb
        state={orb.state}
        speed={orb.speed}
        base={SIZES[size] || SIZES.lg}
        dark={DARK_THEMES.has(theme)}
        label={`Assistant status: ${label}`}
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
