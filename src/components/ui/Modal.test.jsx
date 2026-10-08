import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import Modal from "./Modal";

function Opener({ onSubmit = vi.fn(), busy = false }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Add deadline</button>
      {open && (
        <Modal title="New deadline" onClose={() => setOpen(false)} onSubmit={onSubmit} busy={busy} footer={<button type="submit">Save</button>}>
          <label>Name<input autoFocus /></label>
        </Modal>
      )}
    </>
  );
}

/*
 * The one dialog: named by its title, a form when it saves something,
 * closed by Escape or a click outside (never while saving), and focus
 * goes back to whatever opened it.
 */
describe("Modal", () => {
  test("is a named dialog whose form submits", () => {
    const onSubmit = vi.fn();
    render(<Opener onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Add deadline" }));

    expect(screen.getByRole("dialog", { name: "New deadline" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    fireEvent.submit(screen.getByRole("form", { name: "New deadline" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  test("Escape and a click outside close it, and focus returns to the opener", () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Add deadline" });

    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    fireEvent.mouseDown(document.querySelector(".ui-modal-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("while saving, Escape and outside clicks do nothing", () => {
    render(<Opener busy />);
    fireEvent.click(screen.getByRole("button", { name: "Add deadline" }));

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(document.querySelector(".ui-modal-backdrop"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });

  test("without an autoFocus field, focus lands on the first field, not the close button", () => {
    render(
      <Modal title="Record payment" onClose={() => {}}>
        <label>Amount<input /></label>
      </Modal>,
    );
    expect(screen.getByLabelText("Amount")).toHaveFocus();
  });
});
