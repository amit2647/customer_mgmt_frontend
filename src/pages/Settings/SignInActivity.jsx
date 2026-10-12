import { useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";

import { getActivity } from "../../api/profile";
import { SettingNotice, SettingRow } from "../../components/ui/SettingRow";
import ActivityList from "../../components/auth/ActivityList";

/*
 * Profile → Sign-in activity (auth-hardening P6): the person's own recent
 * sign-ins, wrong passwords and security changes, loaded when opened.
 */
function SignInActivity() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError("");

    try {
      setEvents((await getActivity()).events || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load your sign-in activity.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingRow
      icon={<ClockCounterClockwise size={16} />}
      title="Sign-in activity"
      description="Recent sign-ins, wrong passwords and changes to your account's security. Something you don't recognise? Change your password and sign out everywhere."
      action={
        <button type="button" className="secondary-button" onClick={toggle}>
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      {open && error && <SettingNotice tone="danger">{error}</SettingNotice>}
      {open && !error && <ActivityList events={events} loading={loading} />}
    </SettingRow>
  );
}

export default SignInActivity;
