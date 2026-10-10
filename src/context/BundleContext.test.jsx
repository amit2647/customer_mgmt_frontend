import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { BundleProvider, useBundle } from "./BundleContext";

/*
 * The bundle lookup runs again whenever the signed-in user object changes —
 * twice at start-up under StrictMode. Answers can arrive out of order, and
 * only the newest lookup may settle the session.
 */

const lookups = [];
let currentUser = null;

vi.mock("../api/bundles", () => ({
  getInstalledBundle: () =>
    new Promise((resolve, reject) => {
      lookups.push({ resolve, reject });
    }),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: currentUser }),
}));

function Probe() {
  const { bundle, ready } = useBundle();
  return (
    <span data-testid="state">
      {ready ? "ready" : "waiting"}:{bundle ? bundle.key : "none"}
    </span>
  );
}

afterEach(() => {
  lookups.length = 0;
  currentUser = null;
});

describe("BundleProvider", () => {
  test("an older lookup answering last does not unsettle the session", async () => {
    currentUser = { id: 1 };
    const { rerender } = render(<BundleProvider><Probe /></BundleProvider>);

    // The same sign-in, as a new object: a second lookup starts.
    currentUser = { id: 1 };
    rerender(<BundleProvider><Probe /></BundleProvider>);
    expect(lookups).toHaveLength(2);

    await act(async () => lookups[1].resolve({ bundle: { key: "ca-practice" } }));
    expect(screen.getByTestId("state")).toHaveTextContent("ready:ca-practice");

    await act(async () => lookups[0].resolve({ bundle: null }));
    expect(screen.getByTestId("state")).toHaveTextContent("ready:ca-practice");
  });

  test("in order, the newest answer is the one kept", async () => {
    currentUser = { id: 1 };
    const { rerender } = render(<BundleProvider><Probe /></BundleProvider>);
    currentUser = { id: 1 };
    rerender(<BundleProvider><Probe /></BundleProvider>);

    await act(async () => lookups[0].resolve({ bundle: { key: "stale" } }));
    expect(screen.getByTestId("state")).toHaveTextContent("waiting:none");

    await act(async () => lookups[1].resolve({ bundle: null }));
    expect(screen.getByTestId("state")).toHaveTextContent("ready:none");
  });

  test("a failed lookup still settles as no bundle", async () => {
    currentUser = { id: 1 };
    render(<BundleProvider><Probe /></BundleProvider>);

    await act(async () => lookups[0].reject(new Error("gateway down")));
    expect(screen.getByTestId("state")).toHaveTextContent("ready:none");
  });

  test("signed out is settled at once, with no lookup", () => {
    render(<BundleProvider><Probe /></BundleProvider>);

    expect(lookups).toHaveLength(0);
    expect(screen.getByTestId("state")).toHaveTextContent("ready:none");
  });
});
