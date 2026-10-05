import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProfessional, getFirm, getProfessionals, removeProfessional, updateFirm, updateProfessional } from "../../api/firm";
import SchemaForm from "../../components/bundle/SchemaForm";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";

/*
 * Settings → Firm (SET-01–03): the firm's details and the bundle's firm
 * fields (a CA's FRN), and the professionals who sign on its behalf. These
 * feed every document the firm generates.
 */

const TIME_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];
const PERSON = { name: "", designation: "", attributes: {}, isDefaultSignatory: false };

function FirmPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canUpdate = permissions.includes("organization.update");

  const [firm, setFirm] = useState(null);
  const [people, setPeople] = useState([]);
  const [person, setPerson] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const firmFields = useRef(null);

  const load = useCallback(async () => {
    try {
      const [loaded, partners] = await Promise.all([getFirm(), getProfessionals()]);
      setFirm(loaded);
      setPeople(partners);
    } catch (requestError) {
      setError(requestError.message || "Could not load the firm.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveFirm(event) {
    event.preventDefault();

    if (firmFields.current && !firmFields.current.validate()) return;

    try {
      setSaving(true);
      setError("");
      setErrors({});
      setFirm(await updateFirm(firm));
      setNotice("Firm saved.");
    } catch (requestError) {
      setError(requestError.message || "The firm could not be saved.");
      setErrors(requestError.details || {});
    } finally {
      setSaving(false);
    }
  }

  async function savePerson(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (person.id) await updateProfessional(person.id, person);
      else await createProfessional(person);

      setPerson(null);
      setNotice("Signing partner saved.");
      setPeople(await getProfessionals());
    } catch (requestError) {
      setError(requestError.message || "The signing partner could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label>
      {label}
      <input value={firm?.[key] || ""} onChange={(e) => setFirm({ ...firm, [key]: e.target.value })} disabled={!canUpdate || saving} {...props} />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </label>
  );

  return (
    <main className="page settings-sub-page settings-form-page firm-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>← Back to Settings</button>
        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Firm</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Firm</h1>
          <p>Your firm's details and signing partners. Generated documents take them from here.</p>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!firm ? (
        <section className="card"><div className="settings-empty">Loading firm…</div></section>
      ) : (
        <form className="settings-form-card" onSubmit={saveFirm} aria-label="Firm details">
          <div className="workflow-form-grid">
            {field("name", "Display name", { required: true })}
            {field("legalName", "Legal name")}
            {field("address", "Address")}
            {field("city", "City of signing")}
            {field("email", "Email", { type: "email" })}
            {field("phone", "Phone")}
            <label>
              Time zone
              <select value={firm.timeZone} onChange={(e) => setFirm({ ...firm, timeZone: e.target.value })} disabled={!canUpdate || saving}>
                {[...new Set([firm.timeZone, ...TIME_ZONES])].map((zone) => <option key={zone}>{zone}</option>)}
              </select>
            </label>
            {field("currency", "Currency", { maxLength: 3 })}
          </div>

          <SchemaForm
            ref={firmFields}
            schema={bundle?.profiles?.organization?.schema}
            uiSchema={bundle?.profiles?.organization?.ui}
            formData={firm.attributes}
            onChange={(attributes) => setFirm({ ...firm, attributes })}
            errors={Object.fromEntries(Object.entries(errors).filter(([key]) => !(key in firm)))}
            disabled={!canUpdate || saving}
            idPrefix="firm"
          />

          {canUpdate && (
            <div className="bundle-actions">
              <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Save firm"}</button>
            </div>
          )}
        </form>
      )}

      <section className="card firm-partners" aria-label="Signing partners">
        <div className="bundle-summary">
          <h2>Signing partners</h2>
          {canUpdate && !person && <button type="button" className="secondary-button" onClick={() => setPerson(PERSON)}>+ Add partner</button>}
        </div>

        {people.length === 0 && !person && <div className="settings-empty">No signing partners yet.</div>}

        {people.length > 0 && (
          <table>
            <thead><tr><th>Name</th><th>Designation</th><th>Details</th><th /></tr></thead>
            <tbody>
              {people.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.is_default_signatory && <span className="settings-pill on">Default signatory</span>}
                  </td>
                  <td className="settings-cell-muted">{item.designation}</td>
                  <td className="settings-cell-muted">
                    {Object.entries(item.attributes || {}).map(([key, value]) => `${bundle?.profiles?.professional?.schema?.properties?.[key]?.title || key}: ${value}`).join(" · ")}
                  </td>
                  <td>
                    {canUpdate && (
                      <div className="table-actions">
                        <button type="button" className="link" onClick={() => setPerson({ id: item.id, name: item.name, designation: item.designation || "", attributes: item.attributes || {}, isDefaultSignatory: item.is_default_signatory })}>Edit</button>
                        <button type="button" className="link delete-link" onClick={async () => {
                          if (!window.confirm(`Remove ${item.name}?`)) return;
                          await removeProfessional(item.id);
                          setPeople(await getProfessionals());
                        }}>Remove</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {person && (
          <form className="client-account-form" onSubmit={savePerson} aria-label="Signing partner">
            <div className="workflow-form-grid">
              <label>Name<input value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} required autoFocus /></label>
              <label>Designation<input value={person.designation} onChange={(e) => setPerson({ ...person, designation: e.target.value })} /></label>
              <label className="client-checkbox">
                <input type="checkbox" checked={person.isDefaultSignatory} onChange={(e) => setPerson({ ...person, isDefaultSignatory: e.target.checked })} />
                Default signatory
              </label>
            </div>
            <SchemaForm
              schema={bundle?.profiles?.professional?.schema}
              uiSchema={bundle?.profiles?.professional?.ui}
              formData={person.attributes}
              onChange={(attributes) => setPerson({ ...person, attributes })}
              idPrefix="partner"
            />
            <div className="bundle-actions">
              <button type="button" className="secondary-button" onClick={() => setPerson(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>Save partner</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default FirmPage;
