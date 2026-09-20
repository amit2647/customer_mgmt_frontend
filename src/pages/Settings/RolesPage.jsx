import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { deleteRole, getRoles } from "../../api/identity";

function RolesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  // Everything that changes a role is gated on system.settings server-side.
  const canManage = permissions.includes("system.settings");

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getRoles();

      setRoles(Array.isArray(data) ? data : (data?.roles ?? []));
    } catch (requestError) {
      setError(requestError.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(role) {
    if (!window.confirm(`Delete the role "${role.name}"?`)) {
      return;
    }

    try {
      setError("");

      await deleteRole(role.id);

      setSuccess(`Role "${role.name}" deleted.`);

      await load();
    } catch (requestError) {
      // 409 when users are still assigned, or when it is a built-in role.
      setError(requestError.message || "Failed to delete the role.");
    }
  }

  return (
    <main className="page settings-sub-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings/users")}>
          ← Back to Users &amp; Roles
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Roles</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Roles</h1>

          <p>
            Built-in roles are shared by every organization and cannot be
            changed. Create a custom role to define your own set of permissions.
          </p>
        </div>

        {canManage && (
          <div className="page-header-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate("/settings/roles/new")}
            >
              + New Role
            </button>
          </div>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading roles...</div>
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
                          {builtIn || !canManage ? "View" : "Edit"}
                        </button>

                        {canManage && !builtIn && (
                          <button
                            className="link delete-link"
                            onClick={() => handleDelete(role)}
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

export default RolesPage;
