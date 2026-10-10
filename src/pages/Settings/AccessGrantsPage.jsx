import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import {
  createAccessGrant,
  getAccessGrants,
  getOrganizationUsers,
  getPermissions,
  revokeAccessGrant,
} from "../../api/identity";
import DataGrid from "../../components/ui/DataGrid";
import { GridSkeleton } from "../../components/ui/Skeleton";
import Pill, { toneFor } from "../../components/ui/Pill";
import Modal from "../../components/ui/Modal";

/*
 * Screens people actually ask for, mapped to the permission that unlocks them.
 * Granting is framed as "which screen" rather than "which permission code",
 * because that is how the request arrives.
 */
const SCREENS = [
  { permission: "leads.read", group: "leads", label: "Leads", description: "Lead list and detail" },
  {
    permission: "customers.read",
    group: "customers",
    label: "Customers",
    description: "Customer list and detail",
  },
  { permission: "services.read", group: "services", label: "Services", description: "Service catalog" },
  { permission: "reports.read", group: "reports", label: "Dashboard", description: "Metrics and pipeline" },
  {
    permission: "communications.read",
    group: "communications",
    label: "Communication",
    description: "Email threads on a record",
  },
  { permission: "email.templates.read", group: "email", label: "Email settings", description: "Templates and automations" },
  { permission: "users.read", group: "users", label: "Users & Roles", description: "People and their roles" },
];

/*
 * The screens a profession bundle adds, each shown only when the installed
 * bundle has the capability behind it — the same gates as the sidebar and the
 * client's tabs. The ones marked `tab` exist only on a client's page, so
 * picking one also picks the clients screen (CLIENTS_SCREEN).
 */
const CLIENTS_SCREEN = "customers.read";

const BUNDLE_SCREENS = [
  { permission: "obligations.read", group: "obligations", needs: "obligations", label: (term) => term("obligation", true), description: (term) => `The ${term("obligation", true).toLowerCase()} list, and a ${term("client").toLowerCase()}'s Compliance tab` },
  { permission: "documents.read", group: "documents", needs: "documents", label: (term) => term("document", true), description: (term) => `Letters, and a ${term("client").toLowerCase()}'s Documents tab` },
  { permission: "engagements.read", tab: true, group: "engagements", needs: "engagements", label: (term) => term("engagement", true), description: (term) => `A ${term("client").toLowerCase()}'s Engagement tab` },
  { permission: "fees.read", tab: true, group: "fees", needs: "engagements", label: () => "Fees", description: (term) => `A ${term("client").toLowerCase()}'s Fees tab and fee amounts` },
  { permission: "profiles.read", tab: true, group: "profiles", label: () => "Bank accounts", description: (term) => `A ${term("client").toLowerCase()}'s Bank accounts tab` },
  { permission: "vault.read", tab: true, group: "vault", needs: "vault", label: () => "Credentials", description: (term) => `A ${term("client").toLowerCase()}'s portal logins (revealing a password is separate)` },
  { permission: "files.read", tab: true, group: "files", needs: "vault", label: () => "Files", description: (term) => `A ${term("client").toLowerCase()}'s Files tab` },
];

// Without a bundle this is exactly SCREENS; with one, Leads and Customers take
// the bundle's names and its screens follow them.
function screensFor(bundle, term) {
  if (!bundle) {
    return SCREENS;
  }

  const capabilities = bundle.capabilities || [];

  const renamed = SCREENS.map((screen) => {
    if (screen.permission === "leads.read") {
      return { ...screen, label: "Prospects", description: "Prospect board and list" };
    }

    if (screen.permission === "customers.read") {
      return { ...screen, label: term("client", true), description: `${term("client")} list and detail` };
    }

    return screen;
  });

  const added = BUNDLE_SCREENS.filter((screen) => !screen.needs || capabilities.includes(screen.needs)).map((screen) => ({
    permission: screen.permission,
    group: screen.group,
    tab: Boolean(screen.tab),
    label: screen.label(term),
    description: screen.description(term),
  }));

  const at = renamed.findIndex((screen) => screen.permission === "customers.read") + 1;

  return [...renamed.slice(0, at), ...added, ...renamed.slice(at)];
}

const DURATIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
  { minutes: 1440, label: "24 hours" },
];

const EMPTY = {
  user_id: "",
  subject_email: "",
  duration_minutes: 60,
  reason: "",
};

// Someone with an account is granted against their user id; someone without one
// gets an invite link instead, so the two paths need different inputs.
const RECIPIENTS = [
  {
    value: "member",
    label: "Someone in this workspace",
    hint: "Adds the permission to an account that already exists.",
  },
  {
    value: "external",
    label: "External person (no account)",
    hint: "Creates a one-off link that signs them in as a guest.",
  },
];


function formatWhen(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function remaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();

  if (ms <= 0) {
    return "expired";
  }

  const minutes = Math.round(ms / 60000);

  return minutes < 60 ? `${minutes}m left` : `${Math.round(minutes / 60)}h left`;
}

function AccessGrantsPage() {
  const { user } = useAuth();
  const { bundle, term } = useBundle();
  const screenOptions = screensFor(bundle, term);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes("system.settings");

  const [grants, setGrants] = useState([]);
  const [users, setUsers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [screens, setScreens] = useState(new Set());
  const [extraPermissions, setExtraPermissions] = useState(new Set());
  const [recipient, setRecipient] = useState("member");
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [grantData, userData, permissionData] = await Promise.all([
        getAccessGrants(),
        user?.organizationId
          ? getOrganizationUsers(user.organizationId).catch(() => [])
          : [],
        getPermissions().catch(() => []),
      ]);

      setGrants(grantData?.grants ?? []);
      setUsers(Array.isArray(userData) ? userData : (userData?.users ?? []));
      setAllPermissions(
        Array.isArray(permissionData) ? permissionData : (permissionData?.permissions ?? []),
      );
    } catch (requestError) {
      setError(requestError.message || "Failed to load access grants.");
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Deselecting a screen also drops any of its permissions that were ticked.
   * Otherwise they would stay selected while no longer visible, and get granted
   * without the person seeing them.
   */
  function chooseScreens(chosen) {
    const next = new Set(chosen);

    // A client tab is reached from a client, so it is no use without the
    // clients screen; ticking one ticks that too.
    if (screenOptions.some((screen) => screen.tab && next.has(screen.permission))) {
      next.add(CLIENTS_SCREEN);
    }

    const dropped = screenOptions.filter((screen) => screens.has(screen.permission) && !next.has(screen.permission)).map((screen) => screen.group);

    if (dropped.length > 0) {
      setExtraPermissions((codes) => new Set([...codes].filter((code) => !dropped.includes(code.split(".")[0]))));
    }

    setScreens(next);
  }

  // The clients screen stays ticked while a client tab needs it.
  const clientsLocked = screenOptions.some((screen) => screen.tab && screens.has(screen.permission));

  // A screen is just a permission, so the two selections merge into one deduped
  // list; picking Leads and leads.read separately grants it once.
  const selectedCodes = [...new Set([...screens, ...extraPermissions])];

  const selectedGroups = new Set(
    screenOptions.filter((screen) => screens.has(screen.permission)).map((s) => s.group),
  );

  const visibleCount = allPermissions.filter((permission) =>
    selectedGroups.has(permission.code.split(".")[0]),
  ).length;

  const visiblePermissions = allPermissions.filter((permission) =>
    selectedGroups.has(permission.code.split(".")[0]),
  );

  function resetForm() {
    setForm(EMPTY);
    setScreens(new Set());
    setExtraPermissions(new Set());
    setRecipient("member");
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the link is on screen to copy by hand.
      setCopied(false);
    }
  }

  async function handleGrant(event) {
    event.preventDefault();

    if (selectedCodes.length === 0) {
      setError("Select at least one screen or permission.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const external = recipient === "external";

      const result = await createAccessGrant({
        user_id: external ? null : Number(form.user_id),
        subject_email: external ? form.subject_email.trim() : null,
        duration_minutes: Number(form.duration_minutes),
        reason: form.reason,
        permission_codes: selectedCodes,
      });

      const email = form.subject_email.trim();

      resetForm();
      setShowForm(false);

      if (external && result?.inviteToken) {
        /*
         * Shown once and never again — the server keeps only a hash of it. If
         * this panel is dismissed before the link is sent, the grant has to be
         * revoked and reissued.
         */
        setCopied(false);
        setInvite({
          email,
          url: `${window.location.origin}/access/${result.inviteToken}`,
        });
        setSuccess("");
      } else {
        setSuccess(
          `Granted ${result?.count ?? selectedCodes.length} permission(s). Takes effect immediately.`,
        );
      }

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to grant access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(grant) {
    const who = grant.user_name || grant.subject_email;

    if (!window.confirm(`Revoke ${grant.permission_code} from ${who}?`)) {
      return;
    }

    try {
      setError("");

      await revokeAccessGrant(grant.id);

      setSuccess("Access revoked. It stopped working immediately.");

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke access.");
    }
  }

  const active = grants.filter((grant) => grant.is_active);
  const past = grants.filter((grant) => !grant.is_active);

  return (
    <div className="settings-panel settings-sub-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Just-in-time Access</h2>

          <p>
            Give someone one screen for a limited time. Grants are checked on
            every request, so they start and stop working immediately — no
            sign-out needed at either end.
          </p>
        </div>

        {canManage && (
          <div className="page-header-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setShowForm(true)}
            >
              + Grant Access
            </button>
          </div>
        )}
      </div>

      {invite && (
        <section className="card invite-card">
          <div className="settings-section-head">
            <strong>Access link for {invite.email}</strong>

            <span>shown once</span>
          </div>

          <p className="permission-hint">
            Send this to them yourself. It works until the grant expires or is
            revoked, and it cannot be shown again — closing this panel loses it.
          </p>

          <div className="invite-link-row">
            <code className="invite-link">{invite.url}</code>

            <button
              type="button"
              className="button button-primary"
              onClick={copyInviteLink}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <div className="settings-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setInvite(null)}
            >
              I have sent it
            </button>
          </div>
        </section>
      )}

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {showForm && (
        <Modal
          size="xl"
          title="Grant access"
          description="One screen or permission for a limited time. It starts and stops working at once — no sign-out needed."
          onClose={() => {
            resetForm();
            setShowForm(false);
          }}
          onSubmit={handleGrant}
          busy={saving}
          footer={
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button type="submit" className="primary" disabled={saving}>
                {saving
                  ? "Granting..."
                  : `Grant Access${selectedCodes.length ? ` (${selectedCodes.length})` : ""}`}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="settings-form-card grant-form">
          <label>
            Who is this for
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={saving}
            >
              {RECIPIENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="settings-row-hint">
              {RECIPIENTS.find((option) => option.value === recipient)?.hint}
            </span>
          </label>

          {recipient === "member" ? (
            <label>
              Person
              <select
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                disabled={saving}
                required
              >
                <option value="">Select a user...</option>

                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.role_name || item.role_code}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Email address
              <input
                type="email"
                value={form.subject_email}
                onChange={(e) =>
                  setForm({ ...form, subject_email: e.target.value })
                }
                placeholder="auditor@partner.com"
                disabled={saving}
                required
              />
              <span className="settings-row-hint">
                The link is shown here once — we do not email it for you.
              </span>
            </label>
          )}

          <div className="settings-field-full">
            <div className="permission-header">
              <strong>Which screens</strong>

              <span>{screens.size} selected</span>
            </div>

            <DataGrid
              embedded
              label="Screens"
              rows={screenOptions}
              rowKey={(screen) => screen.permission}
              selection={{
                selected: screens,
                onChange: chooseScreens,
                isDisabled: (screen) => saving || (clientsLocked && screen.permission === CLIENTS_SCREEN),
              }}
              columns={[
                {
                  key: "label",
                  header: "Screen",
                  render: (screen) => (
                    <>
                      <span className="grid-cell-title">{screen.label}</span>
                      <span className="grid-cell-sub">{screen.description}</span>
                    </>
                  ),
                },
                { key: "permission", header: "Grants", render: (screen) => <code>{screen.permission}</code> },
              ]}
            />
          </div>

          <div className="settings-field-full">
            <div className="permission-header">
              <strong>Additional permissions</strong>

              <span>
                {screens.size === 0
                  ? "select a screen first"
                  : `${extraPermissions.size} of ${visibleCount} selected`}
              </span>
            </div>

            <p className="permission-hint">
              A screen on its own grants view access. Add anything here that the
              person also needs to do — creating, editing or deleting.
            </p>

            {/* Scoped to the chosen screens: showing all 39 permissions here
                made the relevant handful hard to find. */}
            {screens.size === 0 ? (
              <div className="settings-empty grant-permission-empty">
                Choose one or more screens above to see the permissions they
                offer.
              </div>
            ) : (
              <DataGrid
                embedded
                label="Additional permissions"
                rows={visiblePermissions}
                rowKey={(permission) => permission.code}
                search={visiblePermissions.length > 10 ? { placeholder: "Search permissions", label: "Search permissions", text: (permission) => [permission.name, permission.code, permission.description].join(" ") } : undefined}
                selection={{ selected: extraPermissions, onChange: setExtraPermissions, isDisabled: () => saving }}
                columns={[
                  {
                    key: "name",
                    header: "Permission",
                    render: (permission) => (
                      <>
                        <span className="grid-cell-title">{permission.name}</span>
                        {permission.description && <span className="grid-cell-sub">{permission.description}</span>}
                      </>
                    ),
                  },
                  {
                    key: "group",
                    header: "Group",
                    value: (permission) => permission.code.split(".")[0],
                    filter: { label: (value) => value.replace(/_/g, " "), tone: toneFor },
                    render: (permission) => <Pill tone={toneFor(permission.code.split(".")[0])}>{permission.code.split(".")[0].replace(/_/g, " ")}</Pill>,
                  },
                  { key: "code", header: "Code", render: (permission) => <code>{permission.code}</code> },
                ]}
              />
            )}
          </div>

          <label>
            For how long
            <select
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              disabled={saving}
            >
              {DURATIONS.map((duration) => (
                <option key={duration.minutes} value={duration.minutes}>
                  {duration.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field-full">
            Reason
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Investigating ticket 4821"
              disabled={saving}
              required
            />
          </label>

          </div>
        </Modal>
      )}

      <section className="card">
        <div className="settings-section-head">
          <strong>Active</strong>
          {!loading && <span>{active.length}</span>}
        </div>

        {loading ? (
          <GridSkeleton embedded label="Active grants" columns={5} rows={3} />
        ) : (
          <DataGrid
            embedded
            label="Active grants"
            rows={active}
            search={active.length > 10 ? { placeholder: "Search grants", label: "Search grants", text: (grant) => [grant.user_name, grant.subject_email, grant.user_email, grant.permission_code, grant.reason].join(" ") } : undefined}
            initialSort={{ key: "expires_at", dir: "asc" }}
            columns={[
              {
                key: "who",
                header: "Who",
                value: (grant) => grant.user_name || grant.subject_email,
                render: (grant) => (
                  <>
                    <span className="grid-cell-title">{grant.user_name || grant.subject_email}</span>
                    <span className="grid-cell-sub">
                      {grant.is_invite
                        ? grant.redeemed_at
                          ? `Guest · opened ${formatWhen(grant.redeemed_at)}`
                          : "Guest · link not opened yet"
                        : grant.user_email}
                    </span>
                  </>
                ),
              },
              { key: "permission_code", header: "Access", filter: { tone: toneFor }, render: (grant) => <Pill tone={toneFor(grant.permission_code.split(".")[0])}>{grant.permission_code}</Pill> },
              { key: "reason", header: "Reason", sortable: false, render: (grant) => <span className="settings-cell-muted">{grant.reason}</span> },
              {
                key: "expires_at",
                header: "Expires",
                render: (grant) => (
                  <>
                    <Pill dot tone="success">{remaining(grant.expires_at)}</Pill>
                    <span className="grid-cell-sub">{formatWhen(grant.expires_at)}</span>
                  </>
                ),
              },
              {
                key: "actions",
                header: "",
                sortable: false,
                hideable: false,
                render: (grant) => (
                  <div className="table-actions">
                    {canManage && (
                      <button type="button" className="link delete-link" onClick={() => handleRevoke(grant)}>Revoke</button>
                    )}
                  </div>
                ),
              },
            ]}
            empty="No active grants."
          />
        )}
      </section>

      {past.length > 0 && (
        <section className="card settings-history">
          <div className="settings-section-head">
            <strong>History</strong>
            <span>{past.length}</span>
          </div>

          <DataGrid
            embedded
            label="Grant history"
            rows={past}
            initialSort={{ key: "ended", dir: "desc" }}
            columns={[
              { key: "who", header: "Who", value: (grant) => grant.user_name || grant.subject_email },
              { key: "permission_code", header: "Access", filter: { tone: toneFor }, render: (grant) => <Pill tone={toneFor(grant.permission_code.split(".")[0])}>{grant.permission_code}</Pill> },
              { key: "reason", header: "Reason", sortable: false, render: (grant) => <span className="settings-cell-muted">{grant.reason}</span> },
              {
                key: "ended",
                header: "Ended",
                value: (grant) => grant.revoked_at || grant.expires_at,
                render: (grant) => (
                  <>
                    <Pill dot tone={grant.revoked_at ? "danger" : "neutral"}>{grant.revoked_at ? "Revoked" : "Expired"}</Pill>
                    <span className="grid-cell-sub">{formatWhen(grant.revoked_at || grant.expires_at)}</span>
                  </>
                ),
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}

export default AccessGrantsPage;
