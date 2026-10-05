import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("₹25,000")).toBeInTheDocument();
  });

  test("Next moves a card to the following column", async () => {
    render(<MemoryRouter><ProspectsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Move Iyer & Sons on" }));

    await waitFor(() => expect(api.updateProspect).toHaveBeenCalledWith(1, { status: "In Discussion" }));
  });
});
