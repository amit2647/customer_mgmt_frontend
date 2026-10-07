import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DocumentTemplatePage from "./DocumentTemplatePage";

const api = vi.hoisted(() => ({ getDocumentTemplate: vi.fn(), previewDocument: vi.fn(), restoreDocumentTemplate: vi.fn(), saveDocumentTemplate: vi.fn() }));

vi.mock("../../api/documents", () => api);
vi.mock("../../api/clients", () => ({ getClients: vi.fn().mockResolvedValue([{ id: 5, name: "Acme" }]) }));

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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/settings/documents/consent_appointment"]}>
      <Routes>
        <Route path="/settings/documents/:key" element={<DocumentTemplatePage />} />
      </Routes>
    </MemoryRouter>,
  );

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
        <MemoryRouter initialEntries={["/settings/documents/consent_appointment"]}>
          <Routes>
            <Route path="/settings/documents/:key" element={<DocumentTemplatePage />} />
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
});
