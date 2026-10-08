import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";

import NumberInput from "./NumberInput";

function Field({ initial = "", ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <label>
      Fee
      <NumberInput {...props} value={value} onChange={setValue} />
    </label>
  );
}

/*
 * The one number field: typed, never stepped. Money reads grouped (1,50,000)
 * until you edit it; only digits and one decimal point get in.
 */
describe("NumberInput", () => {
  test("money shows Indian grouping, and the plain number while editing", () => {
    render(<Field prefix="₹" initial="150000" />);
    const input = screen.getByLabelText("Fee");

    expect(input).toHaveValue("1,50,000");
    fireEvent.focus(input);
    expect(input).toHaveValue("150000");
    fireEvent.change(input, { target: { value: "275000.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("2,75,000.5");
    expect(document.querySelector(".number-input-prefix")).toHaveAttribute("data-prefix", "₹");
  });

  test("only digits and one decimal point, with at most two places", () => {
    render(<Field prefix="₹" />);
    const input = screen.getByLabelText("Fee");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1a2,3.4.56" } });
    expect(input).toHaveValue("123.45");
  });

  test("a whole-number field (a port) takes no decimals and is not grouped", () => {
    render(<Field decimals={0} initial="65535" />);
    const input = screen.getByLabelText("Fee");

    expect(input).toHaveValue("65535");
    expect(input).toHaveAttribute("inputmode", "numeric");
    fireEvent.change(input, { target: { value: "993.5" } });
    expect(input).toHaveValue("993");
  });

  test("there is no stepper", () => {
    render(<Field prefix="₹" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  test("a field that opens focused shows the plain number", () => {
    render(<Field prefix="₹" initial="15500" autoFocus />);
    expect(screen.getByLabelText("Fee")).toHaveValue("15500");
  });
});
