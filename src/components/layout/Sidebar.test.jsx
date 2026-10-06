import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import Sidebar from "./Sidebar";

let bundle = null;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { permissions: ["customers.read", "leads.read"] } }),
}));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({ bundle, term: (key, many) => (many ? "Clients" : "Client") }),
}));

/*
 * An organization without a bundle keeps its navigation exactly as it was;
 * with one, Customers becomes the bundle's word and Prospects replaces Leads.
 */
describe("Sidebar", () => {
  test("is unchanged without a bundle", () => {
    bundle = null;
    render(<MemoryRouter><Sidebar collapsed={false} onToggle={() => {}} /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /Customers/ })).toHaveAttribute("href", "/customers");
    expect(screen.getByRole("link", { name: /Leads/ })).toHaveAttribute("href", "/leads");
    expect(screen.queryByRole("link", { name: /Prospects/ })).not.toBeInTheDocument();
  });

  test("follows the bundle when one is installed", () => {
    bundle = { key: "ca-practice" };
    render(<MemoryRouter><Sidebar collapsed={false} onToggle={() => {}} /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /Clients/ })).toHaveAttribute("href", "/clients");
    expect(screen.getByRole("link", { name: /Prospects/ })).toHaveAttribute("href", "/prospects");
    // One screen for leads: the board replaces the Leads list.
    expect(screen.queryByRole("link", { name: /^Leads$/ })).not.toBeInTheDocument();
  });
});
