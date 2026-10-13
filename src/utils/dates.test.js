import { describe, expect, test } from "vitest";

import { formatDate, formatDateTime, formatDay } from "./dates";

/*
 * Every date the app shows is dd/mm/yyyy.
 */
describe("dates", () => {
  test("a date-only value is the date stored, zero-padded, never shifted by a time zone", () => {
    expect(formatDay("2026-10-12")).toBe("12/10/2026");
    expect(formatDay("2026-01-05T00:00:00.000Z")).toBe("05/01/2026");
    expect(formatDay("2026-12-31")).toBe("31/12/2026");
  });

  test("a moment is its local date, and with a time when asked", () => {
    const moment = new Date(2026, 9, 12, 18, 5);
    expect(formatDate(moment.toISOString())).toBe("12/10/2026");
    expect(formatDateTime(moment.toISOString())).toMatch(/^12\/10\/2026, \d{1,2}[:.]05/);
  });

  test("nothing, or nonsense, shows nothing", () => {
    for (const value of [null, undefined, "", "not a date"]) {
      expect(formatDay(value)).toBe("");
      expect(formatDate(value)).toBe("");
      expect(formatDateTime(value)).toBe("");
    }
  });
});
