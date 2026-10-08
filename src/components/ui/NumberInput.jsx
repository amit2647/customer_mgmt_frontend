import { useState } from "react";

/*
 * The product's one number field: a plain field with an optional prefix (₹).
 * No stepper — amounts are typed, not clicked. Money (a field with a prefix)
 * reads with Indian digit grouping (1,50,000) while you are not editing it,
 * and turns back into the plain number while you type. Only digits and one
 * decimal point get in; `decimals={0}` takes whole numbers only.
 *
 *   value, onChange(string)  a string, as the forms keep it ("" when empty)
 *   prefix                   e.g. "₹"; also switches grouping on
 *   grouped                  digit grouping when not editing (default: with a prefix)
 *   decimals                 decimal places that may be typed (default 2)
 *   size                     "md" (46px, the wizard fields) | "sm" (36px)
 *
 * Any other prop (id, aria-label, placeholder, required, disabled, autoFocus,
 * onBlur…) goes to the <input>, so a <label> around it names it. It is a text
 * field with a numeric keyboard (inputMode), not type="number", so it can show
 * grouping and never offers the browser's spinner.
 */

const GROUPING = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

// Keep digits and one decimal point, with at most `decimals` places.
function clean(text, decimals) {
  const plain = String(text).replace(/[^\d.]/g, "");
  const [whole, ...rest] = plain.split(".");
  if (decimals === 0 || rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, decimals)}`;
}

function NumberInput({ value, onChange, prefix, grouped, decimals = 2, size = "md", disabled, readOnly, className = "", ...inputProps }) {
  const [editing, setEditing] = useState(false);
  const group = grouped ?? Boolean(prefix);
  const raw = value === null || value === undefined ? "" : String(value);
  const shown = group && !editing && raw !== "" && !Number.isNaN(Number(raw)) ? GROUPING.format(Number(raw)) : raw;

  return (
    <span className={`number-input size-${size}${disabled || readOnly ? " is-disabled" : ""} ${className}`.trim()}>
      {/* Drawn by CSS from data-prefix: as text it would join the label's name ("Fee₹"). */}
      {prefix && <span className="number-input-prefix" data-prefix={prefix} aria-hidden="true" />}
      <input
        {...inputProps}
        type="text"
        inputMode={decimals === 0 ? "numeric" : "decimal"}
        autoComplete="off"
        value={shown}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => onChange(clean(event.target.value, decimals))}
        onFocus={(event) => {
          setEditing(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setEditing(false);
          inputProps.onBlur?.(event);
        }}
      />
    </span>
  );
}

export default NumberInput;
