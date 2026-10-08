/*
 * A small coloured badge for a value in a table cell or filter list.
 *
 *   tone     neutral | success | danger | warning | info, or a category hue
 *            (violet, pink, teal, orange, lime, cyan, rose, amber, indigo)
 *   dot      a leading dot, for states (● OPEN, ● CLOSED)
 *
 * Colours come from the theme's own tokens (see data-grid.css), so a pill
 * reads in every theme, dark ones included.
 */

const CATEGORY_TONES = ["violet", "pink", "teal", "orange", "lime", "cyan", "rose", "amber", "indigo"];

// The same value always gets the same hue (e.g. every "GST" pill alike).
export function toneFor(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

function Pill({ tone = "neutral", dot = false, children, title }) {
  return (
    <span className={`grid-pill tone-${tone}${dot ? " with-dot" : ""}`} title={title}>
      {dot && <span className="grid-pill-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Pill;
