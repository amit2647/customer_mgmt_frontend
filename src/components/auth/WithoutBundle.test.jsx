import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import WithoutBundle from "./WithoutBundle";

let state;

function Where() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

vi.mock("../../context/BundleContext", () => ({ useBundle: () => state }));

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<WithoutBundle redirectTo="/prospects" />}>
          <Route path="/leads" element={<p>Leads screen</p>} />
        </Route>
        <Route path="/prospects" element={<p>Prospect board</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("WithoutBundle", () => {
  test("renders the core screen for an organization without a bundle", () => {
    state = { bundle: null, ready: true };
    at("/leads");
    expect(screen.getByText("Leads screen")).toBeInTheDocument();
  });

  test("sends a bundle organization to the bundle's screen", () => {
    state = { bundle: { key: "ca-practice" }, ready: true };
    at("/leads");
    expect(screen.getByText("Prospect board")).toBeInTheDocument();
    expect(screen.queryByText("Leads screen")).not.toBeInTheDocument();
  });

  test("keeps a record's place when the redirect is a function of the path", () => {
    state = { bundle: { key: "ca-practice" }, ready: true };
    render(
      <MemoryRouter initialEntries={["/customers/12/edit?step=2"]}>
        <Routes>
          <Route element={<WithoutBundle redirectTo={(path) => path.replace(/^\/customers/, "/clients")} />}>
            <Route path="/customers/:id/edit" element={<p>Customer form</p>} />
          </Route>
          <Route path="/clients/:id/edit" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("/clients/12/edit?step=2")).toBeInTheDocument();
  });

  test("shows nothing until the bundle is known", () => {
    state = { bundle: null, ready: false };
    at("/leads");
    expect(screen.queryByText("Leads screen")).not.toBeInTheDocument();
    expect(screen.queryByText("Prospect board")).not.toBeInTheDocument();
  });
});
