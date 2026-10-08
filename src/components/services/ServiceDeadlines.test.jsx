import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ServiceDeadlines from "./ServiceDeadlines";

const api = vi.hoisted(() => ({
  getRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  removeRule: vi.fn(),
  setRuleActive: vi.fn(),
  setExtension: vi.fn(),
  removeExtension: vi.fn(),
}));
vi.mock("../../api/obligations", () => api);

const SERVICES = [{ key: "gst_returns", name: "GST Returns" }, { key: "tax_audit", name: "Tax Audit" }];
const GSTR1 = { key: "gstr1", name: "GSTR-1", service_key: "gst_returns", kind: "periodic", frequency: "monthly", is_active: true, bundle_key: "ca-practice", overrides: [], definition: { kind: "periodic", frequency: "monthly", schedule: { day: 11, offsetMonths: 1 } } };

beforeEach(() => {
  vi.clearAllMocks();
  api.getRules.mockResolvedValue([GSTR1, { ...GSTR1, key: "other", service_key: "tax_audit", name: "Other service's" }]);
  api.createRule.mockResolvedValue({});
});

/*
 * A service's deadlines: only its own rules, added through the timing
 * editor, and the bundle's never deleted (switched off instead).
 */
describe("ServiceDeadlines", () => {
  test("lists only this service's rules, in words", async () => {
    render(<ServiceDeadlines service={SERVICES[0]} services={SERVICES} canEdit />);

    const grid = await screen.findByRole("region", { name: "GST Returns deadlines" });
    expect(within(grid).getByText("GSTR-1")).toBeInTheDocument();
    expect(within(grid).queryByText("Other service's")).not.toBeInTheDocument();
    expect(within(grid).getByText("Monthly, day 11 of the next month")).toBeInTheDocument();
    // The bundle's rule can be edited, not deleted.
    expect(within(grid).getByRole("button", { name: "Edit GSTR-1" })).toBeInTheDocument();
    expect(within(grid).queryByRole("button", { name: "Delete GSTR-1" })).not.toBeInTheDocument();
  });

  test("adds a quarterly deadline with a date per quarter", async () => {
    render(<ServiceDeadlines service={SERVICES[0]} services={SERVICES} canEdit />);
    fireEvent.click(await screen.findByRole("button", { name: "Add deadline" }));

    const form = screen.getByRole("form", { name: "New deadline for GST Returns" });
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "GST audit" } });
    fireEvent.click(within(form).getByRole("radio", { name: "Quarterly" }));
    fireEvent.click(within(form).getByRole("radio", { name: "A date for each quarter" }));
    expect(within(form).getByText("Quarterly: 31 Jul, 31 Oct, 31 Jan, 31 May")).toBeInTheDocument();
    fireEvent.click(within(form).getByRole("button", { name: "Add deadline" }));

    await waitFor(() =>
      expect(api.createRule).toHaveBeenCalledWith({
        name: "GST audit",
        frequency: "quarterly",
        schedule: { dates: { Q1: "07-31", Q2: "10-31", Q3: "01-31", Q4: "05-31" } },
        serviceKey: "gst_returns",
      }),
    );
  });

  test("without obligations.rules it is read-only", async () => {
    render(<ServiceDeadlines service={SERVICES[0]} services={SERVICES} canEdit={false} />);
    await screen.findByText("GSTR-1");
    expect(screen.queryByRole("button", { name: "Add deadline" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "GSTR-1 active" })).toBeDisabled();
  });
});
