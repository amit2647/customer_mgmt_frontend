import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { deleteUser, getOrganizationUsers, getRoles } from "../../api/identity";

function UsersRolesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canCreate = permissions.includes("users.create");
  const canUpdate = permissions.includes("users.update");
  const canDelete = permissions.includes("users.delete");

  const organizationId = user?.organizationId;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [userData, roleData] = await Promise.all([
        getOrganizationUsers(organizationId),
        getRoles().catch(() => []),
      ]);

      setUsers(Array.isArray(userData) ? userData : (userData?.users ?? []));
      setRoles(Array.isArray(roleData) ? roleData : (roleData?.roles ?? []));
    } catch (requestError) {
      setError(requestError.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(target) {
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
            People with access to this organization. A user's role decides what
            they can see and do — permissions are fixed per role and are read
            only.
          </p>
        </div>

        {canCreate && (
          <div className="page-header-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigate("/settings/users/new")}
            >
              + New User
            </button>
          </div>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading users...</div>
        ) : users.length === 0 ? (
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
                      {canUpdate && (
                        <button
                          className="link"
                          onClick={() => navigate(`/settings/users/${item.id}/edit`)}
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && item.id !== user?.userId && (
                        <button
                          className="link delete-link"
                          onClick={() => handleDelete(item)}
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
        )}
      </section>

      {roles.length > 0 && (
        <section className="settings-roles">
          <div className="settings-roles-head">
            <div>
              <h2>Roles</h2>

              <p>
                {roles.length} roles available. Built-in roles are shared by
                every organization; custom ones are yours to define.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/settings/roles")}
            >
              Manage roles
            </button>
          </div>

          <div className="settings-role-grid">
            {roles.map((role) => (
              <div key={role.id} className="settings-role-card">
                <strong>{role.name}</strong>

                <code>{role.code}</code>

                {role.description && <p>{role.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}

export default UsersRolesPage;
