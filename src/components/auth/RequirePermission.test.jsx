import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import RequirePermission from "./RequirePermission";

let permissions = [];

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { permissions } }),
}));

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequirePermission permission="leads.read" />}>
          <Route path="/leads" element={<p>Leads screen</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/*
 * A screen someone lacks must say so, not mount and render an empty page.
 */
describe("RequirePermission", () => {
  test("renders the screen for someone with the permission", () => {
    permissions = ["leads.read"];
    renderAt("/leads");

    expect(screen.getByText("Leads screen")).toBeInTheDocument();
  });

  test("shows a denial, and not the screen, without it", () => {
    permissions = ["customers.read"];
    renderAt("/leads");

    expect(screen.queryByText("Leads screen")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /no access/i })).toBeInTheDocument();
    expect(screen.getByText("leads.read")).toBeInTheDocument();
  });
});
