import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import BundlePage from "./BundlePage";

const api = vi.hoisted(() => ({ getBundles: vi.fn(), installBundle: vi.fn() }));

vi.mock("../../api/bundles", () => api);

const CA = {
  key: "ca-practice",
  name: "CA Practice",
  description: "For chartered accountancy firms.",
  version: "0.1.0",
  capabilities: [],
  contents: { services: 12, packages: 2, roles: ["Partner", "Audit Manager"], emails: 2 },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <BundlePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  api.getBundles.mockReset();
  api.installBundle.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

/*
 * Settings → Profession Bundle: offer a bundle, install it after a
 * confirmation, and show an install that stopped part-way with a way to resume.
 */
describe("BundlePage", () => {
  test("offers a bundle with what it contains", async () => {
    api.getBundles.mockResolvedValue({ bundles: [CA], installed: null });
    renderPage();

    expect(await screen.findByRole("heading", { name: /CA Practice/ })).toBeInTheDocument();
    expect(screen.getByText("12 services and 2 packages")).toBeInTheDocument();
    expect(screen.getByText("Role templates: Partner, Audit Manager")).toBeInTheDocument();
    expect(screen.getByText("2 reminder emails, switched off")).toBeInTheDocument();
  });

  test("installs after confirmation, then shows the steps", async () => {
    api.getBundles
      .mockResolvedValueOnce({ bundles: [CA], installed: null })
      .mockResolvedValueOnce({
        bundles: [CA],
        installed: {
          key: "ca-practice", name: "CA Practice", version: "0.1.0", status: "installed", installedAt: "2026-10-03T10:00:00Z",
          steps: [{ step: "roles", status: "done", attempts: 1, error: null }],
        },
      });
    api.installBundle.mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Install CA Practice" }));

    await waitFor(() => expect(api.installBundle).toHaveBeenCalledWith("ca-practice"));
    expect(await screen.findByText("Role templates")).toBeInTheDocument();
    expect(screen.getByText(/reminder emails are switched off/)).toBeInTheDocument();
  });

  test("does nothing when the confirmation is declined", async () => {
    window.confirm.mockReturnValue(false);
    api.getBundles.mockResolvedValue({ bundles: [CA], installed: null });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Install CA Practice" }));

    expect(api.installBundle).not.toHaveBeenCalled();
  });

  test("an install that stopped shows the failing step and offers to resume", async () => {
    api.getBundles.mockResolvedValue({
      bundles: [CA],
      installed: {
        key: "ca-practice", name: "CA Practice", version: "0.1.0", status: "failed",
        steps: [
          { step: "roles", status: "done", attempts: 1, error: null },
          { step: "email", status: "failed", attempts: 1, error: "the email service could not be reached" },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText("the email service could not be reached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume install" })).toBeInTheDocument();
  });
});
