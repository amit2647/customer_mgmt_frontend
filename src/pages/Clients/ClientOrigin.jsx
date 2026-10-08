import { useEffect, useState } from "react";

import { getLead, getLeads, linkLead } from "../../api/leads";
import { formatDay, formatMoney } from "../../components/bundle/bundleLabels";

/*
 * Where a client came from. A lead and the client it became are one entity
 * kept by two services (migration 017): the client records the prospect it
 * was won from, and this shows what the prospect stage learned — quote, last
 * meeting, notes. A client won before conversions were recorded can be linked
 * to its prospect here.
 */
function ClientOrigin({ client, can, readOnly, onLinked }) {
  const [lead, setLead] = useState(null);
  const [missing, setMissing] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sourceLeadId = client.source_lead_id;
  const canRead = can("leads.read");
  const canLink = canRead && can("leads.update") && can("customers.update") && !readOnly;

  useEffect(() => {
    setLead(null);
    setMissing(false);

    if (!sourceLeadId || !canRead) return;

    getLead(sourceLeadId)
      .then(setLead)
      .catch(() => setMissing(true));
  }, [sourceLeadId, canRead]);

  async function startLinking() {
    try {
      setError("");
      const all = await getLeads();
      // Prospects not yet tied to any client: open ones, or converted
      // before conversions were recorded.
      setCandidates((Array.isArray(all) ? all : []).filter((item) => !item.converted_customer_id));
    } catch (requestError) {
      setError(requestError.message || "Could not load prospects.");
    }
  }

  async function link(event) {
    event.preventDefault();

    try {
      setBusy(true);
      setError("");
      await linkLead(choice, client.id);
      setCandidates(null);
      await onLinked();
    } catch (requestError) {
      setError(requestError.message || "The prospect could not be linked.");
    } finally {
      setBusy(false);
    }
  }

  if (!canRead) return null;

  if (sourceLeadId) {
    return (
      <section className="client-section client-origin" aria-label="Won from prospect">
        <div className="client-section-heading">
        <span>Origin</span>
        <div className="client-section-heading">
          <span>Origin</span>
          <h2>Won from prospect</h2>
          <p>What the prospect stage recorded before this client was won.</p>
        </div>
        <p>What the prospect stage recorded before this client was won.</p>
      </div>
        {missing && <p className="settings-row-hint">The prospect this client was won from has since been deleted.</p>}
        {lead && (
          <dl className="engagement-facts">
            <div><dt>Prospect</dt><dd>{lead.name}</dd></div>
            <div><dt>Quoted fee</dt><dd>{lead.quoted_fee !== null && lead.quoted_fee !== undefined ? formatMoney(lead.quoted_fee) : "—"}</dd></div>
            <div><dt>Last meeting</dt><dd>{lead.next_meeting_on ? formatDay(lead.next_meeting_on) : "—"}</dd></div>
            <div><dt>Converted</dt><dd>{lead.status === "Converted" ? formatDay(lead.updated_at) : "—"}</dd></div>
            {lead.notes && <div className="client-origin-notes"><dt>Notes</dt><dd>{lead.notes}</dd></div>}
          </dl>
        )}
      </section>
    );
  }

  if (!canLink) return null;

  return (
    <section className="client-section client-origin" aria-label="Won from prospect">
      <h2>Won from prospect</h2>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {candidates === null ? (
        <>
          <p className="settings-row-hint">Not linked to the prospect it was won from.</p>
          <div className="bundle-actions">
            <button type="button" className="secondary-button" onClick={startLinking}>Link a prospect</button>
          </div>
        </>
      ) : candidates.length === 0 ? (
        <p className="settings-row-hint">There are no unlinked prospects to choose from.</p>
      ) : (
        <form className="client-origin-link" onSubmit={link}>
          <label>
            Prospect
            <select value={choice} onChange={(e) => setChoice(e.target.value)} required>
              <option value="">Choose…</option>
              {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.email ? ` · ${item.email}` : ""}{item.status === "Converted" ? " (converted)" : ""}</option>)}
            </select>
          </label>
          <div className="bundle-actions">
            <button type="button" className="secondary-button" onClick={() => setCandidates(null)}>Cancel</button>
            <button type="submit" className="primary" disabled={busy || !choice}>Link</button>
          </div>
        </form>
      )}
    </section>
  );
}

export default ClientOrigin;
