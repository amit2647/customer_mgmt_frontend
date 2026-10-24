import { fireEvent, screen, within } from "@testing-library/react";

/*
 * Answers the confirm dialog (components/ui/feedback.js `confirmAction`):
 * its last button confirms, "Cancel" declines. Returns the dialog's title so
 * a test can check what was asked.
 */
export async function answerConfirm(yes = true) {
  const dialog = await screen.findByRole("dialog");
  const title = within(dialog).getByRole("heading").textContent;
  const buttons = within(dialog).getAllByRole("button");

  fireEvent.click(yes ? buttons.at(-1) : within(dialog).getByRole("button", { name: "Cancel" }));
  return title;
}
