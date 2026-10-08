import { describe, expect, test } from "vitest";

import { describeRule, emptyForm, formFromRule, payloadFrom } from "./ruleTiming";

/*
 * A rule's timing in words, and through the editor's fields and back: what
 * the CA bundle ships must round-trip unchanged, ITR's two dates included.
 */
const rule = (frequency, definition) => ({ kind: "periodic", frequency, name: "R", definition: { kind: "periodic", frequency, ...definition } });

const CA = [
  rule("monthly", { schedule: { day: 11, offsetMonths: 1 } }),
  rule("quarterly", { schedule: { dates: { Q1: "07-31", Q2: "10-31", Q3: "01-31", Q4: "05-31" } } }),
  rule("yearly", { schedule: { date: "09-30" } }),
  rule("yearly", { condition: { engaged: "tax_audit" }, schedule: { date: "10-31" }, else: { date: "07-31" } }),
];

describe("rule timing", () => {
  test("reads in words", () => {
    expect(describeRule(CA[0])).toBe("Monthly, day 11 of the next month");
    expect(describeRule(CA[1])).toBe("Quarterly: 31 Jul, 31 Oct, 31 Jan, 31 May");
    expect(describeRule(CA[2])).toBe("Yearly, 30 Sep after the year");
    expect(describeRule(CA[3], () => "Tax Audit")).toBe("Yearly, 31 Jul after the year; 31 Oct after the year when Tax Audit is engaged");
  });

  test("the CA rules round-trip through the editor unchanged", () => {
    for (const shipped of CA) {
      const { kind, frequency, ...expected } = shipped.definition;
      const payload = payloadFrom(formFromRule(shipped));
      expect({ ...payload, name: undefined }).toEqual({ name: undefined, frequency, ...expected });
      expect(kind).toBe("periodic");
    }
  });

  test("a rule beyond the editor (relative, or another kind of condition) is left to the bundle", () => {
    expect(formFromRule({ kind: "relative", definition: { kind: "relative", relativeTo: "engagement.attributes.agm_on" } })).toBeNull();
    expect(formFromRule(rule("yearly", { condition: { filled: { var: "client.name" } }, schedule: { date: "10-31" }, else: { date: "07-31" } }))).toBeNull();
  });

  test("a new deadline starts monthly on the 11th of the next month", () => {
    expect(payloadFrom({ ...emptyForm(), name: " GSTR-1 " })).toEqual({ name: "GSTR-1", frequency: "monthly", schedule: { day: 11, offsetMonths: 1 } });
  });
});
