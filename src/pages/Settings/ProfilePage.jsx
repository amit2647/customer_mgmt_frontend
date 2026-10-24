import { useEffect, useState } from "react";
import { Buildings, CalendarBlank, EnvelopeSimple, IdentificationBadge, Key, PencilSimple, SignOut, User } from "@phosphor-icons/react";

import { changePassword, getProfile, updateProfile } from "../../api/profile";
import { useAuth } from "../../context/AuthContext";
import { SettingNotice, SettingRow, SettingRows } from "../../components/ui/SettingRow";
import { SettingRowsSkeleton } from "../../components/ui/Skeleton";
import TwoFactorSetting from "./TwoFactorSetting";
import SignInActivity from "./SignInActivity";
import { PASSWORD_MIN_LENGTH } from "../../config";
import { formatDate as formatDateValue } from "../../utils/dates";
import { confirmAction, toast } from "../../components/ui/feedback";

const MIN_PASSWORD_LENGTH = PASSWORD_MIN_LENGTH;

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return formatDateValue(value);
}

/*
 * The signed-in person's own details and password, one row each.
 *
 * Reached from the account menu in the header and from Settings. Everything
 * here acts on the caller only; the server takes the user from the token, so
 * this page has no id to get wrong. A row opens its own editor in place.
 */
function ProfilePage() {
  const { applyProfile, signOutEverywhere } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Which row is open: "name", "email", "password" or null.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: "", email: "", currentPassword: "" });
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);
  // A result ({ type, text }) shows as a toast.
  const report = (result) => toast[result.type === "error" ? "error" : "success"](result.text);

  useEffect(() => {
    let current = true;

    getProfile()
      .then((data) => current && setProfile(data))
      .catch((error) => current && setLoadError(error.message || "Could not load your profile."))
      .finally(() => current && setLoading(false));

    return () => {
      current = false;
    };
  }, []);

  function open(row) {
    setEditing(row);
    setDraft({ name: profile.name, email: profile.email, currentPassword: "" });
    setPasswords(EMPTY_PASSWORDS);
  }

  function close() {
    setEditing(null);
  }

  // The email is what the person signs in with, so changing it asks for the
  // password — the field only appears once the address has actually changed.
  const emailChanged = profile && draft.email.trim().toLowerCase() !== profile.email.toLowerCase();

  async function saveDetails(event, row) {
    event.preventDefault();

    if (row === "name" && !draft.name.trim()) {
      report({ row, type: "error", text: "Please enter your name." });
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProfile({
        name: row === "name" ? draft.name.trim() : profile.name,
        email: row === "email" && emailChanged ? draft.email.trim() : undefined,
        currentPassword: row === "email" && emailChanged ? draft.currentPassword : undefined,
      });

      setProfile(updated);

      // The header reads the name from here, so it updates without a new
      // sign-in even though the session token still carries the old one.
      applyProfile(updated);

      setEditing(null);

      // A new address takes effect only once its link is opened (P4).
      const verification = updated.verification;
      report(
        row === "email" && verification && !verification.sent
          ? { row, type: "error", text: `${verification.reason || "The confirmation email could not be sent"}. Your email address has not changed.` }
          : {
              row,
              type: "success",
              text:
                row === "email"
                  ? `We sent a link to ${updated.pendingEmail || draft.email.trim()}. Your email changes when you open it; until then you sign in with ${updated.email}.`
                  : "Your name has been saved.",
            },
      );
    } catch (error) {
      report({ row, type: "error", text: error.message || "Could not save your details." });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      report({ row: "password", type: "error", text: `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    if (passwords.next !== passwords.confirm) {
      report({ row: "password", type: "error", text: "The new passwords do not match." });
      return;
    }

    setSaving(true);

    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });

      setEditing(null);
      setPasswords(EMPTY_PASSWORDS);
      report({ row: "password", type: "success", text: "Password changed. Use the new one next time you sign in." });
    } catch (error) {
      report({ row: "password", type: "error", text: error.message || "Could not change your password." });
    } finally {
      setSaving(false);
    }
  }

  const editable = profile && !profile.isGuest;

  function editButton(row, label) {
    if (!editable || editing === row) {
      return null;
    }

    return (
      <button type="button" className="setting-edit" onClick={() => open(row)} aria-label={label}>
        <PencilSimple size={16} />
      </button>
    );
  }


  // Ends every session, this one included, so it ends on the sign-in page.
  async function endAllSessions() {
    if (!(await confirmAction({ title: "Sign out on every device?", message: "This one included: you will be back on the sign-in page.", confirmLabel: "Sign out everywhere", danger: true }))) {
      return;
    }

    setSaving(true);

    try {
      await signOutEverywhere();
    } catch (error) {
      report({ row: "sessions", type: "error", text: error.message || "Could not sign you out everywhere. Please try again." });
      setSaving(false);
    }
  }

  function formActions(label) {
    return (
      <div className="setting-form-actions">
        <button type="button" className="secondary-button" onClick={close} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Saving..." : label}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-panel settings-sub-page profile-page">
      <div className="page-header settings-panel-header">
        <div>
          <h2>My Profile</h2>
          <p>Your name, the email you sign in with, and your password.</p>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      )}

      {loading && <SettingRowsSkeleton label="My profile" rows={4} />}

      {!loading && profile && (
        <SettingRows label="My profile">
          {profile.isGuest && (
            <div className="setting-row">
              <SettingNotice title="Guest access">
                You are signed in with temporary guest access. Guest details cannot be changed.
              </SettingNotice>
            </div>
          )}

          <SettingRow
            icon={<User size={16} />}
            title="Name"
            description="Your full name, as your team sees it"
            action={
              <>
                {editing !== "name" && <span className="setting-value">{profile.name}</span>}
                {editButton("name", "Edit name")}
              </>
            }
          >
            {editing === "name" && (
              <form className="setting-form" onSubmit={(event) => saveDetails(event, "name")}>
                <label>
                  Name
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    maxLength={150}
                    autoComplete="name"
                    disabled={saving}
                    required
                    autoFocus
                  />
                </label>
                {formActions("Save name")}
              </form>
            )}
          </SettingRow>

          <SettingRow
            icon={<EnvelopeSimple size={16} />}
            title="Email"
            description={
              profile.pendingEmail
                ? `The address you sign in with. Waiting for you to confirm ${profile.pendingEmail}: open the link we sent there.`
                : "The address you sign in with"
            }
            action={
              <>
                {editing !== "email" && <span className="setting-value">{profile.email}</span>}
                {editButton("email", "Edit email")}
              </>
            }
          >
            {editing === "email" && (
              <form className="setting-form" onSubmit={(event) => saveDetails(event, "email")}>
                <label>
                  Email
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                    maxLength={255}
                    autoComplete="email"
                    disabled={saving}
                    required
                    autoFocus
                  />
                </label>

                {emailChanged && (
                  <>
                  <label>
                    Current password
                    <input
                      type="password"
                      value={draft.currentPassword}
                      onChange={(event) => setDraft({ ...draft, currentPassword: event.target.value })}
                      autoComplete="current-password"
                      disabled={saving}
                      required
                    />
                  </label>
                  <span className="profile-field-hint">Needed to change the email you sign in with.</span>
                  </>
                )}

                {formActions("Save email")}
              </form>
            )}
          </SettingRow>

          {editable && (
            <SettingRow
              icon={<Key size={16} />}
              title="Password"
              description={`At least ${MIN_PASSWORD_LENGTH} characters, and different from your current one`}
              action={
                <>
                  {editing !== "password" && <span className="setting-value setting-secret">••••••••••••</span>}
                  {editButton("password", "Change password")}
                </>
              }
            >
              {editing === "password" && (
                <form className="setting-form setting-form-grid" onSubmit={savePassword} aria-label="Password">
                  <label className="setting-form-full">
                    Current password
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                      autoComplete="current-password"
                      disabled={saving}
                      required
                      autoFocus
                    />
                  </label>

                  <label>
                    New password
                    <input
                      type="password"
                      value={passwords.next}
                      onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      disabled={saving}
                      required
                    />
                  </label>

                  <label>
                    Confirm new password
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                      autoComplete="new-password"
                      disabled={saving}
                      required
                    />
                  </label>

                  <div className="setting-form-full"></div>
                  <div className="setting-form-full">{formActions("Change password")}</div>
                </form>
              )}
            </SettingRow>
          )}

          {/* Guests sign in with their invite, not a password: no second step. */}
          {editable && <TwoFactorSetting />}

          {editable && <SignInActivity />}

          <SettingRow
            icon={<IdentificationBadge size={16} />}
            title="Role"
            description="Set by an administrator; it decides what you can see and do"
            action={<span className="setting-value">{profile.role || (profile.isGuest ? "Guest" : "—")}</span>}
          />

          <SettingRow
            icon={<Buildings size={16} />}
            title="Organization"
            description="The workspace you are signed in to"
            action={<span className="setting-value">{profile.organization || "—"}</span>}
          />

          <SettingRow
            icon={<CalendarBlank size={16} />}
            title="Member since"
            description="When your account was created"
            action={<span className="setting-value">{formatDate(profile.createdAt)}</span>}
          />

          <SettingRow
            icon={<SignOut size={16} />}
            title="Sessions"
            description="Signed in on another computer or phone you no longer use? End every session at once."
            action={
              <button type="button" className="secondary-button" onClick={endAllSessions} disabled={saving}>
                Sign out everywhere
              </button>
            }
          >
          </SettingRow>
        </SettingRows>
      )}
    </div>
  );
}

export default ProfilePage;
