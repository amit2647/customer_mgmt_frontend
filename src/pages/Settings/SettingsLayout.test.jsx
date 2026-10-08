import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import SettingsLayout from "./SettingsLayout";
import SettingsPage from "./SettingsPage";

let permissions = [];
let bundle = null;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { permissions } }),
}));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({ bundle, ready: true }),
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<SettingsLayout />}>
          <Route path="/settings/*" element={<p>Section body</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const tabs = () => screen.getAllByRole("link").filter((link) => link.closest("nav")?.getAttribute("aria-label") === "Settings").map((link) => link.textContent);

/*
 * Settings is one page with tabs: each tab a group of settings, shown only
 * when the person can open something in it; a tab with several sections
 * gets a second row to pick one.
 */
describe("Settings tabs", () => {
  test("someone with no settings permissions sees only their own tabs", () => {
    permissions = [];
    bundle = null;
    renderAt("/settings/profile");

    expect(tabs()).toEqual(["Profile", "Appearance"]);
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("navigation", { name: /sections/ })).not.toBeInTheDocument();
    expect(screen.getByText("Section body")).toBeInTheDocument();
  });

  test("an administrator gets every group, and a group's sections in a second row", () => {
    permissions = ["organization.read", "users.read", "system.integrations", "email.templates.read", "email.automations.read", "bundles.manage", "obligations.read", "system.settings"];
    bundle = { key: "ca-practice", capabilities: ["obligations", "documents"] };
    renderAt("/settings/email-templates");

    expect(tabs()).toEqual(["Profile", "Appearance", "Organization", "Team", "Email", "Practice"]);
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("aria-current", "page");

    const sections = screen.getByRole("navigation", { name: "Email sections" });
    expect(sections).toHaveTextContent("AccountsTemplatesAutomations");
    expect(screen.getByRole("link", { name: "Templates" })).toHaveAttribute("aria-current", "page");
  });

  test("bundle sections stay hidden without a bundle, which is offered instead", () => {
    permissions = ["organization.read", "bundles.manage", "obligations.read"];
    bundle = null;
    renderAt("/settings/organization");

    // Organization has no Firm section without a bundle, so no second row.
    expect(screen.queryByRole("navigation", { name: /sections/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practice" })).toHaveAttribute("href", "/settings/bundle");
    expect(screen.getByRole("note")).toHaveTextContent("no profession bundle yet");
  });

  test("/settings opens the first tab", () => {
    permissions = [];
    bundle = null;
    renderAt("/settings");

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
  });
});
