import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import AccessGrantsPage from "./AccessGrantsPage";

let bundle = null;

const TERMS = { client: ["Client", "Clients"], obligation: ["Deadline", "Deadlines"], document: ["Document", "Documents"], engagement: ["Engagement", "Engagements"] };

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { organizationId: 1, permissions: ["system.settings"] } }),
}));
vi.mock("../../context/BundleContext", () => ({
  useBundle: () => ({ bundle, term: (key, many) => TERMS[key][many ? 1 : 0] }),
}));
vi.mock("../../api/identity", () => ({
  getAccessGrants: vi.fn().mockResolvedValue({ grants: [] }),
  getOrganizationUsers: vi.fn().mockResolvedValue([]),
  getPermissions: vi.fn().mockResolvedValue([]),
  createAccessGrant: vi.fn(),
  revokeAccessGrant: vi.fn(),
}));

async function openForm() {
  render(<MemoryRouter><AccessGrantsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "+ Grant Access" }));
}

/*
 * The screens offered for a grant: today's list without a bundle; with one,
 * its names and the screens its capabilities add.
 */
describe("AccessGrantsPage screens", () => {
  test("are unchanged without a bundle", async () => {
    bundle = null;
    await openForm();

    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.queryByText("vault.read")).not.toBeInTheDocument();
    expect(screen.queryByText("obligations.read")).not.toBeInTheDocument();
  });

  test("follow the installed bundle", async () => {
    bundle = { key: "ca-practice", capabilities: ["engagements", "obligations", "documents", "vault"] };
    await openForm();

    expect(screen.getByText("Prospects")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();

    for (const code of ["obligations.read", "documents.read", "engagements.read", "fees.read", "profiles.read", "vault.read", "files.read"]) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }

    expect(screen.getByText("Deadlines")).toBeInTheDocument();
  });

  test("offer only the capabilities the bundle has", async () => {
    bundle = { key: "lite", capabilities: ["engagements"] };
    await openForm();

    expect(screen.getByText("engagements.read")).toBeInTheDocument();
    expect(screen.queryByText("vault.read")).not.toBeInTheDocument();
    expect(screen.queryByText("documents.read")).not.toBeInTheDocument();
  });
});
