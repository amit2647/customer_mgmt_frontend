import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import TwoFactorStep from "./TwoFactorStep";

const loginCode = vi.fn();

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ loginCode }) }));

const onDone = vi.fn();
const onRestart = vi.fn();

function renderStep(step) {
  return render(<TwoFactorStep step={step} loginChallenge="challenge-1" onDone={onDone} onRestart={onRestart} />);
}

function enter(code) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: code } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/*
 * The step after a right password (auth-hardening P5): a code, or setting up
 * an app when the organization requires it, then the recovery codes once.
 */
describe("TwoFactorStep", () => {
  test("sends the code with this sign-in's token and challenge", async () => {
    loginCode.mockResolvedValue(null);
    renderStep({ mfa: "verify", mfaToken: "step-token" });

    enter(" 123456 ");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await vi.waitFor(() => expect(loginCode).toHaveBeenCalledWith("step-token", "123456", "challenge-1"));
    expect(onDone).toHaveBeenCalled();
  });

  test("a wrong code says so and clears the field; a lockout offers to start again", async () => {
    loginCode.mockRejectedValueOnce(Object.assign(new Error("That code is not right."), { code: "mfa_invalid" }));
    renderStep({ mfa: "verify", mfaToken: "t" });

    enter("111111");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is not right.");
    expect(screen.getByRole("textbox")).toHaveValue("");

    loginCode.mockRejectedValueOnce(Object.assign(new Error("Too many wrong codes. Try again in 15 minutes."), { code: "mfa_locked" }));
    enter("222222");
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start again" }));
    expect(onRestart).toHaveBeenCalled();
  });

  test("setting up shows the QR code and key, then the recovery codes before going on", async () => {
    loginCode.mockResolvedValue({ redirect_to: "http://hydra/next", recoveryCodes: ["abcd-efgh", "jkmn-pqrs"] });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    renderStep({ mfa: "enrol", mfaToken: "t", qrDataUrl: "data:image/png;base64,AAAA", secret: "JBSWY3DPEHPK3PXP" });

    expect(screen.getByRole("img", { name: /QR code/ })).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();

    enter("123456");
    fireEvent.click(screen.getByRole("button", { name: "Turn on and sign in" }));

    expect(await screen.findByText("abcd-efgh")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /saved them/ }));
    expect(assign).toHaveBeenCalledWith("http://hydra/next");
    vi.unstubAllGlobals();
  });
});
