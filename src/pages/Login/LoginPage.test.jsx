import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import LoginPage from "./LoginPage";

const login = vi.fn();
const startSignIn = vi.fn();

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ login, isAuthenticated: false, loading: false }) }));
vi.mock("../../api/auth", () => ({ startSignIn: (...args) => startSignIn(...args) }));
vi.mock("../../api/identity", () => ({ redeemAccessInvite: vi.fn(), takePendingInvite: () => null }));

let address;

function Address() {
  const location = useLocation();
  address = `${location.pathname}${location.search}`;
  return null;
}

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<><LoginPage /><Address /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

function signIn() {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "asha@firm.example" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "a-long-password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

/*
 * Hydra's login_challenge never stays in the address bar: the page keeps it
 * and shows plain /login, and a reload still signs in with it.
 */
describe("LoginPage and Hydra's challenge", () => {
  test("takes the challenge out of the address and signs in with it", async () => {
    login.mockResolvedValue();
    renderAt("/login?login_challenge=abc123");

    await waitFor(() => expect(address).toBe("/login"));

    signIn();
    await waitFor(() => expect(login).toHaveBeenCalledWith("asha@firm.example", "a-long-password", "abc123"));
    expect(startSignIn).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("omnicore_login_challenge")).toBeNull();
  });

  test("a reload of plain /login still has the challenge; a wrong password keeps it", async () => {
    login.mockRejectedValue(Object.assign(new Error("Invalid email or password"), { status: 401 }));
    sessionStorage.setItem("omnicore_login_challenge", JSON.stringify({ value: "kept", at: Date.now() }));
    renderAt("/login");

    signIn();
    await waitFor(() => expect(login).toHaveBeenCalledWith("asha@firm.example", "a-long-password", "kept"));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(sessionStorage.getItem("omnicore_login_challenge")).not.toBeNull();
    expect(startSignIn).not.toHaveBeenCalled();
  });

  test("an old kept challenge is not used: the sign-in starts afresh", async () => {
    sessionStorage.setItem("omnicore_login_challenge", JSON.stringify({ value: "stale", at: Date.now() - 11 * 60 * 1000 }));
    renderAt("/login");

    await waitFor(() => expect(startSignIn).toHaveBeenCalled());
  });

  test("an error from the callback is shown, and leaves the address too", async () => {
    renderAt("/login?auth_error=The%20sign-in%20expired");

    expect(await screen.findByText("The sign-in expired")).toBeInTheDocument();
    await waitFor(() => expect(address).toBe("/login"));
    expect(startSignIn).not.toHaveBeenCalled();
  });
});
