import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import UserMenu from "./UserMenu";

function renderMenu(onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <UserMenu
        displayName="Ada Lovelace"
        email="ada@acme.example"
        role="SUPER_ADMIN"
        initials="AL"
        onLogout={onLogout}
      />
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/settings/profile" element={<p>Profile page</p>} />
      </Routes>
    </MemoryRouter>,
  );

  return onLogout;
}

describe("UserMenu", () => {
  test("is closed until the avatar is clicked", async () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("ada@acme.example")).toBeInTheDocument();
  });

  test("My profile opens the profile page and closes the menu", async () => {
    renderMenu();

    await userEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /my profile/i }));

    expect(screen.getByText("Profile page")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("Escape closes it", async () => {
    renderMenu();

    await userEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("Sign out calls the logout handler", async () => {
    const onLogout = renderMenu();

    await userEvent.click(screen.getByRole("button", { name: /ada lovelace/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
