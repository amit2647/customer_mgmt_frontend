import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientCompliance from "./ClientCompliance";
import * as obligations from "../../api/obligations";

vi.mock("../../api/engagements", () => ({
  getEngagementTypes: vi.fn().mockResolvedValue([{ key: "annual" }]),
  getPeriods: vi.fn().mockResolvedValue({ periods: [{ label: "2026-27" }], current: "2026-27" }),
}));
vi.mock("../../api/obligations", () => ({ getClientDeadlines: vi.fn(), updateDeadline: vi.fn() }));

const item = (id, title, state, due) => ({ id, title, state, status: state === "completed" ? "filed" : "pending", due_on: due });

beforeEach(() => {
  obligations.getClientDeadlines.mockResolvedValue({
    services: [
      { serviceKey: "gst_returns", serviceName: "GST Returns", done: 1, total: 2, overdue: 1, items: [item(1, "GSTR-1 · Apr 2026", "overdue", "2026-05-11"), item(2, "GSTR-3B · Apr 2026", "completed", "2026-05-20")] },
      { serviceKey: "income_tax", serviceName: "Income Tax Return", done: 0, total: 1, overdue: 0, items: [item(3, "Income tax return · FY 2026-27", "upcoming", "2027-07-31")] },
    ],
  });
});

const titles = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

/*
 * The Compliance tab: each service's progress, then one grid of the year's
 * deadlines that filters by service and state.
 */
describe("ClientCompliance", () => {
  test("shows each service's progress and every deadline in one grid, soonest first", async () => {
    render(<ClientCompliance client={{ id: 5 }} can={() => true} readOnly={false} />);

    const progress = await screen.findByRole("list", { name: "Progress by service" });
    expect(progress).toHaveTextContent("1/2 done");
    expect(progress).toHaveTextContent("1 overdue");

    expect(await screen.findByText("Income tax return · FY 2026-27")).toBeInTheDocument();
    expect(titles()).toEqual(["GSTR-1 · Apr 2026", "GSTR-3B · Apr 2026", "Income tax return · FY 2026-27"]);
  });

  test("filters the grid to the services chosen", async () => {
    render(<ClientCompliance client={{ id: 5 }} can={() => true} readOnly={false} />);
    await screen.findByText("Income tax return · FY 2026-27");

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Service" }));

    const chip = screen.getByRole("group", { name: "Service filter" });
    fireEvent.click(within(chip).getByRole("button", { name: /^Service/ }));
    fireEvent.click(within(chip).getByRole("checkbox", { name: "Income Tax Return" }));

    expect(titles()).toEqual(["Income tax return · FY 2026-27"]);
  });

  test("a service card filters the grid, and the Service chip shows the same choice", async () => {
    render(<ClientCompliance client={{ id: 5 }} can={() => true} readOnly={false} />);
    await screen.findByText("Income tax return · FY 2026-27");

    const card = screen.getByRole("button", { name: /Income Tax Return/ });
    fireEvent.click(card);

    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["Income tax return · FY 2026-27"]);
    expect(screen.getByRole("group", { name: "Service filter" })).toHaveTextContent("Income Tax Return");

    fireEvent.click(screen.getByRole("button", { name: "Show all services" }));
    expect(titles()).toHaveLength(3);
    expect(screen.queryByRole("group", { name: "Service filter" })).not.toBeInTheDocument();
  });

  test("one service card at a time: choosing another replaces it, choosing it again clears it", async () => {
    render(<ClientCompliance client={{ id: 5 }} can={() => true} readOnly={false} />);
    await screen.findByText("Income tax return · FY 2026-27");

    const gst = screen.getByRole("button", { name: /GST Returns/ });
    const income = screen.getByRole("button", { name: /Income Tax Return/ });

    fireEvent.click(gst);
    fireEvent.click(income);

    expect(gst).toHaveAttribute("aria-pressed", "false");
    expect(income).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["Income tax return · FY 2026-27"]);
    const chip = screen.getByRole("group", { name: "Service filter" });
    expect(chip).toHaveTextContent("Income Tax Return");
    expect(chip).not.toHaveTextContent("GST Returns");

    fireEvent.click(income);
    expect(income).toHaveAttribute("aria-pressed", "false");
    expect(titles()).toHaveLength(3);
    expect(screen.queryByRole("group", { name: "Service filter" })).not.toBeInTheDocument();
  });

  test("two services picked in the Service chip leave no card chosen", async () => {
    render(<ClientCompliance client={{ id: 5 }} can={() => true} readOnly={false} />);
    await screen.findByText("Income tax return · FY 2026-27");

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Service" }));
    const chip = screen.getByRole("group", { name: "Service filter" });
    fireEvent.click(within(chip).getByRole("button", { name: /^Service/ }));
    fireEvent.click(within(chip).getByRole("checkbox", { name: "Income Tax Return" }));
    fireEvent.click(within(chip).getByRole("checkbox", { name: "GST Returns" }));

    expect(titles()).toHaveLength(3);
    expect(screen.getByRole("button", { name: /GST Returns/, pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Income Tax Return/, pressed: false })).toBeInTheDocument();
  });
});
