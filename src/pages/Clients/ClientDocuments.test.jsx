import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientDocuments from "./ClientDocuments";

const api = vi.hoisted(() => ({ getDocumentTemplates: vi.fn(), getDocuments: vi.fn(), deleteDocument: vi.fn() }));

vi.mock("../../api/documents", () => api);
vi.mock("../../api/engagements", () => ({
  getEngagementTypes: vi.fn().mockResolvedValue([{ key: "annual" }]),
  getPeriods: vi.fn().mockResolvedValue({ current: "2026-27", periods: [{ label: "2025-26" }, { label: "2026-27" }] }),
}));

function Where() {
  const location = useLocation();
  return <p>At {location.pathname}{location.search}</p>;
}

const everything = () => true;

beforeEach(() => {
  api.getDocumentTemplates.mockResolvedValue([
    { key: "consent_appointment", name: "Consent and eligibility certificate", badge: "ICAI", enabled: true },
    { key: "tax_audit_engagement_letter", name: "Engagement letter — Tax audit", badge: "SA 210", enabled: false, reason: "Needs Tax Audit engaged for this year" },
  ]);
  api.getDocuments.mockResolvedValue([{ id: 7, title: "Consent and eligibility certificate · FY 2026-27", status: "final", template_version: 1, udin: "26123456AAAAAA1234", updated_at: "2026-10-06T10:00:00Z" }]);
});

const renderTab = () =>
  render(
    <MemoryRouter initialEntries={["/clients/5"]}>
      <Routes>
        <Route path="/clients/5" element={<ClientDocuments client={{ id: 5 }} can={everything} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

/*
 * A client's Documents tab (CD-12, DOC-09): a tile per letter for the year,
 * faded with the reason when it does not apply, and the documents made.
 */
describe("ClientDocuments", () => {
  test("shows the year's letters, and why one does not apply", async () => {
    renderTab();

    const off = await screen.findByRole("button", { name: /Tax audit/ });
    expect(off).toBeDisabled();
    expect(off).toHaveTextContent("Needs Tax Audit engaged for this year");
    expect(api.getDocumentTemplates).toHaveBeenCalledWith({ customerId: 5, period: "2026-27" });
  });

  test("lists the documents made, finalized ones with their UDIN", async () => {
    renderTab();

    expect(await screen.findByText(/UDIN 26123456AAAAAA1234/)).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  test("a letter that applies opens a new one for the year", async () => {
    renderTab();

    await screen.findByText(/UDIN/);
    fireEvent.click(within(screen.getByRole("group", { name: "Letters" })).getByRole("button", { name: /Consent and eligibility/ }));

    expect(await screen.findByText("At /clients/5/documents/new?template=consent_appointment&period=2026-27")).toBeInTheDocument();
  });
});
