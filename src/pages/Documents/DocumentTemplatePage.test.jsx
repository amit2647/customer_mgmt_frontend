import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DocumentTemplatePage from "./DocumentTemplatePage";

const api = vi.hoisted(() => ({
  createDocumentTemplate: vi.fn(),
  getDocumentTemplate: vi.fn(),
  previewDocument: vi.fn(),
  removeDocumentTemplate: vi.fn(),
  restoreDocumentTemplate: vi.fn(),
  saveDocumentTemplate: vi.fn(),
}));

vi.mock("../../api/documents", () => api);
vi.mock("../../api/clients", () => ({ getClients: vi.fn().mockResolvedValue([{ id: 5, name: "Acme" }]) }));
vi.mock("../../api/services", () => ({ getServices: vi.fn().mockResolvedValue([{ id: 1, key: "statutory_audit", name: "Statutory Audit" }, { id: 2, key: null, name: "Old default" }]) }));

const TEMPLATE = {
  key: "consent_appointment",
  name: "Consent and eligibility certificate",
  version: 1,
  customized: false,
  updateAvailable: null,
  body: "<p>{{client.name}}</p>",
  fields: { type: "object", properties: { reference: { type: "string", title: "Reference number" } } },
  versions: [{ id: 1, version: 1, source: "bundle", source_version: "0.5.0", is_current: true, created_at: "2026-10-06T10:00:00Z" }],
};

const renderPage = (path = "/documents/templates/consent_appointment") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/documents" element={<p>Documents list</p>} />
        <Route path="/documents/templates/new" element={<DocumentTemplatePage />} />
        <Route path="/documents/templates/:key" element={<DocumentTemplatePage />} />
      </Routes>
    </MemoryRouter>,
  );

const FIRM_LETTER = {
  key: "firm_engagement_reminder",
  name: "Engagement reminder",
  version: 1,
  customized: true,
  firmMade: true,
  updateAvailable: null,
  body: "<p>{{client.name}} {{fields.reference_number}}</p>",
  fields: { type: "object", properties: { reference_number: { type: "string", title: "Reference number" } } },
  service: "statutory_audit",
  fieldList: [{ key: "reference_number", title: "Reference number", type: "text" }],
  versions: [{ id: 9, version: 1, source: "firm", is_current: true, created_at: "2026-10-13T10:00:00Z" }],
};

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getDocumentTemplate.mockResolvedValue(TEMPLATE);
});

/*
 * A firm's own text for a letter: saved as a new version once it passes the
 * same check as the bundle's, previewed before saving, restorable.
 */
describe("DocumentTemplatePage", () => {
  test("a load that answers late never overwrites text being typed (StrictMode loads twice)", async () => {
    let answerFirst;
    api.getDocumentTemplate.mockReset();
    api.getDocumentTemplate
      .mockImplementationOnce(() => new Promise((resolve) => { answerFirst = resolve; }))
      .mockResolvedValue(TEMPLATE);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/documents/templates/consent_appointment"]}>
          <Routes>
            <Route path="/documents/templates/:key" element={<DocumentTemplatePage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    const text = await screen.findByLabelText("Template text");
    fireEvent.change(text, { target: { value: "<p>Our own words</p>" } });

    // The first, cleaned-up load answers only now.
    await act(async () => answerFirst(TEMPLATE));

    expect(screen.getByLabelText("Template text")).toHaveValue("<p>Our own words</p>");
    expect(screen.getByRole("button", { name: "Save as firm's version" })).toBeEnabled();
  });

  test("saves edited text as the firm's version", async () => {
    api.saveDocumentTemplate.mockResolvedValue({ ...TEMPLATE, version: 2, customized: true, body: "<p>Dear {{client.name}}</p>" });
    renderPage();

    const text = await screen.findByLabelText("Template text");
    expect(screen.getByRole("button", { name: "Save as firm's version" })).toBeDisabled();

    fireEvent.change(text, { target: { value: "<p>Dear {{client.name}}</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as firm's version" }));

    expect(await screen.findByText("Saved as your firm's version.")).toBeInTheDocument();
    expect(api.saveDocumentTemplate).toHaveBeenCalledWith("consent_appointment", "<p>Dear {{client.name}}</p>");
    expect(screen.getByRole("button", { name: "Restore the bundle's text" })).toBeInTheDocument();
  });

  test("shows why text was refused", async () => {
    api.saveDocumentTemplate.mockRejectedValue(Object.assign(new Error("The template has problems"), { details: { body: "<script> is not allowed" } }));
    renderPage();

    fireEvent.change(await screen.findByLabelText("Template text"), { target: { value: "<script>x</script>" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as firm's version" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("<script> is not allowed");
  });

  test("previews the unsaved text with a chosen client", async () => {
    api.previewDocument.mockResolvedValue({ html: "<p>Acme</p>", missing: [] });
    renderPage();

    await screen.findByLabelText("Template text");
    fireEvent.change(await screen.findByLabelText("Preview with client"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByTitle(/preview/)).toBeInTheDocument();
    expect(api.previewDocument).toHaveBeenCalledWith({ templateKey: "consent_appointment", customerId: "5", body: "<p>{{client.name}}</p>" });
  });

  test("adds the firm's own letter with its name, service, fields and text", async () => {
    api.createDocumentTemplate.mockResolvedValue(FIRM_LETTER);
    api.getDocumentTemplate.mockResolvedValue(FIRM_LETTER);
    renderPage("/documents/templates/new");

    expect(screen.getByRole("heading", { name: "New letter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add letter" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Engagement reminder" } });
    await screen.findByRole("option", { name: "Statutory Audit engaged for the year" });
    expect(screen.queryByRole("option", { name: /Old default/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Offered when"), { target: { value: "statutory_audit" } });

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.change(screen.getByLabelText("Field 1 name"), { target: { value: "Reference number" } });
    expect(screen.getByText("{{fields.reference_number}}")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Template text"), { target: { value: "<p>{{client.name}} {{fields.reference_number}}</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Add letter" }));

    expect(await screen.findByText(/Letter added/)).toBeInTheDocument();
    expect(api.createDocumentTemplate).toHaveBeenCalledWith({
      name: "Engagement reminder",
      service: "statutory_audit",
      fields: [{ title: "Reference number", type: "text" }],
      body: "<p>{{client.name}} {{fields.reference_number}}</p>",
    });
    expect(await screen.findByRole("heading", { name: "Engagement reminder" })).toBeInTheDocument();
  });

  test("previews a new letter's unsaved fields without a template key", async () => {
    api.previewDocument.mockResolvedValue({ html: "<p>x</p>", missing: [] });
    renderPage("/documents/templates/new");

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await screen.findByTitle(/preview/);
    expect(api.previewDocument).toHaveBeenCalledWith(expect.objectContaining({ fields: [] }));
    expect(api.previewDocument.mock.calls[0][0]).not.toHaveProperty("templateKey");
  });

  test("a firm's own letter keeps its field keys when edited, and can be removed", async () => {
    api.getDocumentTemplate.mockResolvedValue(FIRM_LETTER);
    api.saveDocumentTemplate.mockResolvedValue(FIRM_LETTER);
    api.removeDocumentTemplate.mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage("/documents/templates/firm_engagement_reminder");

    fireEvent.change(await screen.findByLabelText("Field 1 name"), { target: { value: "Our reference" } });
    expect(screen.queryByRole("button", { name: "Restore the bundle's text" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Saved.");
    expect(api.saveDocumentTemplate).toHaveBeenCalledWith("firm_engagement_reminder", expect.objectContaining({
      fields: [{ key: "reference_number", title: "Our reference", type: "text" }],
    }));

    fireEvent.click(screen.getByRole("button", { name: "Remove letter" }));
    expect(await screen.findByText("Documents list")).toBeInTheDocument();
    expect(api.removeDocumentTemplate).toHaveBeenCalledWith("firm_engagement_reminder");
  });
});
