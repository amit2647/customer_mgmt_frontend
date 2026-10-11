import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import VerifyEmailPage from "./VerifyEmailPage";

const verifyEmail = vi.fn();
const startSignIn = vi.fn();

vi.mock("../../api/auth", () => ({
  verifyEmail: (...args) => verifyEmail(...args),
  startSignIn: (...args) => startSignIn(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/verify-email#a-token-from-the-email-0123456789");
});

/*
 * The link from a verification email: the token is read from after #, taken
 * out of the address, and used only when the person clicks (scanners and
 * previews open links too).
 */
describe("VerifyEmailPage", () => {
  test("confirms only on a click, and takes the token out of the address bar", async () => {
    verifyEmail.mockResolvedValue({ verified: true, email: "asha@firm.example", changed: false });
    render(<VerifyEmailPage />);

    expect(window.location.hash).toBe("");
    expect(verifyEmail).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm my email address" }));

    expect(await screen.findByRole("heading", { name: "Email address confirmed" })).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith("a-token-from-the-email-0123456789");

    fireEvent.click(screen.getByRole("button", { name: "Go to sign in" }));
    expect(startSignIn).toHaveBeenCalledWith("/");
  });

  test("a used or expired link says so and points to a new one", async () => {
    verifyEmail.mockRejectedValue(new Error("This link is not valid or has expired"));
    render(<VerifyEmailPage />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm my email address" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("not valid or has expired");
  });

  test("without a token there is nothing to confirm", () => {
    window.history.replaceState(null, "", "/verify-email");
    render(<VerifyEmailPage />);

    expect(screen.queryByRole("button", { name: "Confirm my email address" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to sign in" })).toBeInTheDocument();
  });
});
