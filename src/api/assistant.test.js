import { describe, expect, test } from "vitest";

import { newId } from "./assistant";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/*
 * These ids are idempotency keys: a retry reuses one so the server returns the
 * stored answer. They must be real UUIDs (the server rejects anything else)
 * and must not collide.
 */
describe("newId", () => {
  test("returns a v4 UUID", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  test("still works where crypto.randomUUID is missing (plain http)", () => {
    const original = crypto.randomUUID;

    // Simulate an insecure context, where the function does not exist.
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });

    try {
      const ids = new Set(Array.from({ length: 100 }, () => newId()));

      expect(ids.size).toBe(100);
      for (const id of ids) {
        expect(id).toMatch(UUID_V4);
      }
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
