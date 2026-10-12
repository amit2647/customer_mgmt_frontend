import { describe, expect, test } from "vitest";

import validator from "./schemaValidator";

const schema = {
  type: "object",
  required: ["constitution"],
  properties: {
    constitution: { type: "string", enum: ["company", "firm"] },
    incorporated: { type: "string", format: "date" },
    people: { type: "array", items: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
  },
  allOf: [{ if: { properties: { constitution: { const: "company" } }, required: ["constitution"] }, then: { required: ["incorporated"] } }],
};

/*
 * The forms' validator without generated code (auth-hardening P6): errors land
 * on their fields in rjsf's shape, conditions apply, and nothing calls eval.
 */
describe("schemaValidator", () => {
  test("puts each problem under its own field, nested ones included", () => {
    const { errors, errorSchema } = validator.validateFormData({ incorporated: "soon", people: [{}] }, schema);

    expect(errorSchema.constitution.__errors).toEqual(["Required"]);
    expect(errorSchema.incorporated.__errors).toEqual(["Enter a date (YYYY-MM-DD)"]);
    expect(errorSchema.people[0].name.__errors).toEqual(["Required"]);
    expect(errors.every((error) => error.property.startsWith("."))).toBe(true);
  });

  test("applies if/then: a company needs its incorporation date, a firm does not", () => {
    expect(validator.validateFormData({ constitution: "company" }, schema).errorSchema.incorporated.__errors).toEqual(["Required"]);
    expect(validator.validateFormData({ constitution: "firm" }, schema).errors).toEqual([]);
  });

  test("answers isValid for rjsf's own choices, with the root's definitions", () => {
    const root = { definitions: { kind: { enum: ["a", "b"] } } };
    expect(validator.isValid({ $ref: "#/definitions/kind" }, "a", root)).toBe(true);
    expect(validator.isValid({ $ref: "#/definitions/kind" }, "z", root)).toBe(false);
  });

  test("never generates code", () => {
    const original = globalThis.Function;
    globalThis.Function = () => {
      throw new Error("eval is forbidden by the CSP");
    };
    try {
      expect(validator.validateFormData({ constitution: "firm" }, { ...schema }).errors).toEqual([]);
    } finally {
      globalThis.Function = original;
    }
  });
});
