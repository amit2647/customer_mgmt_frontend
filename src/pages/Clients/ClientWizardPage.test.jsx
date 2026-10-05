import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientWizardPage from "./ClientWizardPage";

const COMPANIES = { in: [{ var: "client.attributes.constitution" }, ["pvt_ltd", "public_ltd"]] };

const BUNDLE = {
  key: "ca-practice",
  name: "CA Practice",
  vocabulary: { client: { one: "Client", many: "Clients" } },
  profiles: {
    client: {
      version: 2,
      schema: {
        type: "object",
        properties: { constitution: { type: "string", title: "Constitution", enum: ["proprietorship", "pvt_ltd"] } },
        required: ["constitution"],
      },
      ui: { constitution: { "ui:enumNames": ["Proprietorship", "Private Limited"] } },
    },
  },
  identifiers: [
    { type: "pan", label: "PAN", pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$", unique: true },
    { type: "cin", label: "CIN", unique: true, shownWhen: COMPANIES, requiredWhen: COMPANIES },
  ],
  peopleRoles: [{ key: "director", label: "Director", labelWhen: [{ when: { "==": [{ var: "client.attributes.constitution" }, "proprietorship"] }, label: "Proprietor" }] }],
};

const api = vi.hoisted(() => ({
  checkIdentifier: vi.fn(),
  createClient: vi.fn(),
  getClient: vi.fn(),
  updateClient: vi.fn(),
  updateClientServices: vi.fn(),
}));

const engagements = vi.hoisted(() => ({
  createEngagement: vi.fn(),
  getEngagementTypes: vi.fn(),
  getPeriods: vi.fn(),
}));

let permissions = ["engagements.update", "fees.read", "fees.update"];

vi.mock("../../api/clients", () => api);
vi.mock("../../api/engagements", () => engagements);
vi.mock("../../api/services", () => ({
  getServices: vi.fn().mockResolvedValue([{ id: 2, name: "Statutory Audit", category: "Audit" }]),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({ bundle: BUNDLE, term: (key, many) => (many ? "Clients" : "Client") }),
}));

const renderWizard = () =>
  render(
    <MemoryRouter initialEntries={["/clients/new"]}>
      <Routes>
        <Route path="/clients/new" element={<ClientWizardPage />} />
        <Route path="/clients/:id" element={<p>Client saved</p>} />
      </Routes>
    </MemoryRouter>,
  );

// Chosen by its visible label, as a person would (rjsf keeps option indexes as values).
const LABELS = { proprietorship: "Proprietorship", pvt_ltd: "Private Limited" };

function setConstitution(value) {
  const select = screen.getByLabelText(/Constitution/);
  const option = [...select.options].find((item) => item.textContent === LABELS[value]);

  fireEvent.change(select, { target: { value: option.value } });
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  Object.values(engagements).forEach((mock) => mock.mockReset());
  api.checkIdentifier.mockResolvedValue({ available: true });
  engagements.getEngagementTypes.mockResolvedValue([]);
  permissions = ["engagements.update", "fees.read", "fees.update"];
  delete BUNDLE.engagementTypes;
});

/*
 * The wizard asks for the identifiers the bundle says a client takes, and
 * requires them, exactly as customer-service will (WIZ-02/03/11).
 */
describe("ClientWizardPage", () => {
  test("asks for a CIN only for a company, and requires it there", async () => {
    renderWizard();

    expect(screen.getByLabelText("PAN")).toBeInTheDocument();
    expect(screen.queryByLabelText(/CIN/)).not.toBeInTheDocument();

    setConstitution("pvt_ltd");

    expect(await screen.findByLabelText(/CIN/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Entity name"), { target: { value: "Acme Pvt Ltd" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByText("CIN is required")).toBeInTheDocument();
  });

  test("flags a PAN another client already holds as soon as it is typed", async () => {
    api.checkIdentifier.mockResolvedValue({ available: false, customer: { id: 9, name: "Rao Traders", archived: false } });
    renderWizard();

    const panInput = screen.getByLabelText("PAN");

    fireEvent.change(panInput, { target: { value: "aaaca1234a" } });
    expect(panInput.value).toBe("AAACA1234A");

    fireEvent.blur(panInput);

    expect(await screen.findByText("Already held by Rao Traders")).toBeInTheDocument();
    expect(api.checkIdentifier).toHaveBeenCalledWith("pan", "AAACA1234A", undefined);
  });

  test("saves the client with its profile in one request", async () => {
    api.createClient.mockResolvedValue({ id: 42 });
    renderWizard();

    fireEvent.change(screen.getByLabelText("Entity name"), { target: { value: "R. Sharma" } });
    setConstitution("proprietorship");
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "ABCPS1234K" } });

    for (let step = 1; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
      await screen.findByText(`STEP 0${step + 1}`);
    }

    fireEvent.click(screen.getByRole("button", { name: "Save Client" }));

    await waitFor(() => expect(api.createClient).toHaveBeenCalled());

    const sent = api.createClient.mock.calls[0][0];

    expect(sent.name).toBe("R. Sharma");
    expect(sent.profile.attributes).toEqual({ constitution: "proprietorship" });
    expect(sent.profile.identifiers).toEqual({ pan: "ABCPS1234K" });
    expect(await screen.findByText("Client saved")).toBeInTheDocument();
  });

  test("a server refusal sends the person back to the field", async () => {
    api.createClient.mockRejectedValue(Object.assign(new Error("PAN ABCPS1234K already belongs to Old Co"), { details: { "identifiers.pan": "Already in use" } }));
    renderWizard();

    fireEvent.change(screen.getByLabelText("Entity name"), { target: { value: "R. Sharma" } });
    setConstitution("proprietorship");
    fireEvent.change(screen.getByLabelText("PAN"), { target: { value: "ABCPS1234K" } });

    for (let step = 1; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
      await screen.findByText(`STEP 0${step + 1}`);
    }

    fireEvent.click(screen.getByRole("button", { name: "Save Client" }));

    expect(await screen.findByText("Already in use")).toBeInTheDocument();
    expect(screen.getByText("STEP 01")).toBeInTheDocument();
  });

  test("a new client's first engagement is saved with its year and fees (WIZ-08)", async () => {
    BUNDLE.engagementTypes = [{ key: "annual" }];
    engagements.getEngagementTypes.mockResolvedValue([{ key: "annual", name: "Annual engagement", period_kind: "financial_year", stages: [{ key: "appointed", label: "Appointed" }] }]);
    engagements.getPeriods.mockResolvedValue({ current: "2025-26", periods: [{ label: "2024-25" }, { label: "2025-26" }, { label: "2026-27" }] });
    engagements.createEngagement.mockResolvedValue({ id: 5 });
    api.createClient.mockResolvedValue({ id: 42 });
    renderWizard();

    fireEvent.change(screen.getByLabelText("Entity name"), { target: { value: "R. Sharma" } });
    setConstitution("proprietorship");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await screen.findByText("STEP 02");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await screen.findByText("STEP 03");

    fireEvent.click(await screen.findByRole("button", { name: /Statutory Audit/ }));
    expect(await screen.findByLabelText("Financial year")).toHaveValue("2025-26");
    fireEvent.change(screen.getByLabelText("Fee for Statutory Audit"), { target: { value: "50000" } });

    for (let step = 3; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
      await screen.findByText(`STEP 0${step + 1}`);
    }

    fireEvent.click(screen.getByRole("button", { name: "Save Client" }));

    await waitFor(() => expect(engagements.createEngagement).toHaveBeenCalled());
    expect(engagements.createEngagement.mock.calls[0][0]).toMatchObject({
      customerId: 42,
      typeKey: "annual",
      period: "2025-26",
      stage: "appointed",
      lines: [{ serviceId: 2, feeAmount: 50000, expensesAmount: 0 }],
    });
  });
});
