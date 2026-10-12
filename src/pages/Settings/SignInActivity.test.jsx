import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import SignInActivity from "./SignInActivity";
import * as api from "../../api/profile";

vi.mock("../../api/profile", () => ({ getActivity: vi.fn() }));

/*
 * Profile → Sign-in activity (auth-hardening P6).
 */
describe("SignInActivity", () => {
  test("loads only when opened, and marks what needs attention", async () => {
    api.getActivity.mockResolvedValue({
      events: [
        { id: 2, event: "login.failed", label: "Wrong password", ip: "203.0.113.9", userAgent: "Mozilla/5.0 (Windows NT 10.0) Firefox/155.0", at: "2026-10-12T09:00:00Z" },
        { id: 1, event: "login.succeeded", label: "Signed in", ip: "198.51.100.4", userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0", at: "2026-10-12T08:00:00Z" },
      ],
    });
    render(<SignInActivity />);
    expect(api.getActivity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(await screen.findByText("Wrong password")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.9")).toBeInTheDocument();
    expect(screen.getByText("Firefox on Windows")).toBeInTheDocument();
    expect(screen.getByText("Chrome on Linux")).toBeInTheDocument();
  });
});
