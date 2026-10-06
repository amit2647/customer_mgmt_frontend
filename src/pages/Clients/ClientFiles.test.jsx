import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ClientFiles from "./ClientFiles";

const api = vi.hoisted(() => ({ deleteFile: vi.fn(), downloadFile: vi.fn(), getFiles: vi.fn(), uploadFile: vi.fn() }));
vi.mock("../../api/vault", () => api);

const everything = () => true;
const POA = { id: 3, file_name: "POA signed.pdf", category: "consent_poa_signed", size_bytes: 20480, sha256: "a".repeat(64), created_at: "2026-10-06T10:00:00Z", uploaded_by_name: "Test Admin" };

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
});

/*
 * A client's files (CD-13): upload with a category, the signed consent first,
 * and files that always download.
 */
describe("ClientFiles", () => {
  test("a new client starts with the signed consent as the category, and uploads it", async () => {
    api.getFiles.mockResolvedValueOnce({ consent: { category: "consent_poa_signed", onFile: false }, files: [] });
    api.getFiles.mockResolvedValue({ consent: { category: "consent_poa_signed", onFile: true }, files: [POA] });
    api.uploadFile.mockResolvedValue({});
    render(<ClientFiles client={{ id: 5 }} can={everything} />);

    expect(await screen.findByText(/No signed consent and power of attorney yet/)).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveValue("consent_poa_signed");

    const file = new File(["%PDF"], "POA signed.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Choose files"), { target: { files: [file] } });

    await waitFor(() => expect(api.uploadFile).toHaveBeenCalledWith(5, file, "consent_poa_signed"));
    expect(await screen.findByText("The signed consent and power of attorney is on file.")).toBeInTheDocument();
  });

  test("a file over 25 MB is refused before it is sent", async () => {
    api.getFiles.mockResolvedValue({ consent: { category: "consent_poa_signed", onFile: true }, files: [] });
    render(<ClientFiles client={{ id: 5 }} can={everything} />);

    const big = new File(["x"], "scan.pdf");
    Object.defineProperty(big, "size", { value: 26 * 1024 * 1024 });
    fireEvent.change(await screen.findByLabelText("Choose files"), { target: { files: [big] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("larger than 25 MB");
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  test("files are listed and download", async () => {
    api.getFiles.mockResolvedValue({ consent: { category: "consent_poa_signed", onFile: true }, files: [POA] });
    render(<ClientFiles client={{ id: 5 }} can={everything} />);

    fireEvent.click(await screen.findByRole("button", { name: "Download POA signed.pdf" }));

    expect(api.downloadFile).toHaveBeenCalledWith(POA);
    expect(screen.getByText("20.0 KB")).toBeInTheDocument();
  });
});
