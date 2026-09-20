import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  deleteRole,
  deleteUser,
  getOrganizationUsers,
  getRoles,
} from "../../api/identity";

const TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
];

function UsersRolesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // The tab lives in the URL so returning from a role form can restore it.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "roles" ? "roles" : "users";

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canCreateUser = permissions.includes("users.create");
  const canUpdateUser = permissions.includes("users.update");
  const canDeleteUser = permissions.includes("users.delete");
  // Every role write is gated on system.settings server-side.
  const canManageRoles = permissions.includes("system.settings");

  const organizationId = user?.organizationId;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [userData, roleData] = await Promise.all([
        organizationId ? getOrganizationUsers(organizationId) : [],
        getRoles().catch(() => []),
      ]);

      setUsers(Array.isArray(userData) ? userData : (userData?.users ?? []));
      setRoles(Array.isArray(roleData) ? roleData : (roleData?.roles ?? []));
    } catch (requestError) {
      setError(requestError.message || "Failed to load users and roles.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  function selectTab(next) {
    setSearchParams(next === "users" ? {} : { tab: next });
    setError("");
    setSuccess("");
  }

  async function handleDeleteUser(target) {
    if (target.id === user?.userId) {
      setError("You cannot remove your own account while signed in as it.");
      return;
    }

    if (!window.confirm(`Remove ${target.name} from this organization?`)) {
      return;
    }

    try {
      setError("");

      await deleteUser(target.id);

      setSuccess(`${target.name} removed.`);

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to remove the user.");
    }
  }

  async function handleDeleteRole(role) {
    if (!window.confirm(`Delete the role "${role.name}"?`)) {
      return;
    }

    try {
      setError("");

      await deleteRole(role.id);

      setSuccess(`Role "${role.name}" deleted.`);

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete the role.");
    }
  }

  return (
    <main className="page settings-sub-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Users &amp; Roles</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Users &amp; Roles</h1>

          <p>
            {tab === "users"
              ? "People with access to this organization. A user's role decides what they can see and do."
              : "Built-in roles are shared by every organization and cannot be changed. Create a custom role to define your own permissions."}
          </p>
        </div>

        <div className="page-header-actions">
          {tab === "users" && canCreateUser && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate("/settings/users/new")}
            >
              + New User
            </button>
          )}

          {tab === "roles" && canManageRoles && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate("/settings/roles/new")}
            >
              + New Role
            </button>
          )}
        </div>
      </div>

      <nav className="settings-tabs" aria-label="Users and roles">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`settings-tab${tab === item.id ? " active" : ""}`}
            onClick={() => selectTab(item.id)}
            aria-pressed={tab === item.id}
          >
            {item.label}

            <span>{item.id === "users" ? users.length : roles.length}</span>
          </button>
        ))}
      </nav>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading...</div>
        ) : tab === "users" ? (
          users.length === 0 ? (
            <div className="settings-empty">No users yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>

                      <span className="settings-row-hint">{item.email}</span>
                    </td>

                    <td>
                      <span className="settings-event">
                        {item.role_name || item.role_code || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`settings-pill${item.status === "Active" ? " on" : ""}`}
                      >
                        {item.status || "Active"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        {canUpdateUser && (
                          <button
                            className="link"
                            onClick={() => navigate(`/settings/users/${item.id}/edit`)}
                          >
                            Edit
                          </button>
                        )}

                        {canDeleteUser && item.id !== user?.userId && (
                          <button
                            className="link delete-link"
                            onClick={() => handleDeleteUser(item)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Type</th>
                <th>Permissions</th>
                <th>Users</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {roles.map((role) => {
                const builtIn = role.is_system_role || role.organization_id === null;

                return (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.name}</strong>

                      <span className="settings-row-hint">{role.code}</span>
                    </td>

                    <td>
                      <span className={`settings-pill${builtIn ? "" : " on"}`}>
                        {builtIn ? "Built-in" : "Custom"}
                      </span>
                    </td>

                    <td className="settings-cell-muted">{role.permission_count}</td>

                    <td className="settings-cell-muted">{role.user_count}</td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="link"
                          onClick={() => navigate(`/settings/roles/${role.id}/edit`)}
                        >
                          {builtIn || !canManageRoles ? "View" : "Edit"}
                        </button>

                        {canManageRoles && !builtIn && (
                          <button
                            className="link delete-link"
                            onClick={() => handleDeleteRole(role)}
                            // A role in use cannot be deleted; saying so here
                            // beats a 409 after the confirm dialog.
                            disabled={role.user_count > 0}
                            title={
                              role.user_count > 0
                                ? "Reassign its users before deleting"
                                : undefined
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default UsersRolesPage;
