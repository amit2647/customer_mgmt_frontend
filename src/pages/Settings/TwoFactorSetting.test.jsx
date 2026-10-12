import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import TwoFactorSetting from "./TwoFactorSetting";
import * as api from "../../api/profile";

vi.mock("../../api/profile", () => ({
  getTwoFactor: vi.fn(),
  startTwoFactorSetup: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  newRecoveryCodes: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/*
 * Profile → Two-factor sign-in (auth-hardening P5).
 */
describe("TwoFactorSetting", () => {
  test("sets up: scan, confirm with a code, then the recovery codes", async () => {
    api.getTwoFactor.mockResolvedValueOnce({ enabled: false, required: false, recoveryCodesLeft: 0 });
    api.startTwoFactorSetup.mockResolvedValue({ qrDataUrl: "data:image/png;base64,AAAA", secret: "JBSWY3DPEHPK3PXP" });
    api.enableTwoFactor.mockResolvedValue({ recoveryCodes: ["abcd-efgh"] });
    api.getTwoFactor.mockResolvedValueOnce({ enabled: true, required: false, recoveryCodesLeft: 10 });
    render(<TwoFactorSetting />);

    fireEvent.click(await screen.findByRole("button", { name: "Set up" }));
    expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    expect(await screen.findByText("abcd-efgh")).toBeInTheDocument();
    expect(api.enableTwoFactor).toHaveBeenCalledWith("123456");
    expect(await screen.findByText(/On\. 10 recovery codes left/)).toBeInTheDocument();
  });

  test("when the organization requires it, there is no way to switch it off", async () => {
    api.getTwoFactor.mockResolvedValue({ enabled: true, required: true, recoveryCodesLeft: 4 });
    render(<TwoFactorSetting />);

    expect(await screen.findByRole("button", { name: "New recovery codes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch off" })).not.toBeInTheDocument();
    expect(screen.getByText(/Required by your organization/)).toBeInTheDocument();
  });
});
