import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientCredentials from "./ClientCredentials";

const api = vi.hoisted(() => ({ getCredentials: vi.fn(), getReveals: vi.fn(), removeCredential: vi.fn(), revealCredential: vi.fn(), saveCredential: vi.fn() }));
vi.mock("../../api/vault", () => api);

const GST = { key: "gst", name: "GST portal", url: "https://www.gst.gov.in", suggested: true, fields: [{ key: "username", label: "Username", secret: false }, { key: "password", label: "Password", secret: true }] };
const saved = (extra = {}) => ({
  vaultReady: true,
  consent: { category: "consent_poa_signed", onFile: true },
  portals: [{ ...GST, credential: { id: 1, publicFields: { username: "acme_gst" }, hasSecret: true, updatedAt: "2026-10-06T10:00:00Z" } }],
  ...extra,
});

const everything = () => true;

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getReveals.mockResolvedValue([]);
});

/*
 * A client's portal credentials (CD-10): passwords stay masked until revealed
 * with a reason; nothing is saved before the signed consent is on file.
 */
describe("ClientCredentials", () => {
  test("without the signed consent, saving is not offered", async () => {
    api.getCredentials.mockResolvedValue({ vaultReady: true, consent: { category: "consent_poa_signed", onFile: false }, portals: [{ ...GST, credential: null }] });
    const onOpenFiles = vi.fn();
    render(<ClientCredentials client={{ id: 5 }} can={everything} onOpenFiles={onOpenFiles} />);

    expect(await screen.findByText(/Upload the client's signed consent/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add GST portal credentials" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Go to Files" }));
    expect(onOpenFiles).toHaveBeenCalled();
  });

  test("a stored password is masked; revealing it asks for a reason and shows it", async () => {
    api.getCredentials.mockResolvedValue(saved());
    api.revealCredential.mockResolvedValue({ portal: "gst", secrets: { password: "Gst@2026!" } });
    render(<ClientCredentials client={{ id: 5 }} can={everything} />);

    expect(await screen.findByText("acme_gst")).toBeInTheDocument();
    expect(screen.getByText("••••••••")).toBeInTheDocument();
    expect(screen.queryByText("Gst@2026!")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reveal GST portal password" }));
    fireEvent.change(screen.getByLabelText(/Why do you need it/), { target: { value: "Filing GSTR-3B for August" } });
    fireEvent.click(screen.getByRole("button", { name: "Reveal for 30 seconds" }));

    expect(await screen.findByText("Gst@2026!")).toBeInTheDocument();
    expect(api.revealCredential).toHaveBeenCalledWith(5, "gst", "Filing GSTR-3B for August");
  });

  test("someone without vault.reveal never sees the Reveal button", async () => {
    api.getCredentials.mockResolvedValue(saved());
    render(<ClientCredentials client={{ id: 5 }} can={(permission) => permission !== "vault.reveal"} />);

    await screen.findByText("acme_gst");
    expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();
  });

  test("editing keeps the password when it is left blank", async () => {
    api.getCredentials.mockResolvedValue(saved());
    api.saveCredential.mockResolvedValue(saved());
    render(<ClientCredentials client={{ id: 5 }} can={everything} />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit GST portal credentials" }));
    expect(screen.getByPlaceholderText("Leave blank to keep")).toHaveAttribute("type", "password");

    fireEvent.change(screen.getByDisplayValue("acme_gst"), { target: { value: "acme_gst_2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.saveCredential).toHaveBeenCalledWith(5, "gst", { username: "acme_gst_2" }));
  });
});
