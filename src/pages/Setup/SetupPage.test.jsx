import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SetupPage from "./SetupPage";

const api = vi.hoisted(() => ({ completeSetup: vi.fn() }));
const auth = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../../api/setup", () => api);
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));

const BUNDLE = { key: "ca-practice", name: "CA Practice", version: "0.7.2", description: "For a chartered accountancy firm.", contents: { services: 12, packages: 2, roles: ["Partner", "Audit Manager"], emails: 2 } };
const STATUS = { required: true, organization: { name: "My organization", timeZone: "Asia/Kolkata", currency: "INR" }, bundle: BUNDLE };

function renderSetup(onComplete = vi.fn(), status = STATUS) {
  render(
    <MemoryRouter initialEntries={["/setup"]}>
      <Routes>
        <Route path="/setup" element={<SetupPage status={status} onComplete={onComplete} />} />
        <Route path="/" element={<p>Signed in</p>} />
        <Route path="/settings/bundle" element={<p>Bundle settings</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onComplete;
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue →" }));
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillAll({ profession = true } = {}) {
  type("Organization name", "Mehta & Associates");
  next();
  if (profession) next();
  type("Your name", "R. Mehta");
  type("Email", "owner@mehta.example");
  type(/^Password/, "a-long-passphrase");
  type("Confirm password", "a-long-passphrase");
  next();
}

beforeEach(() => {
  api.completeSetup.mockReset();
  auth.login.mockReset();
});

/*
 * A new installation's first screen: organization, administrator, then the
 * one-time setup code from the server log.
 */
describe("SetupPage", () => {
  test("does not suggest the placeholder name, and needs a real one", () => {
    renderSetup();

    expect(screen.getByLabelText("Organization name")).toHaveValue("");
    next();
    expect(screen.getByText("Enter the organization's name")).toBeInTheDocument();
  });

  test("checks the administrator's password before going on", () => {
    renderSetup();
    type("Organization name", "Mehta & Associates");
    next();
    next();
    type("Your name", "R. Mehta");
    type("Email", "owner@mehta.example");
    type(/^Password/, "short");
    type("Confirm password", "different");
    next();

    expect(screen.getByText("Use at least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("The passwords do not match")).toBeInTheDocument();
  });

  test("shows the profession bundle it will install, without a choice", () => {
    renderSetup();
    type("Organization name", "Mehta & Associates");
    next();

    const step = screen.getByRole("region", { name: "Profession bundle" });
    expect(step).toHaveTextContent("CA Practice");
    expect(step).toHaveTextContent("12 services and 2 packages");
    expect(step).toHaveTextContent("Role templates: Partner, Audit Manager");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  test("without a setup bundle there is no Profession step", () => {
    renderSetup(vi.fn(), { ...STATUS, bundle: null });

    expect(screen.queryByRole("button", { name: /Profession/ })).not.toBeInTheDocument();
    type("Organization name", "Mehta & Associates");
    next();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });

  test("an install that stopped still completes setup, and opens the bundle page to resume", async () => {
    api.completeSetup.mockResolvedValue({ bundle: { key: "ca-practice", status: "failed", error: "the catalog service could not be reached" } });
    auth.login.mockResolvedValue({});
    renderSetup();

    fillAll();
    type(/^Setup code/, "k7qf-2m9d-xp4t-8hwn");
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByText("Bundle settings")).toBeInTheDocument();
  });

  test("finishes: sends the code and details, signs in, and leaves setup", async () => {
    api.completeSetup.mockResolvedValue({ bundle: { key: "ca-practice", status: "installed" } });
    auth.login.mockResolvedValue({});
    const onComplete = renderSetup();

    fillAll();
    expect(screen.getByText(/Mehta & Associates · Asia\/Kolkata · INR/)).toBeInTheDocument();
    expect(screen.getByText("Profession", { selector: "dt" })).toBeInTheDocument();
    type(/^Setup code/, "k7qf-2m9d-xp4t-8hwn");
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByText("Signed in")).toBeInTheDocument();
    expect(api.completeSetup).toHaveBeenCalledWith({
      code: "k7qf-2m9d-xp4t-8hwn",
      organization: { name: "Mehta & Associates", timeZone: "Asia/Kolkata", currency: "INR" },
      admin: { name: "R. Mehta", email: "owner@mehta.example", password: "a-long-passphrase" },
    });
    expect(auth.login).toHaveBeenCalledWith("owner@mehta.example", "a-long-passphrase");
    expect(onComplete).toHaveBeenCalled();
  });

  test("a wrong code is shown on the code field, and nothing signs in", async () => {
    api.completeSetup.mockRejectedValue(Object.assign(new Error("That setup code is not right."), { details: { code: "That setup code is not right" } }));
    renderSetup();

    fillAll();
    type(/^Setup code/, "AAAA-BBBB-CCCC-DDDD");
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That setup code is not right.");
    expect(screen.getByText("That setup code is not right")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });
});
