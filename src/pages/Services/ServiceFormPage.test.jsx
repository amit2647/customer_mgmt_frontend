import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ServiceFormPage from "./ServiceFormPage";

const api = vi.hoisted(() => ({ createService: vi.fn(), getService: vi.fn(), getServices: vi.fn(), updateService: vi.fn() }));

vi.mock("../../api/services", () => api);
vi.mock("../../context/BundleContext", () => ({ useBundle: () => ({ bundle: { serviceGroups: ["Audit", "GST", "Payroll"] } }) }));

function Landed() {
  const location = useLocation();
  return <p>Landed on {location.pathname}: {location.state?.saved}</p>;
}

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/services" element={<Landed />} />
        <Route path="/services/new" element={<ServiceFormPage />} />
        <Route path="/services/:id" element={<Landed />} />
        <Route path="/services/:id/edit" element={<ServiceFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getServices.mockResolvedValue([{ id: 1, category: "GST" }, { id: 2, category: "Advisory" }, { id: 3, category: null }]);
});

/*
 * Adding and editing a service is a wizard on its own page: the name is
 * required before moving on, the review shows what will be saved, and saving
 * goes back to where the page was opened from with a notice.
 */
describe("ServiceFormPage", () => {
  test("adds a service in one step plus a review, and goes back to the list", async () => {
    api.createService.mockResolvedValue({ id: 12 });
    renderAt("/services/new");

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Service name is required")).toBeInTheDocument();

    // The error sits inside the field's label.
    fireEvent.change(screen.getByLabelText(/^Service name/), { target: { value: "  Payroll " } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Payroll" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Monthly payroll" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByText("Monthly payroll")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    expect(await screen.findByText(/Landed on \/services: Service added/)).toBeInTheDocument();
    expect(api.createService).toHaveBeenCalledWith({ name: "Payroll", category: "Payroll", status: "Active", description: "Monthly payroll" });
  });

  test("offers the bundle's groups first, then the firm's own categories, and a new one", async () => {
    api.createService.mockResolvedValue({ id: 13 });
    renderAt("/services/new");

    await screen.findByRole("option", { name: "Advisory" });
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options.slice(0, 5)).toEqual(["No category", "Audit", "GST", "Payroll", "Advisory"]);

    fireEvent.change(screen.getByLabelText(/^Service name/), { target: { value: "Valuation" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "__new__" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Name the new category, or pick one from the list")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^New category/), { target: { value: "Valuations" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    expect(await screen.findByText(/Service added/)).toBeInTheDocument();
    expect(api.createService).toHaveBeenCalledWith(expect.objectContaining({ category: "Valuations" }));
  });

  test("edits a service opened from its own page, and goes back there", async () => {
    api.getService.mockResolvedValue({ id: 7, key: "gst_returns", name: "GST Returns", category: "GST", status: "Active", description: "" });
    api.updateService.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={[{ pathname: "/services/7/edit", state: { from: "/services/7" } }]}>
        <Routes>
          <Route path="/services/:id" element={<Landed />} />
          <Route path="/services/:id/edit" element={<ServiceFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("Service name"), { target: { value: "GST Filing" } });
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(screen.getByText("Reference: gst_returns")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save service" }));

    expect(await screen.findByText("Landed on /services/7: Service saved.")).toBeInTheDocument();
    expect(api.updateService).toHaveBeenCalledWith(7, { name: "GST Filing", category: "GST", status: "Active", description: "" });
  });

  test("shows why a save was refused, and stays on the page", async () => {
    api.createService.mockRejectedValue(new Error("A service with this name already exists"));
    renderAt("/services/new");

    fireEvent.change(screen.getByLabelText("Service name"), { target: { value: "GST Returns" } });
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A service with this name already exists");
  });
});
