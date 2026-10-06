import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProspectFormPage from "./ProspectFormPage";

const api = vi.hoisted(() => ({ createLead: vi.fn(), getLead: vi.fn(), updateLead: vi.fn(), updateLeadServices: vi.fn(), updateProspect: vi.fn() }));

vi.mock("../../api/leads", () => api);
vi.mock("../../api/services", () => ({
  getServices: vi.fn().mockResolvedValue([
    { id: 1, name: "GST Returns", category: "GST" },
    { id: 2, name: "Income Tax Return", category: "Compliance" },
    { id: 3, name: "Old service", status: "Inactive" },
  ]),
}));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({
    bundle: {
      name: "CA Practice",
      pipeline: [
        { key: "lead", label: "Leads", status: "New" },
        { key: "discussion", label: "In Discussion", status: "In Discussion" },
      ],
      profiles: { lead: { schema: { properties: { constitution: { enum: ["llp", "huf"] } } } } },
    },
    term: (key, many) => (many ? "Clients" : "Client"),
  }),
}));

function Board() {
  const location = useLocation();
  return <p>Board: {location.state?.saved}</p>;
}

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/prospects" element={<Board />} />
        <Route path="/prospects/new" element={<ProspectFormPage />} />
        <Route path="/prospects/:id/edit" element={<ProspectFormPage />} />
        <Route path="/clients/:id" element={<p>Client page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const next = () => fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
});

/*
 * Adding and editing a prospect as a wizard, like adding a client (PROS-01–03):
 * contact, services, opportunity, review.
 */
describe("ProspectFormPage", () => {
  test("walks contact → services → opportunity → review, and adds the prospect with its services", async () => {
    api.createLead.mockResolvedValue({ id: 9 });
    api.updateProspect.mockResolvedValue({});
    at("/prospects/new");

    // A name is needed before moving on.
    next();
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Rao & Co" } });
    next();

    expect(await screen.findByText("STEP 02")).toBeInTheDocument();
    expect(screen.queryByText("Old service")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /GST Returns/ }));
    expect(screen.getByText("service selected")).toBeInTheDocument();
    next();

    fireEvent.change(screen.getByLabelText("Quoted fee"), { target: { value: "45000" } });
    next();

    expect(screen.getByText("STEP 04")).toBeInTheDocument();
    expect(screen.getByText("Quoted ₹45,000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    expect(await screen.findByText("Board: Prospect added.")).toBeInTheDocument();
    expect(api.createLead).toHaveBeenCalledWith({ name: "Rao & Co", email: "", phone: "", channel: "Referral", serviceIds: [1] });
    expect(api.updateProspect).toHaveBeenCalledWith(9, expect.objectContaining({ status: "New", quotedFee: 45000 }));
  });

  test("a save that fails after the lead was made returns to the field's step, and never adds a second", async () => {
    api.createLead.mockResolvedValue({ id: 9 });
    api.updateProspect.mockRejectedValueOnce(Object.assign(new Error("Check the highlighted fields"), { details: { quotedFee: "must be at least 0" } }));
    api.updateProspect.mockResolvedValueOnce({});
    api.updateLead.mockResolvedValue({});
    api.updateLeadServices.mockResolvedValue({});
    at("/prospects/new");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Rao & Co" } });
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    expect(await screen.findByText("must be at least 0")).toBeInTheDocument();
    expect(screen.getByText("STEP 03")).toBeInTheDocument();

    next();
    fireEvent.click(screen.getByRole("button", { name: "Add prospect" }));

    await screen.findByText("Board: Prospect added.");
    expect(api.createLead).toHaveBeenCalledTimes(1);
    expect(api.updateLead).toHaveBeenCalledWith(9, { name: "Rao & Co", email: "", phone: "" });
    expect(api.updateLeadServices).toHaveBeenCalledWith(9, []);
  });

  test("edits an existing prospect, its services included", async () => {
    api.getLead.mockResolvedValue({ id: 4, name: "Iyer & Sons", status: "In Discussion", quoted_fee: "25000", attributes: { constitution: "llp" }, services: [{ id: 2, name: "Income Tax Return" }] });
    api.updateLead.mockResolvedValue({});
    api.updateLeadServices.mockResolvedValue({});
    api.updateProspect.mockResolvedValue({});
    at("/prospects/4/edit");

    expect(await screen.findByDisplayValue("Iyer & Sons")).toBeInTheDocument();
    next();
    expect(screen.getByRole("button", { name: /Income Tax Return/ })).toHaveAttribute("aria-pressed", "true");
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Save prospect" }));

    await screen.findByText("Board: Prospect updated.");
    expect(api.updateLeadServices).toHaveBeenCalledWith(4, [2]);
    expect(api.updateProspect).toHaveBeenCalledWith(4, expect.objectContaining({ status: "In Discussion", quotedFee: 25000, attributes: { constitution: "llp" } }));
  });

  test("a converted prospect is not editable, and points to its client", async () => {
    api.getLead.mockResolvedValue({ id: 4, name: "Iyer & Sons", status: "Converted", converted_customer_id: 12 });
    at("/prospects/4/edit");

    expect(await screen.findByText("Iyer & Sons is already a client")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save prospect" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open client" })).toHaveAttribute("href", "/clients/12");
  });
});
