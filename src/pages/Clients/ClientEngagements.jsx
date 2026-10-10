import { useCallback, useEffect, useState } from "react";
import { Briefcase, CalendarCheck, CalendarBlank, CurrencyInr, PencilSimple, Plus } from "@phosphor-icons/react";

import { createEngagement, getEngagementTypes, getEngagements, getPayments, getPeriods, recordPayment, updateEngagement } from "../../api/engagements";
import EngagementForm, { engagementPayload, engagementValue } from "../../components/bundle/EngagementForm";
import { enumLabel, formatDay, formatMoney } from "../../components/bundle/bundleLabels";
import DataGrid from "../../components/ui/DataGrid";
import Modal from "../../components/ui/Modal";
import Pill, { toneFor } from "../../components/ui/Pill";
import NumberInput from "../../components/ui/NumberInput";
import { CardSkeleton } from "../../components/ui/Skeleton";

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
  const canAdd = !readOnly && can("engagements.update") && Boolean(type) && !editing && freePeriods.length > 0;

  // The year Add offers: the current one if it is free, else the latest free.
  const nextPeriod = freePeriods.at(-2) || freePeriods.at(-1);

  function startAdding() {
    const period = nextPeriod;
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

  if (loading) return <CardSkeleton fields={6} />;

  // Adding or editing an engagement happens in a dialog over the tab.
  const form = editing && type && (
    <Modal
      size="lg"
      title={editing.id ? "Edit engagement" : "New engagement"}
      description={`${type.name}${editing.value.period ? ` · FY ${editing.value.period}` : ""}`}
      onClose={() => setEditing(null)}
      onSubmit={saveEngagement}
      busy={busy}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>{editing.id ? "Save changes" : "Add engagement"}</button>
        </>
      }
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
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
    </Modal>
  );

  return (
    <section className="client-engagements" role="tabpanel" aria-label={view === "fees" ? "Fees" : "Engagement"}>
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {view === "engagement" && (
        <>
          <header className="engagement-tab-head">
            <div>
              <h2>Engagements</h2>
              <p>One per financial year: the services you do that year, their fees, and the dates deadlines are worked out from.</p>
            </div>
            {canAdd && engagements.length > 0 && (
              <button type="button" className="primary" onClick={startAdding}>
                <Plus size={14} aria-hidden="true" />Add engagement{nextPeriod ? ` for FY ${nextPeriod.label}` : ""}
              </button>
            )}
          </header>

          {form}

          {engagements.length === 0 && !editing && (
            <section className="card engagement-empty">
              <Briefcase size={28} aria-hidden="true" />
              <h3>No engagements yet</h3>
              <p>Add the first one to choose the services for a year and their fees. Its deadlines follow on the Compliance tab.</p>
              {canAdd && (
                <button type="button" className="primary" onClick={startAdding}>
                  <Plus size={14} aria-hidden="true" />Add engagement{nextPeriod ? ` for FY ${nextPeriod.label}` : ""}
                </button>
              )}
            </section>
          )}

          {engagements.map((engagement) => {
            const auditor = engagement.attributes?.previous_auditor;
            const stages = engagement.type.stages || [];
            const stageIndex = stages.findIndex((item) => item.key === engagement.stage);
            const gross = engagement.totals?.gross;

            return (
              <article key={engagement.id} className="card engagement-card" aria-label={`${engagement.type.name} ${engagement.periodLabel}`}>
                <header>
                  <div>
                    <span className="engagement-card-type">{engagement.type.name}</span>
                    <h3>{engagement.periodLabel ? `FY ${engagement.periodLabel}` : engagement.type.name}</h3>
                  </div>
                  {!readOnly && can("engagements.update") && !editing && (
                    <button type="button" className="secondary-button" onClick={() => setEditing({ id: engagement.id, value: engagementValue(engagement) })} aria-label={`Edit engagement FY ${engagement.periodLabel}`}>
                      <PencilSimple size={14} aria-hidden="true" />Edit
                    </button>
                  )}
                </header>

                {stages.length > 0 && (
                  <ol className="engagement-stages" aria-label="Stage">
                    {stages.map((item, index) => (
                      <li
                        key={item.key}
                        className={index < stageIndex ? "done" : index === stageIndex ? "current" : undefined}
                        aria-current={index === stageIndex ? "step" : undefined}
                      >
                        <span className="engagement-stage-dot" aria-hidden="true" />
                        {item.label}
                      </li>
                    ))}
                  </ol>
                )}

                <dl className="engagement-stats">
                  <div>
                    <dt><CalendarCheck size={14} aria-hidden="true" />Appointed</dt>
                    <dd className={engagement.appointmentOn ? undefined : "muted"}>{formatDay(engagement.appointmentOn) || "Not set"}</dd>
                  </div>
                  {engagement.attributes?.agm_on && (
                    <div>
                      <dt><CalendarBlank size={14} aria-hidden="true" />AGM / board meeting</dt>
                      <dd>{formatDay(engagement.attributes.agm_on)}</dd>
                    </div>
                  )}
                  <div>
                    <dt><Briefcase size={14} aria-hidden="true" />Services</dt>
                    <dd>{engagement.lines.length}</dd>
                  </div>
                  {canReadFees && gross !== undefined && (
                    <div>
                      <dt><CurrencyInr size={14} aria-hidden="true" />Fees and expenses</dt>
                      <dd>{formatMoney(gross)}</dd>
                    </div>
                  )}
                </dl>

                <div className="engagement-services">
                  {engagement.lines.length === 0 && <span className="settings-cell-muted">No services engaged — edit to add them.</span>}
                  {engagement.lines.map((line) => <Pill key={line.id} tone={toneFor(serviceName(line.serviceId))}>{serviceName(line.serviceId)}</Pill>)}
                </div>

                {auditor?.firm && (
                  <aside className="engagement-auditor">
                    <span>Previous auditor</span>
                    <strong>{auditor.firm}{auditor.frn ? ` · FRN ${auditor.frn}` : ""}</strong>
                    {auditor.reason && <em>{enumLabel(profile?.schema?.properties?.previous_auditor ? { schema: profile.schema.properties.previous_auditor, ui: profile.ui?.previous_auditor } : null, "reason", auditor.reason)}</em>}
                  </aside>
                )}
              </article>
            );
          })}
        </>
      )}

      {paying && (
        <Modal
          title="Record payment"
          description={`FY ${engagements.find((engagement) => engagement.id === paying.engagementId)?.periodLabel || ""} · received from the client`}
          onClose={() => setPaying(null)}
          onSubmit={savePayment}
          busy={busy}
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => setPaying(null)} disabled={busy}>Cancel</button>
              <button type="submit" className="primary" disabled={busy}>Record payment</button>
            </>
          }
        >
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="modal-fields two">
            <label>Amount<NumberInput prefix="₹" value={paying.value.amount} onChange={(amount) => setPaying({ ...paying, value: { ...paying.value, amount } })} required autoFocus /></label>
            <label>Received on<input type="date" value={paying.value.receivedOn} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, receivedOn: e.target.value } })} required /></label>
            <label>Method
              <select value={paying.value.method} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, method: e.target.value } })}>
                {METHODS.map((method) => <option key={method}>{method}</option>)}
              </select>
            </label>
            <label>Reference<input value={paying.value.reference} onChange={(e) => setPaying({ ...paying, value: { ...paying.value, reference: e.target.value } })} /></label>
          </div>
        </Modal>
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

                <DataGrid
                  embedded
                  label={`Services FY ${engagement.periodLabel}`}
                  rows={engagement.lines}
                  columns={[
                    { key: "service", header: "Service", value: (line) => serviceName(line.serviceId) },
                    { key: "feeAmount", header: "Fee", align: "right", value: (line) => Number(line.feeAmount || 0), render: (line) => formatMoney(line.feeAmount) },
                    { key: "expensesAmount", header: "Expenses", align: "right", value: (line) => Number(line.expensesAmount || 0), render: (line) => formatMoney(line.expensesAmount) },
                  ]}
                />

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
                    <div className="bundle-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setPaying({ engagementId: engagement.id, value: { amount: totals.balance > 0 ? String(totals.balance) : "", receivedOn: today(), method: METHODS[0], reference: "" } })}
                      >
                        Update payment
                      </button>
                    </div>
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
