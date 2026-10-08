import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProfilePage from "./ProfilePage";
import * as api from "../../api/profile";

const applyProfile = vi.fn();

vi.mock("../../api/profile", () => ({ getProfile: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ applyProfile }) }));

const PROFILE = { name: "Asha Rao", email: "asha@example.com", role: "Partner", organization: "Rao & Co", createdAt: "2026-01-05T00:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
  api.getProfile.mockResolvedValue(PROFILE);
});

/*
 * My Profile: one row per setting, the value on the right; a row's editor
 * and its result open inside that row.
 */
describe("ProfilePage", () => {
  test("shows each setting as a row with its value", async () => {
    render(<ProfilePage />);

    const rows = await screen.findByRole("region", { name: "My profile" });
    expect(within(rows).getByText("asha@example.com")).toBeInTheDocument();
    expect(within(rows).getByText("Partner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  test("edits the name in its row and confirms there", async () => {
    api.updateProfile.mockResolvedValue({ ...PROFILE, name: "Asha R. Rao" });
    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit name" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Asha R. Rao" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByText("Your name has been saved.")).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenCalledWith({ name: "Asha R. Rao", email: undefined, currentPassword: undefined });
    expect(applyProfile).toHaveBeenCalled();
  });

  test("a new email asks for the current password", async () => {
    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit email" }));
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@rao.example" } });
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });

  test("refuses mismatched new passwords inside the password row", async () => {
    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password-2" } });
    fireEvent.submit(screen.getByRole("form", { name: "Password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
    expect(api.changePassword).not.toHaveBeenCalled();
  });
});
