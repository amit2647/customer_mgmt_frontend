import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { changePassword, getProfile, updateProfile } from "../../api/profile";
import { useAuth } from "../../context/AuthContext";

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
 * The signed-in person's own details and password.
 *
 * Reached from the account menu in the header and from Settings. Everything
 * here acts on the caller only; the server takes the user from the token, so
 * this page has no id to get wrong.
 */
function ProfilePage() {
  const navigate = useNavigate();
  const { applyProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [details, setDetails] = useState({ name: "", email: "", currentPassword: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState(null);

  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    let current = true;

    getProfile()
      .then((data) => {
        if (!current) {
          return;
        }

        setProfile(data);
        setDetails({ name: data.name, email: data.email, currentPassword: "" });
      })
      .catch((error) => current && setLoadError(error.message || "Could not load your profile."))
      .finally(() => current && setLoading(false));

    return () => {
      current = false;
    };
  }, []);

  // The email is what the person signs in with, so changing it asks for the
  // password — the field only appears once the address has actually changed.
  const emailChanged =
    profile && details.email.trim().toLowerCase() !== profile.email.toLowerCase();

  const detailsDirty =
    profile && (details.name.trim() !== profile.name || emailChanged);

  async function handleDetails(event) {
    event.preventDefault();
    setDetailsMessage(null);

    if (!details.name.trim()) {
      setDetailsMessage({ type: "error", text: "Please enter your name." });
      return;
    }

    setSavingDetails(true);

    try {
      const updated = await updateProfile({
        name: details.name.trim(),
        email: emailChanged ? details.email.trim() : undefined,
        currentPassword: emailChanged ? details.currentPassword : undefined,
      });

      setProfile(updated);
      setDetails({ name: updated.name, email: updated.email, currentPassword: "" });

      // The header reads the name from here, so it updates without a new
      // sign-in even though the session token still carries the old one.
      applyProfile(updated);

      setDetailsMessage({
        type: "success",
        text: emailChanged
          ? `Saved. Sign in with ${updated.email} from now on.`
          : "Your details have been saved.",
      });
    } catch (error) {
      setDetailsMessage({ type: "error", text: error.message || "Could not save your details." });
    } finally {
      setSavingDetails(false);
    }
  }

  async function handlePassword(event) {
    event.preventDefault();
    setPasswordMessage(null);

    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage({
        type: "error",
        text: `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }

    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ type: "error", text: "The new passwords do not match." });
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });

      setPasswords(EMPTY_PASSWORDS);
      setPasswordMessage({
        type: "success",
        text: "Password changed. Use the new one next time you sign in.",
      });
    } catch (error) {
      setPasswordMessage({ type: "error", text: error.message || "Could not change your password." });
    } finally {
      setSavingPassword(false);
    }
  }

  function Message({ message }) {
    if (!message) {
      return null;
    }

    return (
      <div
        className={`alert ${message.type === "error" ? "alert-error" : "alert-success"} settings-field-full`}
        role={message.type === "error" ? "alert" : "status"}
      >
        {message.text}
      </div>
    );
  }

  return (
    <main className="page settings-sub-page settings-form-page profile-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>My Profile</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>My Profile</h1>

          <p>Your name, the email you sign in with, and your password.</p>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      )}

      {!loading && profile && (
        <>
          <section className="card profile-summary">
            <div className="profile-avatar" aria-hidden="true">
              {profile.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </div>

            <div className="profile-summary-copy">
              <strong>{profile.name}</strong>
              <span>{profile.email}</span>
            </div>

            <div className="profile-summary-facts">
              <div className="settings-readonly">
                <span>Role</span>
                <strong>{profile.role || (profile.isGuest ? "Guest" : "—")}</strong>
              </div>

              <div className="settings-readonly">
                <span>Organization</span>
                <strong>{profile.organization || "—"}</strong>
              </div>

              <div className="settings-readonly">
                <span>Member since</span>
                <strong>{formatDate(profile.createdAt)}</strong>
              </div>
            </div>
          </section>

          {profile.isGuest ? (
            <div className="alert">
              You are signed in with temporary guest access. Guest details
              cannot be changed.
            </div>
          ) : (
            <>
              <form className="settings-form-card" onSubmit={handleDetails}>
                <div className="profile-form-title settings-field-full">
                  <h2>Personal details</h2>
                  <p>Your role is set by an administrator and is not changed here.</p>
                </div>

                <Message message={detailsMessage} />

                <label>
                  Name
                  <input
                    value={details.name}
                    onChange={(event) => setDetails({ ...details, name: event.target.value })}
                    maxLength={150}
                    autoComplete="name"
                    disabled={savingDetails}
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={details.email}
                    onChange={(event) => setDetails({ ...details, email: event.target.value })}
                    maxLength={255}
                    autoComplete="email"
                    disabled={savingDetails}
                    required
                  />
                </label>

                {emailChanged && (
                  <label className="settings-field-full">
                    Current password
                    <input
                      type="password"
                      value={details.currentPassword}
                      onChange={(event) =>
                        setDetails({ ...details, currentPassword: event.target.value })
                      }
                      autoComplete="current-password"
                      disabled={savingDetails}
                      required
                    />
                    <span className="profile-field-hint">
                      Needed to change the email you sign in with.
                    </span>
                  </label>
                )}

                <div className="settings-form-actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingDetails || !detailsDirty}
                  >
                    {savingDetails ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              <form className="settings-form-card" onSubmit={handlePassword}>
                <div className="profile-form-title settings-field-full">
                  <h2>Password</h2>
                  <p>At least {MIN_PASSWORD_LENGTH} characters, and different from your current one.</p>
                </div>

                <Message message={passwordMessage} />

                <label className="settings-field-full">
                  Current password
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                    autoComplete="current-password"
                    disabled={savingPassword}
                    required
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
                    disabled={savingPassword}
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
                    disabled={savingPassword}
                    required
                  />
                </label>

                <div className="settings-form-actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default ProfilePage;
