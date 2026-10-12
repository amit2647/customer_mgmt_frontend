import DataGrid from "../ui/DataGrid";
import Pill from "../ui/Pill";

/*
 * Sign-in and account-security history (auth-hardening P6): Profile shows the
 * person's own, Users an admin's view of a member's. Newest first; the server
 * names each event.
 */

const WARNINGS = new Set(["login.failed", "login.locked", "login.blocked", "login.refused", "mfa.failed", "mfa.locked"]);

function when(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// "Firefox on Linux"-ish, enough to tell devices apart without a library.
function device(userAgent) {
  if (!userAgent) return "—";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : null;
  const system = /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Linux/.test(userAgent) ? "Linux" : null;
  return browser && system ? `${browser} on ${system}` : browser || system || "Other";
}

function ActivityList({ events, loading, label = "Sign-in activity" }) {
  return (
    <DataGrid
      embedded
      label={label}
      rows={events}
      loading={loading}
      rowKey={(event) => event.id}
      columns={[
        { key: "at", header: "When", value: (event) => event.at, render: (event) => when(event.at) },
        {
          key: "label",
          header: "What",
          value: (event) => event.label,
          render: (event) => <Pill dot tone={WARNINGS.has(event.event) ? "danger" : "success"}>{event.label}</Pill>,
        },
        { key: "ip", header: "From", value: (event) => event.ip || "", render: (event) => event.ip || "—" },
        { key: "device", header: "Device", value: (event) => device(event.userAgent), render: (event) => device(event.userAgent) },
      ]}
      empty="Nothing yet."
    />
  );
}

export default ActivityList;
