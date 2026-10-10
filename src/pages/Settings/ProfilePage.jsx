import { useEffect, useState } from "react";
import { Buildings, CalendarBlank, EnvelopeSimple, IdentificationBadge, Key, PencilSimple, User } from "@phosphor-icons/react";

import { changePassword, getProfile, updateProfile } from "../../api/profile";
import { useAuth } from "../../context/AuthContext";
import { SettingNotice, SettingRow, SettingRows } from "../../components/ui/SettingRow";
import { SettingRowsSkeleton } from "../../components/ui/Skeleton";

const MIN_PASSWORD_LENGTH = 8;

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/*
 * The signed-in person's own details and password, one row each.
 *
 * Reached from the account menu in the header and from Settings. Everything
 * here acts on the caller only; the server takes the user from the token, so
 * this page has no id to get wrong. A row opens its own editor in place.
 */
function ProfilePage() {
  const { applyProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Which row is open: "name", "email", "password" or null.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: "", email: "", currentPassword: "" });
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);

  // A message belongs to the row it is about: { row, type, text }.
  const [message, setMessage] = useState(null);

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
    setMessage(null);
    setEditing(row);
    setDraft({ name: profile.name, email: profile.email, currentPassword: "" });
    setPasswords(EMPTY_PASSWORDS);
  }

  function close() {
    setEditing(null);
    setMessage(null);
  }

  // The email is what the person signs in with, so changing it asks for the
  // password — the field only appears once the address has actually changed.
  const emailChanged = profile && draft.email.trim().toLowerCase() !== profile.email.toLowerCase();

  async function saveDetails(event, row) {
    event.preventDefault();

    if (row === "name" && !draft.name.trim()) {
      setMessage({ row, type: "error", text: "Please enter your name." });
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
      setMessage({
        row,
        type: "success",
        text: row === "email" ? `Saved. Sign in with ${updated.email} from now on.` : "Your name has been saved.",
      });
    } catch (error) {
      setMessage({ row, type: "error", text: error.message || "Could not save your details." });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      setMessage({ row: "password", type: "error", text: `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    if (passwords.next !== passwords.confirm) {
      setMessage({ row: "password", type: "error", text: "The new passwords do not match." });
      return;
    }

    setSaving(true);

    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });

      setEditing(null);
      setPasswords(EMPTY_PASSWORDS);
      setMessage({ row: "password", type: "success", text: "Password changed. Use the new one next time you sign in." });
    } catch (error) {
      setMessage({ row: "password", type: "error", text: error.message || "Could not change your password." });
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

  function rowMessage(row) {
    if (message?.row !== row) {
      return null;
    }

    return (
      <SettingNotice tone={message.type === "error" ? "danger" : "success"}>
        {message.text}
      </SettingNotice>
    );
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
                {rowMessage("name")}
                {formActions("Save name")}
              </form>
            )}
            {editing !== "name" && rowMessage("name")}
          </SettingRow>

          <SettingRow
            icon={<EnvelopeSimple size={16} />}
            title="Email"
            description="The address you sign in with"
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

                {rowMessage("email")}
                {formActions("Save email")}
              </form>
            )}
            {editing !== "email" && rowMessage("email")}
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

                  <div className="setting-form-full">{rowMessage("password")}</div>
                  <div className="setting-form-full">{formActions("Change password")}</div>
                </form>
              )}
              {editing !== "password" && rowMessage("password")}
            </SettingRow>
          )}

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
        </SettingRows>
      )}
    </div>
  );
}

export default ProfilePage;
