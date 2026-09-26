import { describe, expect, test } from "vitest";

import { blend } from "./AssistantOrb";

function frame(count, x) {
  return {
    dots: Array.from({ length: count }, (_, i) => ({
      x: x + Math.cos(i) * 10,
      y: 32 + Math.sin(i) * 10,
      r: 1,
      a: 1,
      white: 0.5,
      z: i,
    })),
    lines: [],
  };
}

/*
 * The morph between orb states: it must start exactly on the old frame, end
 * exactly on the new one, and never produce broken values in between — even
 * when the two frames have different numbers of dots.
 */
describe("orb blend", () => {
  test("ends on the target frame", () => {
    const to = frame(12, 40);
    const result = blend(frame(8, 20), to, 1, 32);

    expect(result.dots).toHaveLength(12);
  });

  test("starts on the source frame", () => {
    const result = blend(frame(8, 20), frame(12, 40), 0, 32);

    expect(result.dots).toHaveLength(8);
  });

  test("never produces NaN or Infinity mid-morph", () => {
    for (const [a, b] of [[8, 12], [12, 8], [0, 5], [5, 0]]) {
      for (let p = 0; p <= 1; p += 0.1) {
        const { dots } = blend(frame(a, 20), frame(b, 40), p, 32);

        for (const dot of dots) {
          expect([dot.x, dot.y, dot.r, dot.a].every(Number.isFinite)).toBe(true);
        }
      }
    }
  });
});
