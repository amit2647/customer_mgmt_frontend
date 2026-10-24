import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { confirmAction, toast } from "./feedback";
import { answerConfirm } from "../../test/feedback";

/*
 * The product's messages (the test setup mounts the host, as the app does):
 * toasts in the corner that leave on their own, and a confirm dialog that
 * answers its caller.
 */
describe("toasts", () => {
  test("show success and error with their roles, and close on ×", async () => {
    act(() => {
      toast.success("Saved.");
      toast.error("The server refused.");
    });

    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.getByRole("alert")).toHaveTextContent("The server refused.");

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss message" })[0]);
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  test("leave on their own, and the same message twice shows once", () => {
    vi.useFakeTimers();
    try {
      act(() => {
        toast.success("Saved.");
        toast.success("Saved.");
      });
      expect(screen.getAllByText("Saved.")).toHaveLength(1);

      act(() => vi.advanceTimersByTime(4100));
      expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the confirm dialog", () => {
  test("resolves true on its confirm button and false on Cancel", async () => {
    let answer;
    act(() => {
      confirmAction({ title: "Delete X?", message: "It cannot be recovered.", confirmLabel: "Delete", danger: true }).then((value) => { answer = value; });
    });

    expect(screen.getByRole("dialog", { name: "Delete X?" })).toHaveTextContent("It cannot be recovered.");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("danger");
    await answerConfirm(true);
    await waitFor(() => expect(answer).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      confirmAction({ title: "Again?" }).then((value) => { answer = value; });
    });
    await answerConfirm(false);
    await waitFor(() => expect(answer).toBe(false));
  });
});
