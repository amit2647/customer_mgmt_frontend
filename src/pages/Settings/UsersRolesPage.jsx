import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  deleteRole,
  deleteUser,
  getOrganizationUsers,
  getRoles,
} from "../../api/identity";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

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
    <div className="settings-panel settings-sub-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Users &amp; Roles</h2>

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

            {!loading && <span>{item.id === "users" ? users.length : roles.length}</span>}
          </button>
        ))}
      </nav>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {tab === "users" ? (
        <DataGrid
          id="users"
          label="Users"
          rows={users}
          loading={loading}
          search={{ placeholder: "Search users", label: "Search users", text: (item) => [item.name, item.email].join(" ") }}
          columns={[
            {
              key: "name",
              header: "User",
              render: (item) => (
                <>
                  <span className="grid-cell-title">{item.name}</span>
                  <span className="grid-cell-sub">{item.email}</span>
                </>
              ),
            },
            {
              key: "role",
              header: "Role",
              value: (item) => item.role_name || item.role_code || "",
              filter: { tone: toneFor },
              render: (item) => <Pill tone={toneFor(item.role_name || item.role_code)}>{item.role_name || item.role_code || "—"}</Pill>,
            },
            {
              key: "status",
              header: "Status",
              value: (item) => item.status || "Active",
              filter: { tone: (value) => (value === "Active" ? "success" : "neutral") },
              render: (item) => <Pill dot tone={(item.status || "Active") === "Active" ? "success" : "neutral"}>{item.status || "Active"}</Pill>,
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (item) => (
                <div className="table-actions">
                  {canUpdateUser && (
                    <button type="button" className="link" onClick={() => navigate(`/settings/users/${item.id}/edit`)}>
                      Edit
                    </button>
                  )}
                  {canDeleteUser && item.id !== user?.userId && (
                    <button type="button" className="link delete-link" onClick={() => handleDeleteUser(item)}>
                      Remove
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          empty="No users yet."
        />
      ) : (
        <DataGrid
          id="roles"
          label="Roles"
          rows={roles}
          loading={loading}
          search={{ placeholder: "Search roles", label: "Search roles", text: (role) => [role.name, role.code].join(" ") }}
          columns={[
            {
              key: "name",
              header: "Role",
              render: (role) => (
                <>
                  <span className="grid-cell-title">{role.name}</span>
                  <span className="grid-cell-sub">{role.code}</span>
                </>
              ),
            },
            {
              key: "type",
              header: "Type",
              value: (role) => (role.is_system_role || role.organization_id === null ? "Built-in" : "Custom"),
              filter: { tone: (value) => (value === "Custom" ? "violet" : "neutral") },
              render: (role) => {
                const builtIn = role.is_system_role || role.organization_id === null;
                return <Pill tone={builtIn ? "neutral" : "violet"}>{builtIn ? "Built-in" : "Custom"}</Pill>;
              },
            },
            { key: "permission_count", header: "Permissions", align: "right", value: (role) => Number(role.permission_count || 0) },
            { key: "user_count", header: "Users", align: "right", value: (role) => Number(role.user_count || 0) },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (role) => {
                const builtIn = role.is_system_role || role.organization_id === null;
                return (
                  <div className="table-actions">
                    <button type="button" className="link" onClick={() => navigate(`/settings/roles/${role.id}/edit`)}>
                      {builtIn || !canManageRoles ? "View" : "Edit"}
                    </button>
                    {canManageRoles && !builtIn && (
                      <button
                        type="button"
                        className="link delete-link"
                        onClick={() => handleDeleteRole(role)}
                        // A role in use cannot be deleted; saying so here
                        // beats a 409 after the confirm dialog.
                        disabled={role.user_count > 0}
                        title={role.user_count > 0 ? "Reassign its users before deleting" : undefined}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          empty="No roles yet."
        />
      )}
    </div>
  );
}

export default UsersRolesPage;
