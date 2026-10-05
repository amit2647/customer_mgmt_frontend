import { evaluate } from "bundle-sdk/src/conditions";
import { forClient } from "bundle-sdk/src/identifiers";

/*
 * Reading a bundle for display. The rules themselves (which identifiers a
 * client takes, which label a person's role has) come from bundle-sdk — the
 * same code customer-service enforces them with.
 */

// The label the form shows for an enum value ("pvt_ltd" → "Private Limited").
export function enumLabel(profile, field, value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const values = profile?.schema?.properties?.[field]?.enum || [];
  const names = profile?.ui?.[field]?.["ui:enumNames"] || [];
  const index = values.indexOf(value);

  return index >= 0 && names[index] ? names[index] : String(value).replace(/_/g, " ");
}

// Identifiers this client is asked for, with `shown` and `required` (WIZ-02).
export function identifiersFor(bundle, attributes) {
  return forClient(bundle?.identifiers || [], { attributes: attributes || {} });
}

// A people role's label for this client: Director, or Partner for a firm…
export function roleLabel(bundle, roleKey, attributes) {
  const role = (bundle?.peopleRoles || []).find((item) => item.key === roleKey);

  if (!role) {
    return roleKey;
  }

  const variant = (role.labelWhen || []).find((item) => {
    try {
      return evaluate(item.when, { client: { attributes: attributes || {} } });
    } catch {
      return false;
    }
  });

  return variant ? variant.label : role.label;
}

export function formatMoney(value, currency = "INR") {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

export function formatDay(value) {
  if (!value) {
    return "";
  }

  // Date-only values are formatted as the date they are, in UTC.
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}
