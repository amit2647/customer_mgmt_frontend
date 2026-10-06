import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DocumentEditorPage from "./DocumentEditorPage";

const api = vi.hoisted(() => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  finalizeDocument: vi.fn(),
  getDocument: vi.fn(),
  previewDocument: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock("../../api/documents", () => api);
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { permissions: ["documents.read", "documents.generate"] } }) }));
vi.mock("../../context/BundleContext", () => ({ useBundle: () => ({ term: (key, many) => (many ? "Clients" : "Client") }) }));

const FIELDS = { type: "object", properties: { reference: { type: "string", title: "Reference number" } } };
const FIRM = { name: "Rao & Co", frn: "123456W", city: "Pune" };
const PARTNER = { name: "CA A. Rao", membership_no: "123456" };

function Where() {
  const location = useLocation();
  return <p>At {location.pathname}</p>;
}

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/clients/:clientId/documents/new" element={<DocumentEditorPage />} />
        <Route path="/documents/:id" element={<DocumentEditorPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
});

/*
 * One letter (DOC-10–14): the firm's fixed details, the fields, the letter;
 * new letters preview until saved, drafts save on apply, final ones are read-only.
 */
describe("DocumentEditorPage", () => {
  test("a new letter previews pre-filled, shows the firm, and saves as a draft", async () => {
    api.previewDocument.mockResolvedValue({ html: "<p>Letter</p>", missing: ["Reference number"], values: { reference: "" }, name: "Consent", badge: "ICAI", fields: FIELDS, ui: null, firm: FIRM, signatory: PARTNER });
    api.createDocument.mockResolvedValue({ id: 42 });
    api.getDocument.mockResolvedValue({ id: 42, customer_id: 5, period_label: "2026-27", status: "draft", templateName: "Consent", rendered_html: "<p>Letter</p>", missing: ["Reference number"], field_values: {}, fields: FIELDS, firm: FIRM, signatory: PARTNER });
    at("/clients/5/documents/new?template=consent_appointment&period=2026-27");

    expect(await screen.findByRole("region", { name: "Firm details" })).toHaveTextContent("123456W");
    expect(screen.getByText(/Still to fill: Reference number/)).toBeInTheDocument();
    expect(api.previewDocument).toHaveBeenCalledWith({ templateKey: "consent_appointment", customerId: "5", period: "2026-27", fieldValues: {} });

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    // The saved draft opens in its place.
    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
    expect(api.getDocument).toHaveBeenCalledWith("42");
    expect(api.createDocument).toHaveBeenCalledWith(expect.objectContaining({ templateKey: "consent_appointment", customerId: "5", period: "2026-27" }));
  });

  test("a draft with gaps cannot be finalized yet", async () => {
    api.getDocument.mockResolvedValue({ id: 42, customer_id: 5, period_label: "2026-27", status: "draft", templateName: "Consent", rendered_html: "<p>x</p>", missing: ["Reference number"], field_values: {}, fields: FIELDS, firm: FIRM, signatory: PARTNER });
    at("/documents/42");

    expect(await screen.findByRole("button", { name: "Finalize" })).toBeDisabled();
  });

  test("applying a draft's fields saves it", async () => {
    api.getDocument.mockResolvedValue({ id: 42, customer_id: 5, period_label: "2026-27", status: "draft", templateName: "Consent", rendered_html: "<p>x</p>", missing: [], field_values: { reference: "R/1" }, fields: FIELDS, firm: FIRM, signatory: PARTNER });
    api.updateDocument.mockResolvedValue({ id: 42, customer_id: 5, period_label: "2026-27", status: "draft", templateName: "Consent", rendered_html: "<p>y</p>", missing: [], field_values: { reference: "R/1" }, fields: FIELDS });
    at("/documents/42");

    fireEvent.click(await screen.findByRole("button", { name: "Apply changes" }));

    await waitFor(() => expect(api.updateDocument).toHaveBeenCalledWith("42", { reference: "R/1" }));
    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
  });

  test("a finalized letter is read-only and can be printed", async () => {
    api.getDocument.mockResolvedValue({ id: 42, customer_id: 5, period_label: "2026-27", status: "final", udin: "26123456AAAAAA1234", templateName: "Consent", rendered_html: "<p>x</p>", missing: [], field_values: {}, fields: FIELDS, firm: FIRM, signatory: PARTNER });
    at("/documents/42");

    expect(await screen.findByText(/UDIN 26123456AAAAAA1234/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalize" })).not.toBeInTheDocument();
  });
});
