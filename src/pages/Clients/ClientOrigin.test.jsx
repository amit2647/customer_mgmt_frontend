import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientOrigin from "./ClientOrigin";

const api = vi.hoisted(() => ({ getLead: vi.fn(), getLeads: vi.fn(), linkLead: vi.fn() }));

vi.mock("../../api/leads", () => api);

const everything = () => true;

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
});

/*
 * A client and the prospect it was won from are one entity: the client's
 * Overview shows what the prospect stage learned, or offers to link one.
 */
describe("ClientOrigin", () => {
  test("shows the quote, meeting and notes of the prospect a client was won from", async () => {
    api.getLead.mockResolvedValue({ id: 4, name: "Iyer & Sons", status: "Converted", quoted_fee: "45000", next_meeting_on: "2026-10-20", notes: "Wants GST and audit", updated_at: "2026-10-21T10:00:00Z" });

    render(<ClientOrigin client={{ id: 9, source_lead_id: 4 }} can={everything} onLinked={vi.fn()} />);

    expect(await screen.findByText("₹45,000")).toBeInTheDocument();
    expect(screen.getByText("Wants GST and audit")).toBeInTheDocument();
    expect(api.getLead).toHaveBeenCalledWith(4);
  });

  test("links an unlinked client to a prospect", async () => {
    api.getLeads.mockResolvedValue([
      { id: 5, name: "Rao & Co", status: "In Discussion" },
      { id: 6, name: "Taken Ltd", status: "Converted", converted_customer_id: 2 },
    ]);
    api.linkLead.mockResolvedValue({});
    const onLinked = vi.fn();

    render(<ClientOrigin client={{ id: 9, source_lead_id: null }} can={everything} onLinked={onLinked} />);

    fireEvent.click(screen.getByRole("button", { name: "Link a prospect" }));

    const select = await screen.findByLabelText("Prospect");
    expect(screen.queryByRole("option", { name: /Taken Ltd/ })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    await waitFor(() => expect(api.linkLead).toHaveBeenCalledWith("5", 9));
    expect(onLinked).toHaveBeenCalled();
  });

  test("offers nothing to someone who cannot read prospects", () => {
    const { container } = render(<ClientOrigin client={{ id: 9, source_lead_id: 4 }} can={() => false} onLinked={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(api.getLead).not.toHaveBeenCalled();
  });
});
