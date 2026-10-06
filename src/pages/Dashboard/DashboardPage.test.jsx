import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DashboardPage from "./DashboardPage";

const api = vi.hoisted(() => ({ getDashboard: vi.fn() }));
vi.mock("../../api/dashboard", () => api);

const CORE = {
  metrics: { totalLeads: 2, totalCustomers: 1, qualifiedLeads: 1, convertedLeads: 1, conversionRate: 50 },
  pipeline: [], leadSources: [], recentLeads: [], serviceDemand: [], attentionItems: [],
  serviceCatalog: { totalServices: 0, activeServices: 0, servicesInDemand: 0 },
};

beforeEach(() => api.getDashboard.mockReset());

/*
 * The Dashboard's top cards: the core lead and customer figures, or — with a
 * profession bundle — the bundle's own cards in their place (DASH-01).
 */
describe("DashboardPage", () => {
  test("without a bundle, the lead and customer cards are as they always were", async () => {
    api.getDashboard.mockResolvedValue({ ...CORE, bundleCards: null });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText("Total Leads")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Key figures" })).not.toBeInTheDocument();
  });

  test("with a bundle, its cards replace them, in its order, each opening its own screen", async () => {
    api.getDashboard.mockResolvedValue({
      ...CORE,
      bundleCards: [
        { key: "clients", label: "Clients", query: "clients_total", value: 42, hint: "38 regular · 4 one-time" },
        { key: "overdue", label: "Overdue deadlines", query: "obligations_by_state", value: 10 },
        { key: "prospects", label: "Prospects", query: "prospects_open", value: 3, hint: "1 with a quote" },
        { key: "in_progress", label: "In progress", query: "obligations_by_state", value: 0 },
      ],
    });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    const figures = await screen.findByRole("region", { name: "Key figures" });
    expect(within(figures).getAllByRole("link")).toHaveLength(4);
    expect(figures).toHaveTextContent("38 regular · 4 one-time");
    expect(screen.getByRole("link", { name: /Clients/ })).toHaveAttribute("href", "/clients");
    expect(screen.getByRole("link", { name: /Prospects/ })).toHaveAttribute("href", "/prospects");
    expect(screen.getByRole("link", { name: /Overdue deadlines/ })).toHaveAttribute("href", "/deadlines");
    expect(screen.queryByText("Total Leads")).not.toBeInTheDocument();
  });
});
