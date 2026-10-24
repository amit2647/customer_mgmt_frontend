import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";

import { disableTwoFactor, enableTwoFactor, getTwoFactor, newRecoveryCodes, startTwoFactorSetup } from "../../api/profile";
import { SettingRow } from "../../components/ui/SettingRow";
import RecoveryCodes from "../../components/auth/RecoveryCodes";
import { toast } from "../../components/ui/feedback";

/*
 * Profile → Two-factor sign-in (auth-hardening P5), one row with its editors
 * opening inside it, as every Profile row does:
 *
 *   off      "Set up": scan the QR code, confirm with a code → recovery codes
 *   on       "New recovery codes" and "Switch off", each needing a code
 *
 * Switching off is refused while the organization requires two-factor.
 */
function TwoFactorSetting() {
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);
  // A result ({ type, text }) shows as a toast.
  const report = (result) => toast[result.type === "error" ? "error" : "success"](result.text);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getTwoFactor());
    } catch (error) {
      report({ type: "error", text: error.message || "Could not load two-factor sign-in." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function close() {
    setMode(null);
    setSetup(null);
    setCode("");
  }

  async function open(next) {
    setCodes(null);
    setCode("");
    setMode(next);

    if (next === "setup") {
      setBusy(true);
      try {
        setSetup(await startTwoFactorSetup());
      } catch (error) {
        report({ type: "error", text: error.message || "Could not start setting up." });
        setMode(null);
      } finally {
        setBusy(false);
      }
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);

    try {
      if (mode === "setup") {
        const { recoveryCodes } = await enableTwoFactor(code.trim());
        setCodes(recoveryCodes);
        report({ type: "success", text: "Two-factor sign-in is on. Save these recovery codes now — they are shown only once." });
      } else if (mode === "codes") {
        const { recoveryCodes } = await newRecoveryCodes(code.trim());
        setCodes(recoveryCodes);
        report({ type: "success", text: "New recovery codes made; the old ones no longer work. Save these now." });
      } else if (mode === "off") {
        await disableTwoFactor(code.trim());
        report({ type: "success", text: "Two-factor sign-in is off." });
      }
      close();
      await load();
    } catch (error) {
      report({ type: "error", text: error.message || "That did not work." });
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <SettingRow icon={<ShieldCheck size={16} />} title="Two-factor sign-in" description="A code from your phone at every sign-in">
      </SettingRow>
    );
  }

  const description = status.enabled
    ? `On. ${status.recoveryCodesLeft} recovery code${status.recoveryCodesLeft === 1 ? "" : "s"} left.${status.required ? " Required by your organization." : ""}`
    : status.required
      ? "Required by your organization: you will be asked to set it up at your next sign-in."
      : "Off. Add a code from an authenticator app to every sign-in.";

  return (
    <SettingRow
      icon={<ShieldCheck size={16} />}
      title="Two-factor sign-in"
      description={description}
      action={
        !mode && (
          <div className="setting-row-buttons">
            {status.enabled ? (
              <>
                <button type="button" className="secondary-button" onClick={() => open("codes")}>
                  New recovery codes
                </button>
                {!status.required && (
                  <button type="button" className="secondary-button" onClick={() => open("off")}>
                    Switch off
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="secondary-button" onClick={() => open("setup")}>
                Set up
              </button>
            )}
          </div>
        )
      }
    >
      {mode && (
        <form className="setting-form" onSubmit={submit} aria-label="Two-factor sign-in">
          {mode === "setup" && setup && (
            <div className="mfa-setup setting-form-full">
              <img src={setup.qrDataUrl} alt="QR code to scan with an authenticator app" width="180" height="180" />
              <p>
                Scan this with an authenticator app, or enter this key: <code>{setup.secret}</code>
              </p>
            </div>
          )}

          <label>
            {mode === "setup" ? "Code from the app" : "A current code from your app"}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode={mode === "off" ? "text" : "numeric"}
              autoComplete="one-time-code"
              maxLength={20}
              disabled={busy}
              required
              autoFocus
            />
          </label>

          <div className="setting-form-actions setting-form-full">
            <button type="button" className="secondary-button" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy || !code.trim() || (mode === "setup" && !setup)}>
              {mode === "setup" ? "Turn on" : mode === "codes" ? "Make new codes" : "Switch off"}
            </button>
          </div>
        </form>
      )}
      {codes && <RecoveryCodes codes={codes} />}
    </SettingRow>
  );
}

export default TwoFactorSetting;
