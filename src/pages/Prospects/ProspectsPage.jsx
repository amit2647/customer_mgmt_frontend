import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { convertLead, createLead, deleteLead, getLeads, updateLead, updateProspect } from "../../api/leads";
import { enumLabel, formatDay, formatMoney } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";

/*
 * The prospect board (PROS-01–05): the bundle's pipeline as columns. Cards
 * move with Back/Next; Convert creates the client and opens the wizard to
 * complete it — the prospect is only marked converted once a client exists,
 * so cancelling the wizard loses nothing (FIX-09).
 */

const EMPTY = { name: "", email: "", phone: "", constitution: "", quotedFee: "", nextMeetingOn: "", notes: "", status: "" };

function ProspectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);

  const columns = bundle?.pipeline || [];
  const leadProfile = bundle?.profiles?.lead;
  const constitutions = leadProfile?.schema?.properties?.constitution?.enum || [];

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getLeads();
      setLeads((Array.isArray(all) ? all : []).filter((lead) => lead.status !== "Converted"));
    } catch (requestError) {
      setError(requestError.message || "Could not load prospects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action) {
    try {
      setBusy(true);
      setError("");
      await action();
      await load();
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const move = (lead, offset) => {
    const index = columns.findIndex((column) => column.status === lead.status);
    const target = columns[Math.max(0, Math.min(columns.length - 1, (index < 0 ? 0 : index) + offset))];

    return run(() => updateProspect(lead.id, { status: target.status }));
  };

  async function save(event) {
    event.preventDefault();

    const prospect = {
      status: editing.status || columns[0]?.status,
      quotedFee: editing.quotedFee === "" ? null : Number(editing.quotedFee),
      nextMeetingOn: editing.nextMeetingOn || null,
      notes: editing.notes,
      ...(leadProfile && editing.constitution ? { attributes: { constitution: editing.constitution } } : {}),
    };

    await run(async () => {
      let leadId = editing.id;

      if (leadId) {
        await updateLead(leadId, { name: editing.name, email: editing.email, phone: editing.phone });
      } else {
        const created = await createLead({ name: editing.name, email: editing.email, phone: editing.phone, channel: "Referral" });
        leadId = created.id ?? created.lead?.id;
      }

      await updateProspect(leadId, prospect);
      setEditing(null);
    });
  }

  async function convert(lead) {
    if (!window.confirm(`Convert ${lead.name} into a ${term("client").toLowerCase()}? You will finish the details in the wizard.`)) return;

    try {
      setBusy(true);
      const result = await convertLead(lead.id);
      navigate(`/clients/${result.customer?.id ?? result.lead?.converted_customer_id}/edit?onboarding=1`);
    } catch (requestError) {
      setError(requestError.message || "The prospect could not be converted.");
      setBusy(false);
    }
  }

  if (!bundle) {
    return <main className="page prospects-page"><div className="settings-empty">The prospect board needs a profession bundle.</div></main>;
  }

  return (
    <main className="page prospects-page">
      <header className="page-header">
        <div>
          <h1>Prospects</h1>
          <p>Leads on their way to becoming {term("client", true).toLowerCase()}.</p>
        </div>

        {can("leads.create") && (
          <button type="button" className="primary" onClick={() => setEditing({ ...EMPTY, status: columns[0]?.status })}>
            + Add prospect
          </button>
        )}
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {editing && (
        <form className="card prospect-form" onSubmit={save} aria-label="Prospect">
          <div className="workflow-form-grid">
            <label>Name<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required autoFocus /></label>
            <label>Email<input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></label>
            <label>Phone<input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></label>
            {constitutions.length > 0 && (
              <label>Constitution
                <select value={editing.constitution} onChange={(e) => setEditing({ ...editing, constitution: e.target.value })}>
                  <option value="">—</option>
                  {constitutions.map((value) => <option key={value} value={value}>{enumLabel(bundle?.profiles?.client || leadProfile, "constitution", value)}</option>)}
                </select>
              </label>
            )}
            <label>Quoted fee<input type="number" min="0" value={editing.quotedFee} onChange={(e) => setEditing({ ...editing, quotedFee: e.target.value })} /></label>
            <label>Next meeting<input type="date" value={editing.nextMeetingOn} onChange={(e) => setEditing({ ...editing, nextMeetingOn: e.target.value })} /></label>
            <label>Stage
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {columns.map((column) => <option key={column.key} value={column.status}>{column.label}</option>)}
              </select>
            </label>
            <label className="workflow-field-full">Notes<textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
          </div>
          <div className="bundle-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="primary" disabled={busy}>{editing.id ? "Save" : "Add prospect"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="settings-empty">Loading…</div>
      ) : (
        <div className="prospect-board">
          {columns.map((column, columnIndex) => {
            const cards = leads.filter((lead) => (columnIndex === 0 ? !columns.some((item) => item.status === lead.status) || lead.status === column.status : lead.status === column.status));

            return (
              <section key={column.key} className="prospect-column" aria-label={column.label}>
                <header>
                  <h2>{column.label}</h2>
                  <span className="prospect-count">{cards.length}</span>
                </header>

                {cards.map((lead) => (
                  <article key={lead.id} className="prospect-card">
                    <strong>{lead.name}</strong>
                    {lead.attributes?.constitution && <span className="settings-row-hint">{enumLabel(bundle?.profiles?.client || leadProfile, "constitution", lead.attributes.constitution)}</span>}
                    {lead.quoted_fee !== null && lead.quoted_fee !== undefined && <span className="prospect-quote">{formatMoney(lead.quoted_fee)}</span>}
                    {lead.next_meeting_on && <span className="settings-row-hint">Meeting {formatDay(lead.next_meeting_on)}</span>}
                    {lead.notes && <p>{lead.notes}</p>}

                    <div className="prospect-actions">
                      {can("leads.update") && columnIndex > 0 && <button type="button" className="link" disabled={busy} onClick={() => move(lead, -1)} aria-label={`Move ${lead.name} back`}>← Back</button>}
                      {can("leads.update") && columnIndex < columns.length - 1 && <button type="button" className="link" disabled={busy} onClick={() => move(lead, 1)} aria-label={`Move ${lead.name} on`}>Next →</button>}
                      {can("leads.update") && (
                        <button
                          type="button"
                          className="link"
                          onClick={() =>
                            setEditing({
                              id: lead.id,
                              name: lead.name || "",
                              email: lead.email || "",
                              phone: lead.phone || "",
                              constitution: lead.attributes?.constitution || "",
                              quotedFee: lead.quoted_fee ?? "",
                              nextMeetingOn: lead.next_meeting_on ? String(lead.next_meeting_on).slice(0, 10) : "",
                              notes: lead.notes || "",
                              status: column.status,
                            })
                          }
                        >
                          Edit
                        </button>
                      )}
                      {can("customers.create") && <button type="button" className="link" disabled={busy} onClick={() => convert(lead)}>Convert</button>}
                      {can("leads.delete") && (
                        <button type="button" className="link delete-link" disabled={busy} onClick={() => window.confirm(`Delete ${lead.name}?`) && run(() => deleteLead(lead.id))}>Delete</button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default ProspectsPage;
