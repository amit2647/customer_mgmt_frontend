import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import ClientsImportPage from "./ClientsImportPage";

const api = vi.hoisted(() => ({ downloadImportTemplate: vi.fn(), importClients: vi.fn() }));
vi.mock("../../api/clients", () => api);
vi.mock("../../context/BundleContext", () => ({ useBundle: () => ({ term: (key, many) => (many ? "Clients" : "Client") }) }));

/*
 * Importing clients (DATA-04): the report says what was added, skipped and
 * refused, by line.
 */
describe("ClientsImportPage", () => {
  test("uploads the chosen file and reports each outcome by line", async () => {
    api.importClients.mockResolvedValue({
      added: 2,
      skipped: [{ line: 4, name: "Acme", reason: "PAN AAACA1234A belongs to Acme Pvt Ltd" }],
      errors: [{ line: 3, name: "Rao", error: "CIN is required" }],
    });
    render(<MemoryRouter><ClientsImportPage /></MemoryRouter>);

    const file = new File(["name\nAcme\n"], "clients.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    const report = await screen.findByRole("region", { name: "Import report" });
    expect(report).toHaveTextContent("2 added · 1 skipped · 1 refused");
    expect(report).toHaveTextContent("CIN is required");
    expect(report).toHaveTextContent("belongs to Acme Pvt Ltd");
    expect(api.importClients).toHaveBeenCalledWith("name\nAcme\n");
  });
});
