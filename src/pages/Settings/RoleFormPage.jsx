import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createRole,
  getPermissions,
  getRole,
  updateRole,
  updateRolePermissions,
} from "../../api/identity";
import Breadcrumb from "../../components/ui/Breadcrumb";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

function RoleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [selected, setSelected] = useState(new Set());
  const [permissions, setPermissions] = useState([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const permissionData = await getPermissions();

      setPermissions(
        Array.isArray(permissionData) ? permissionData : (permissionData?.permissions ?? []),
      );

      if (isEditing) {
        const role = await getRole(id);

        setForm({
          name: role.name || "",
          code: role.code || "",
          description: role.description || "",
        });

        setSelected(new Set((role.permissions || []).map((p) => p.code)));

        // Built-in roles are shared by every organization, so the API rejects
        // edits. Show them read-only rather than letting the save fail.
        setReadOnly(Boolean(role.is_system_role) || role.organization_id === null);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load the role.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    load();
  }, [load]);



  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (isEditing) {
        await updateRole(id, { name: form.name, description: form.description });
        await updateRolePermissions(id, [...selected]);
      } else {
        await createRole({ ...form, permissionCodes: [...selected] });
      }

      navigate("/settings/users?tab=roles");
    } catch (requestError) {
      setError(requestError.message || "Failed to save the role.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page">
        <div className="settings-empty">Loading role...</div>
      </main>
    );
  }


  return (
    <main className="page settings-sub-page settings-form-page">
      <Breadcrumb onBack={() => navigate("/settings/users?tab=roles")} backLabel="Users & Roles" section="SETTINGS" title={isEditing ? form.name || "Role" : "New Role"} />

      <div className="page-header">
        <div>
          <h1>{isEditing ? form.name || "Role" : "New Role"}</h1>

          <p>
            {readOnly
              ? "This is a built-in role shared by every organization, so it cannot be changed. Create a custom role to define your own permissions."
              : "Choose what this role can do. Users assigned to it get exactly these permissions the next time they sign in."}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Role name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Regional Lead"
            disabled={saving || readOnly}
            autoFocus
            required
          />
        </label>

        <label>
          Code
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="REGIONAL_LEAD"
            disabled={saving || readOnly || isEditing}
            required
          />
        </label>

        <label className="settings-field-full">
          Description
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional note about who this role is for"
            disabled={saving || readOnly}
          />
        </label>

        <div className="settings-field-full">
          <div className="permission-header">
            <strong>Permissions</strong>

            <span>
              {selected.size} of {permissions.length} selected
            </span>
          </div>

          {/* Each permission is a row; checking it gives it to the role. The
              group (the code's prefix) is a filter, and Select all takes
              whatever the search and filters leave. */}
          <DataGrid
            embedded
            id="role-permissions"
            label="Permissions"
            rows={permissions}
            rowKey={(permission) => permission.code}
            pageSize={25}
            search={{ placeholder: "Search permissions", label: "Search permissions", text: (permission) => [permission.name, permission.code, permission.description].join(" ") }}
            selection={{ selected, onChange: setSelected, isDisabled: () => saving || readOnly }}
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
        </div>

        <div className="settings-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/settings/users?tab=roles")}
            disabled={saving}
          >
            {readOnly ? "Back" : "Cancel"}
          </button>

          {!readOnly && (
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Role"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

export default RoleFormPage;
