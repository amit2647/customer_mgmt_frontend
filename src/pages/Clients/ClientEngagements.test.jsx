import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientEngagements from "./ClientEngagements";
import * as api from "../../api/engagements";

vi.mock("../../api/engagements", () => ({
  createEngagement: vi.fn(),
  getEngagementTypes: vi.fn(),
  getEngagements: vi.fn(),
  getPayments: vi.fn(),
  getPeriods: vi.fn(),
  recordPayment: vi.fn(),
  updateEngagement: vi.fn(),
}));

const STAGES = [
  { key: "appointed", label: "Appointed" },
  { key: "fieldwork", label: "Fieldwork" },
  { key: "signed", label: "Signed" },
];
const TYPE = { key: "annual", name: "Annual engagement", period_kind: "financial_year", stages: STAGES };
const SERVICES = [{ id: 1, name: "Statutory Audit" }, { id: 2, name: "GST Returns" }];
const ENGAGEMENT = {
  id: 9,
  periodLabel: "2026-27",
  appointmentOn: null,
  stage: "fieldwork",
  attributes: { agm_on: "2026-10-07" },
  type: TYPE,
  lines: [{ id: 1, serviceId: 1, feeAmount: 50000, expensesAmount: 0 }],
  totals: { gross: 50000, received: 0, balance: 50000 },
};

const everything = () => true;
const renderTab = () =>
  render(<ClientEngagements view="engagement" client={{ id: 5, services: SERVICES }} bundle={null} services={SERVICES} can={everything} readOnly={false} />);

beforeEach(() => {
  vi.clearAllMocks();
  api.getEngagementTypes.mockResolvedValue([TYPE]);
  api.getPeriods.mockResolvedValue({ periods: [{ label: "2025-26" }, { label: "2026-27" }, { label: "2027-28" }] });
});

/*
 * The Engagement tab: one card per year with where it stands, edited in
 * place; an empty client is told what an engagement is and offered one.
 */
describe("ClientEngagements", () => {
  test("a client without engagements is offered the first one", async () => {
    api.getEngagements.mockResolvedValue([]);
    renderTab();

    expect(await screen.findByText("No engagements yet")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Add engagement for FY 2026-27" }));

    const form = screen.getByRole("form", { name: "New engagement" });
    expect(within(form).getByLabelText("Financial year")).toHaveValue("2026-27");
    // The client's own services start ticked, with fees to fill in.
    expect(within(form).getByLabelText("Fee for Statutory Audit")).toBeInTheDocument();
    expect(within(form).getByText("2 services engaged")).toBeInTheDocument();
  });

  test("a card shows its stage, facts and services", async () => {
    api.getEngagements.mockResolvedValue([ENGAGEMENT]);
    renderTab();

    const card = await screen.findByRole("article", { name: "Annual engagement 2026-27" });
    expect(within(card).getByText("Fieldwork").closest("li")).toHaveAttribute("aria-current", "step");
    expect(within(card).getByText("Not set")).toBeInTheDocument();
    expect(within(card).getByText("₹50,000")).toBeInTheDocument();
  });

  test("Edit opens the form in place of the card, and the stage is a choice of pills", async () => {
    api.getEngagements.mockResolvedValue([ENGAGEMENT]);
    api.updateEngagement.mockResolvedValue({});
    renderTab();

    fireEvent.click(await screen.findByRole("button", { name: "Edit engagement FY 2026-27" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    const form = screen.getByRole("form", { name: "Edit engagement" });
    fireEvent.click(within(form).getByRole("radio", { name: "Signed" }));
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));

    expect(api.updateEngagement).toHaveBeenCalledWith(9, expect.objectContaining({ stage: "signed" }));
  });
});
