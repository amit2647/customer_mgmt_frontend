import { useCallback, useEffect, useState } from "react";

import { createEngagement, getEngagementTypes, getEngagements, getPayments, getPeriods, recordPayment, updateEngagement } from "../../api/engagements";
import EngagementForm, { engagementPayload, engagementValue } from "../../components/bundle/EngagementForm";
import { enumLabel, formatDay, formatMoney } from "../../components/bundle/bundleLabels";

/*
 * A client's engagements (CD-06, CD-09) and fees (CD-08), one card per
 * period. `view` picks the tab: "engagement" or "fees".
 */

const today = () => new Date().toISOString().slice(0, 10);
const METHODS = ["Bank transfer", "UPI", "Cheque", "Cash", "Card"];

function useEngagements(customerId) {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setEngagements(await getEngagements(customerId));
    } catch (requestError) {
      setError(requestError.message || "Could not load engagements.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { engagements, loading, error, setError, load };
}

function ClientEngagements({ view, client, bundle, services, can, readOnly }) {
  const { engagements, loading, error, setError, load } = useEngagements(client.id);

  const [type, setType] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [editing, setEditing] = useState(null); // { id?, value }
  const [paying, setPaying] = useState(null); // { engagementId, value }
  const [payments, setPayments] = useState({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  const canReadFees = can("fees.read");
  const canChangeFees = can("fees.update");
  const serviceName = (serviceId) => services.find((service) => Number(service.id) === serviceId)?.name || `Service ${serviceId}`;
  const profile = type && bundle?.profiles?.engagement?.[type.key];

  useEffect(() => {
    getEngagementTypes()
      .then(async (types) => {
        if (!types[0]) return;
        setType(types[0]);
        setPeriods((await getPeriods(types[0].key)).periods);
      })
      .catch(() => {});
  }, []);

  // Payments for every engagement, when the Fees tab is open.
  useEffect(() => {
    if (view !== "fees" || !canReadFees) return;

    Promise.all(engagements.map(async (engagement) => [engagement.id, await getPayments(engagement.id)]))
      .then((entries) => setPayments(Object.fromEntries(entries)))
      .catch(() => {});
  }, [view, engagements, canReadFees]);

  async function run(action, done) {
    try {
      setBusy(true);
      setError("");
      setErrors({});
      await action();
      setNotice(done);
      await load();
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
      setErrors(requestError.details || {});
    } finally {
      setBusy(false);
    }
  }

  const engagedPeriods = new Set(engagements.map((engagement) => engagement.periodLabel));
  const freePeriods = periods.filter((period) => !engagedPeriods.has(period.label));

  function startAdding() {
    const period = freePeriods.at(-2) || freePeriods.at(-1);
    setEditing({
      value: {
        period: period?.label || "",
        appointmentOn: "",
        stage: type?.stages?.[0]?.key || "",
        attributes: {},
        lines: Object.fromEntries((client.services || []).map((service) => [Number(service.id), { feeAmount: "", expensesAmount: "" }])),
      },
    });
  }

  function saveEngagement(event) {
    event.preventDefault();

    const payload = engagementPayload(editing.value, { canChangeFees });

    run(async () => {
      if (editing.id) {
        const { period, ...changes } = payload;
        await updateEngagement(editing.id, changes);
      } else {
        await createEngagement({ customerId: client.id, typeKey: type.key, ...payload });
      }

      setEditing(null);
    }, editing.id ? "Engagement updated." : "Engagement added.");
  }

  function savePayment(event) {
    event.preventDefault();

    run(async () => {
      await recordPayment(paying.engagementId, { ...paying.value, amount: Number(paying.value.amount) });
      setPaying(null);
    }, "Payment recorded.");
  }

  if (loading) return <section className="card"><div className="settings-empty">Loading…</div></section>;

  const form = editing && type && (
    <form className="card client-account-form engagement-editor" onSubmit={saveEngagement} aria-label={editing.id ? "Edit engagement" : "New engagement"}>
      <h3>{editing.id ? `Edit ${type.name.toLowerCase()} · ${editing.value.period}` : `New ${type.name.toLowerCase()}`}</h3>
      <EngagementForm
        type={type}
        periods={editing.id ? periods.filter((period) => period.label === editing.value.period).concat(periods.some((period) => period.label === editing.value.period) ? [] : [{ label: editing.value.period }]) : freePeriods}
        services={services}
        value={editing.value}
        onChange={(value) => setEditing({ ...editing, value })}
        profile={profile}
        canReadFees={canReadFees}
        canChangeFees={canChangeFees}
        errors={errors}
        periodLocked={Boolean(editing.id)}
      />
      <div className="bundle-actions">
        <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>{editing.id ? "Save engagement" : "Add engagement"}</button>
      </div>
    </form>
  );

  return (
    <section className="client-engagements" role="tabpanel" aria-label={view === "fees" ? "Fees" : "Engagement"}>
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {view === "engagement" && (
        <>
          {!readOnly && can("engagements.update") && type && !editing && freePeriods.length > 0 && (
            <div className="bundle-actions engagement-add">
              <button type="button" className="secondary-button" onClick={startAdding}>+ Add engagement</button>
            </div>
          )}

          {form}

          {engagements.length === 0 && !editing && <section className="card"><div className="settings-empty">No engagements yet.</div></section>}

          {engagements.map((engagement) => {
            const auditor = engagement.attributes?.previous_auditor;
            const stage = engagement.type.stages?.find((item) => item.key === engagement.stage)?.label;

            return (
              <article key={engagement.id} className="card engagement-card" aria-label={`${engagement.type.name} ${engagement.periodLabel}`}>
                <header>
                  <div>
                    <h3>{engagement.periodLabel ? `FY ${engagement.periodLabel}` : engagement.type.name}</h3>
                    <span className="settings-row-hint">{engagement.type.name}</span>
                  </div>
                  {stage && <span className="settings-pill on">{stage}</span>}
                </header>

                <dl className="engagement-facts">
                  <div><dt>Appointed</dt><dd>{formatDay(engagement.appointmentOn) || "—"}</dd></div>
                  {engagement.attributes?.agm_on && <div><dt>AGM / board meeting</dt><dd>{formatDay(engagement.attributes.agm_on)}</dd></div>}
                  <div className="engagement-services"><dt>Services</dt><dd>{engagement.lines.map((line) => <span key={line.id} className="service-badge">{serviceName(line.serviceId)}</span>)}</dd></div>
                  {auditor?.firm && (
                    <div className="engagement-auditor">
                      <dt>Previous auditor</dt>
                      <dd>
                        {auditor.firm}{auditor.frn ? ` (${auditor.frn})` : ""}
                        {auditor.reason && <span className="settings-row-hint">{enumLabel(profile?.schema?.properties?.previous_auditor ? { schema: profile.schema.properties.previous_auditor, ui: profile.ui?.previous_auditor } : null, "reason", auditor.reason)}</span>}
                      </dd>
                    </div>
                  )}
                </dl>

                {!readOnly && can("engagements.update") && !editing && (
                  <div className="bundle-actions">
                    <button type="button" className="link" onClick={() => setEditing({ id: engagement.id, value: engagementValue(engagement) })}>Edit engagement</button>
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}

      {view === "fees" && (
        <>
          {engagements.length === 0 && <section className="card"><div className="settings-empty">No engagements, so no fees yet.</div></section>}

          {engagements.map((engagement) => {
            const totals = engagement.totals || { gross: 0, received: 0, balance: 0 };
            const paid = totals.balance <= 0 && totals.gross > 0;

            return (
              <article key={engagement.id} className="card fee-card" aria-label={`Fees ${engagement.periodLabel}`}>
                <header>
                  <h3>FY {engagement.periodLabel}</h3>
                  <span className={`settings-pill${paid ? " on" : ""}`}>{paid ? "Fully paid" : `Balance ${formatMoney(totals.balance)}`}</span>
                </header>

                <table>
                  <thead><tr><th>Service</th><th className="numeric">Fee</th><th className="numeric">Expenses</th></tr></thead>
                  <tbody>
                    {engagement.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{serviceName(line.serviceId)}</td>
                        <td className="numeric">{formatMoney(line.feeAmount)}</td>
                        <td className="numeric">{formatMoney(line.expensesAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <dl className="fee-totals">
                  <div><dt>Gross</dt><dd>{formatMoney(totals.gross)}</dd></div>
                  <div><dt>Received</dt><dd>{formatMoney(totals.received)}</dd></div>
                  <div><dt>Balance</dt><dd>{formatMoney(totals.balance)}</dd></div>
                </dl>

                {(payments[engagement.id] || []).length > 0 && (
                  <ul className="fee-payments">
                    {payments[engagement.id].map((payment) => (
                      <li key={payment.id}>
                        <strong>{formatMoney(payment.amount)}</strong> on {formatDay(payment.received_on)}
                        {payment.method && ` · ${payment.method}`}
                        {payment.reference && ` · ${payment.reference}`}
                      </li>
                    ))}
                  </ul>
                )}

                {!readOnly && canChangeFees && (
                  paying?.engagementId === engagement.id ? (
                    <form className="client-account-form" onSubmit={savePayment} aria-label="Record payment">
                      <div className="workflow-form-grid">
                        <label>Amount<input type="number" min="0.01" step="0.01" value={paying.value.amount} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, amount: e.target.value } })} required autoFocus /></label>
                        <label>Received on<input type="date" value={paying.value.receivedOn} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, receivedOn: e.target.value } })} required /></label>
                        <label>Method
                          <select value={paying.value.method} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, method: e.target.value } })}>
                            {METHODS.map((method) => <option key={method}>{method}</option>)}
                          </select>
                        </label>
                        <label>Reference<input value={paying.value.reference} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, reference: e.target.value } })} /></label>
                      </div>
                      <div className="bundle-actions">
                        <button type="button" className="secondary-button" onClick={() => setPaying(null)}>Cancel</button>
                        <button type="submit" className="primary" disabled={busy}>Record payment</button>
                      </div>
                    </form>
                  ) : (
                    <div className="bundle-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setPaying({ engagementId: engagement.id, value: { amount: totals.balance > 0 ? String(totals.balance) : "", receivedOn: today(), method: METHODS[0], reference: "" } })}
                      >
                        Update payment
                      </button>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}

export default ClientEngagements;
