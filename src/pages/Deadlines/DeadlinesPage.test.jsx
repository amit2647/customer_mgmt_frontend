import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DeadlinesPage from "./DeadlinesPage";

vi.mock("../../api/engagements", () => ({
  getEngagementTypes: vi.fn().mockResolvedValue([{ key: "annual" }]),
  getPeriods: vi.fn().mockResolvedValue({ current: "2026-27", periods: [{ label: "2025-26" }, { label: "2026-27" }] }),
}));

const api = vi.hoisted(() => ({ getDeadlines: vi.fn() }));
vi.mock("../../api/obligations", () => api);
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({ bundle: { key: "ca-practice", capabilities: ["obligations"] }, term: (key, many) => (many ? "Clients" : "Client") }),
}));

function ClientPage() {
  const location = useLocation();
  return <p>Client page on {location.state?.tab}</p>;
}

beforeEach(() => {
  api.getDeadlines.mockResolvedValue({
    today: "2026-10-05",
    counts: { overdue: 1, due_soon: 1, in_progress: 0, upcoming: 0, completed: 0 },
    items: [
      { id: 1, customer_id: 5, customer_name: "Acme", service_name: "GST Returns", title: "GSTR-1 · Aug 2026", due_on: "2026-09-11", state: "overdue" },
      { id: 2, customer_id: 6, customer_name: "Iyer & Sons", service_name: "TDS Returns", title: "TDS return · Q2 2026-27", due_on: "2026-10-31", state: "due_soon" },
    ],
  });
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/deadlines"]}>
      <Routes>
        <Route path="/deadlines" element={<DeadlinesPage />} />
        <Route path="/clients/:id" element={<ClientPage />} />
      </Routes>
    </MemoryRouter>,
  );

/*
 * The deadline feed (COMP-04/05/06): counts that filter, the current year
 * by default, and a deadline that opens its client's Compliance tab.
 */
describe("DeadlinesPage", () => {
  test("loads the current financial year and counts each state", async () => {
    renderPage();

    expect(await screen.findByText("GSTR-1 · Aug 2026")).toBeInTheDocument();
    expect(api.getDeadlines).toHaveBeenCalledWith({ period: "2026-27" });
    const cards = screen.getByRole("group", { name: "Deadlines by state" });
    // The Dashboard's card: label, then the count.
    expect(within(cards).getByRole("button", { name: /^Overdue\s*1/ })).toBeInTheDocument();
    expect(within(cards).getByRole("button", { name: /^Completed\s*0/ })).toBeInTheDocument();
  });

  test("a count card filters to its state", async () => {
    renderPage();
    await screen.findByText("GSTR-1 · Aug 2026");

    const cards = screen.getByRole("group", { name: "Deadlines by state" });
    fireEvent.click(within(cards).getByRole("button", { name: /Due soon/ }));

    expect(screen.queryByText("GSTR-1 · Aug 2026")).not.toBeInTheDocument();
    expect(screen.getByText("TDS return · Q2 2026-27")).toBeInTheDocument();
  });

  test("search narrows the table by deadline, client or service", async () => {
    renderPage();
    await screen.findByText("GSTR-1 · Aug 2026");

    fireEvent.change(screen.getByLabelText("Search deadlines"), { target: { value: "iyer" } });

    const table = screen.getByRole("region", { name: "Deadlines" });
    expect(within(table).queryByText("GSTR-1 · Aug 2026")).not.toBeInTheDocument();
    expect(within(table).getByText("TDS return · Q2 2026-27")).toBeInTheDocument();
  });

  test("a deadline opens its client on the Compliance tab", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("GSTR-1 · Aug 2026"));

    expect(await screen.findByText("Client page on compliance")).toBeInTheDocument();
  });
});
