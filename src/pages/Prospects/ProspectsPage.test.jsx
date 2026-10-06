import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProspectsPage from "./ProspectsPage";

const api = vi.hoisted(() => ({
  convertLead: vi.fn(),
  createLead: vi.fn(),
  deleteLead: vi.fn(),
  getLeads: vi.fn(),
  updateLead: vi.fn(),
  updateProspect: vi.fn(),
}));

vi.mock("../../api/leads", () => api);
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { permissions: ["leads.read", "leads.create", "leads.update", "leads.delete", "customers.create"] } }),
}));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({
    bundle: {
      pipeline: [
        { key: "lead", label: "Leads", status: "New" },
        { key: "discussion", label: "In Discussion", status: "In Discussion" },
        { key: "quoted", label: "Quote Sent", status: "Quote Sent" },
      ],
    },
    term: (key, many) => (many ? "Clients" : "Client"),
  }),
}));

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getLeads.mockResolvedValue([
    { id: 1, name: "Iyer & Sons", status: "New", quoted_fee: "25000", next_meeting_on: "2026-10-20" },
    { id: 2, name: "Old customer", status: "Converted" },
  ]);
  api.updateProspect.mockResolvedValue({});
});

/*
 * The prospect board (PROS-01/03): the bundle's columns, cards that move
 * with Back/Next, and converted leads off the board.
 */
describe("ProspectsPage", () => {
  test("shows the bundle's columns and leaves converted leads off", async () => {
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    expect(await screen.findByText("Iyer & Sons")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In Discussion" })).toBeInTheDocument();
    expect(screen.queryByText("Old customer")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Leads" })).getByText("₹25,000")).toBeInTheDocument();
  });

  test("the Dashboard's cards count each stage, and one opens the list on it", async () => {
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);
    await screen.findByText("Iyer & Sons");

    const cards = screen.getByRole("region", { name: "Prospects by stage" });
    expect(within(cards).getByRole("button", { name: /^Open prospects\s*1/ })).toBeInTheDocument();
    expect(within(cards).getByText("₹25,000 quoted")).toBeInTheDocument();

    fireEvent.click(within(cards).getByRole("button", { name: /^In Discussion\s*0/ }));

    expect(screen.getByRole("region", { name: "Prospect list" })).toHaveTextContent("No prospects match.");
  });

  test("Next moves a card to the following column", async () => {
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Move Iyer & Sons on" }));

    await waitFor(() => expect(api.updateProspect).toHaveBeenCalledWith(1, { status: "In Discussion" }));
  });
});

/*
 * With a bundle this is the one screen for leads, so it also lists them:
 * searchable, and with converted prospects on request, each linked to the
 * client it became.
 */
describe("ProspectsPage list", () => {
  beforeEach(() => {
    localStorage.clear();
    api.getLeads.mockResolvedValue([
      { id: 1, name: "Iyer & Sons", email: "iyer@example.com", status: "New", quoted_fee: "25000" },
      { id: 3, name: "Kapoor Traders", status: "Quote Sent" },
      { id: 2, name: "Old customer", status: "Converted", converted_customer_id: 9 },
    ]);
  });

  test("the toggle switches to a list of the same prospects, and is remembered", async () => {
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "List" }));

    const list = screen.getByRole("region", { name: "Prospect list" });
    expect(list).toHaveTextContent("Iyer & Sons");
    expect(list).toHaveTextContent("Quote Sent");
    expect(list).not.toHaveTextContent("Old customer");
    expect(localStorage.getItem("omnicore-prospects-view")).toBe("list");
  });

  test("search narrows the list", async () => {
    localStorage.setItem("omnicore-prospects-view", "list");
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText("Search prospects"), { target: { value: "iyer@" } });

    const list = screen.getByRole("region", { name: "Prospect list" });
    expect(list).toHaveTextContent("Iyer & Sons");
    expect(list).not.toHaveTextContent("Kapoor Traders");
  });

  test("Show converted adds converted prospects, linked to their client and no longer editable", async () => {
    localStorage.setItem("omnicore-prospects-view", "list");
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByLabelText("Show converted"));

    const row = screen.getByText("Old customer").closest("tr");
    expect(row).toHaveTextContent("Converted");
    expect(within(row).getByRole("link", { name: "Open client" })).toHaveAttribute("href", "/clients/9");
    expect(within(row).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
