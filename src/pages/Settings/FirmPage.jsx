import { useCallback, useEffect, useRef, useState } from "react";
import { Buildings, Certificate, Clock, CurrencyInr, EnvelopeSimple, MapPin, Phone, Scroll } from "@phosphor-icons/react";

import { createProfessional, getFirm, getProfessionals, removeProfessional, updateFirm, updateProfessional } from "../../api/firm";
import SchemaForm from "../../components/bundle/SchemaForm";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import { enumLabel } from "../../components/bundle/bundleLabels";
import { SettingRow, SettingRows } from "../../components/ui/SettingRow";
import DataGrid from "../../components/ui/DataGrid";
import Modal from "../../components/ui/Modal";
import Pill from "../../components/ui/Pill";

/*
 * Settings → Firm (SET-01–03): the firm's details and the bundle's firm
 * fields (a CA's FRN), and the professionals who sign on its behalf. These
 * feed every document the firm generates.
 */

const TIME_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];
const PERSON = { name: "", designation: "", attributes: {}, isDefaultSignatory: false };

// The firm's own fields, in the order the rows show them.
const DETAILS = [
  ["name", "Display name", "How the firm is named across the workspace", <Buildings size={16} key="i" />],
  ["legalName", "Legal name", "The registered name, used on letters", <Scroll size={16} key="i" />],
  ["address", "Address", "Printed on the letterhead", <MapPin size={16} key="i" />],
  ["city", "City of signing", "Where letters are signed", <MapPin size={16} key="i" />],
  ["email", "Email", "The firm's contact address", <EnvelopeSimple size={16} key="i" />],
  ["phone", "Phone", "The firm's contact number", <Phone size={16} key="i" />],
  ["timeZone", "Time zone", "Due dates and \"today\" are worked out in it", <Clock size={16} key="i" />],
  ["currency", "Currency", "Fees and payments are shown in it", <CurrencyInr size={16} key="i" />],
];

function FirmPage() {
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
  const [editingFirm, setEditingFirm] = useState(false);

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
      setEditingFirm(false);
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
    <div className="settings-panel settings-sub-page settings-form-page firm-page">
      <div className="page-header settings-panel-header">
        <div>
          <h2>Firm</h2>
          <p>Your firm's details and signing partners. Generated documents take them from here.</p>
        </div>

        {canUpdate && firm && !editingFirm && (
          <div className="page-header-actions">
            <button type="button" className="secondary-button" onClick={() => { setNotice(""); setEditingFirm(true); }}>
              Edit firm details
            </button>
          </div>
        )}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!firm ? (
        <section className="card"><div className="settings-empty">Loading firm…</div></section>
      ) : !editingFirm ? (
        <SettingRows label="Firm details">
          {DETAILS.map(([key, title, description, icon]) => (
            <SettingRow key={key} icon={icon} title={title} description={description} action={<span className="setting-value">{firm[key] || "—"}</span>} />
          ))}
          {Object.entries(bundle?.profiles?.organization?.schema?.properties || {}).map(([key, property]) => (
            <SettingRow
              key={key}
              icon={<Certificate size={16} />}
              title={property.title || key}
              description={property.description}
              action={<span className="setting-value">{enumLabel(bundle.profiles.organization, key, firm.attributes?.[key]) || "—"}</span>}
            />
          ))}
        </SettingRows>
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
              <button type="button" className="secondary-button" onClick={() => { setEditingFirm(false); setErrors({}); load(); }} disabled={saving}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Save firm"}</button>
            </div>
          )}
        </form>
      )}

      <section className="card firm-partners" aria-label="Signing partners">
        <div className="bundle-summary">
          <h2>Signing partners</h2>
          {canUpdate && <button type="button" className="secondary-button" onClick={() => { setError(""); setPerson(PERSON); }}>+ Add partner</button>}
        </div>

        {people.length === 0 && <div className="settings-empty">No signing partners yet.</div>}

        {people.length > 0 && (
          <DataGrid
            embedded
            label="Signing partners"
            rows={people}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (item) => (
                  <>
                    <span className="grid-cell-title">{item.name}</span>
                    {item.is_default_signatory && <Pill dot tone="success">Default signatory</Pill>}
                  </>
                ),
              },
              { key: "designation", header: "Designation", render: (item) => <span className="settings-cell-muted">{item.designation}</span> },
              {
                key: "details",
                header: "Details",
                sortable: false,
                render: (item) => (
                  <span className="settings-cell-muted">
                    {Object.entries(item.attributes || {}).map(([key, value]) => `${bundle?.profiles?.professional?.schema?.properties?.[key]?.title || key}: ${value}`).join(" · ")}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                sortable: false,
                hideable: false,
                render: (item) =>
                  canUpdate && (
                    <div className="table-actions">
                      <button type="button" className="link" onClick={() => setPerson({ id: item.id, name: item.name, designation: item.designation || "", attributes: item.attributes || {}, isDefaultSignatory: item.is_default_signatory })}>Edit</button>
                      <button type="button" className="link delete-link" onClick={async () => {
                        if (!window.confirm(`Remove ${item.name}?`)) return;
                        await removeProfessional(item.id);
                        setPeople(await getProfessionals());
                      }}>Remove</button>
                    </div>
                  ),
              },
            ]}
          />
        )}

        {person && (
          <Modal
            title={person.id ? "Edit signing partner" : "Add signing partner"}
            description="Partners who sign the firm's letters. The default signatory signs unless a letter names another."
            onClose={() => setPerson(null)}
            onSubmit={savePerson}
            busy={saving}
            footer={
              <>
                <button type="button" className="secondary-button" onClick={() => setPerson(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="primary" disabled={saving}>Save partner</button>
              </>
            }
          >
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="modal-fields two">
              <label>Name<input value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} required autoFocus /></label>
              <label>Designation<input value={person.designation} onChange={(e) => setPerson({ ...person, designation: e.target.value })} /></label>
              <label className="client-checkbox wide">
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
          </Modal>
        )}
      </section>
    </div>
  );
}

export default FirmPage;
