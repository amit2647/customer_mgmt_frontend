import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { createUser, getRoles, getUser, updateUser } from "../../api/identity";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  roleCode: "SALES_REP",
  status: "Active",
};

function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditing = Boolean(id);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  // Assigning a role is gated on system.settings server-side; mirroring it here
  // means the field is visibly locked rather than failing on save.
  const canAssignRole = permissions.includes("system.settings");

  // Changing your own role is refused by the API: demoting yourself removes the
  // permission needed to undo it.
  const isSelf = isEditing && Number(id) === Number(user?.userId);

  const roleLocked = isEditing && (!canAssignRole || isSelf);

  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const roleData = await getRoles().catch(() => []);

      setRoles(Array.isArray(roleData) ? roleData : (roleData?.roles ?? []));

      if (isEditing) {
        const data = await getUser(id);
        const record = data?.user || data;

        setForm({
          name: record.name || "",
          email: record.email || "",
          password: "",
          roleCode: record.role?.code || record.role_code || "",
          status: record.status || "Active",
        });
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load the user.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    load();
  }, [load]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (isEditing) {
        // Password is still not editable here. roleCode is omitted rather than
        // sent unchanged when the field is locked, so a no-op edit never trips
        // the server's role-change permission check.
        await updateUser(id, {
          name: form.name,
          email: form.email,
          status: form.status,
          ...(roleLocked ? {} : { roleCode: form.roleCode }),
        });
      } else {
        // organizationId is taken from the caller's token by identity-service,
        // never sent from here.
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          roleCode: form.roleCode,
          status: form.status,
        });
      }

      navigate("/settings/users");
    } catch (requestError) {
      setError(requestError.message || "Failed to save the user.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page">
        <div className="settings-empty">Loading user...</div>
      </main>
    );
  }

  return (
    <main className="page settings-sub-page settings-form-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings/users")}>
          ← Back to Users &amp; Roles
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>{isEditing ? "Edit User" : "New User"}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>{isEditing ? "Edit User" : "New User"}</h1>

          <p>
            {isEditing
              ? "Changing a role takes effect the next time this person signs in, because permissions are carried in their session. Passwords cannot be changed here."
              : "The user is added to your organization and can sign in immediately with the password you set."}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Full name
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Priya Sharma"
            disabled={saving}
            autoFocus
            required
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="priya@example.com"
            disabled={saving}
            required
          />
        </label>

        {!isEditing && (
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              disabled={saving}
              required
            />
          </label>
        )}

        <label>
          Role
          <select
            value={form.roleCode}
            onChange={(e) => update("roleCode", e.target.value)}
            disabled={saving || roleLocked}
            required
          >
            {!form.roleCode && <option value="">Select a role...</option>}

            {roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>

          {roleLocked && (
            <span className="settings-row-hint">
              {isSelf
                ? "You cannot change your own role."
                : "Only an administrator can change someone's role."}
            </span>
          )}
        </label>

        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            disabled={saving}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <div className="settings-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/settings/users")}
            disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default UserFormPage;
