import { useCallback, useEffect, useState } from "react";
import { Plus } from "@phosphor-icons/react";

import { createRule, getRules, removeExtension, removeRule, setExtension, setRuleActive, updateRule } from "../../api/obligations";
import { formatDay } from "../bundle/bundleLabels";
import DataGrid from "../ui/DataGrid";
import Modal from "../ui/Modal";
import Pill from "../ui/Pill";
import RuleForm from "./RuleForm";
import { describeRule, emptyForm, formFromRule, payloadFrom } from "./ruleTiming";

/*
 * A service's deadlines: the rules every engaged client's deadlines come
 * from. Add one, change when it falls due, switch it off, or record a
 * government extension for one period — open deadlines follow at once,
 * filed ones never change. Bundle rules a firm edits are kept through
 * upgrades and offered back under Settings → Update → Customized items.
 *
 *   service                  { key, name }
 *   services                 every service, for "another service engaged"
 *   canEdit                  obligations.rules
 */
function ServiceDeadlines({ service, services, canEdit }) {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(null); // { key?, form }
  const [extending, setExtending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const serviceName = (key) => services.find((item) => item.key === key)?.name || key.replace(/_/g, " ");

  const load = useCallback(async () => {
    try {
      const all = await getRules();
      setRules(all.filter((rule) => rule.service_key === service.key));
    } catch (requestError) {
      setError(requestError.message || "Could not load the deadlines.");
      setRules([]);
    }
  }, [service.key]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, done) {
    try {
      setError("");
      const result = await action();
      setNotice(typeof done === "function" ? done(result) : done);
      await load();
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
    }
  }

  async function save() {
    try {
      setBusy(true);
      setFormError("");
      const payload = payloadFrom(editing.form);

      if (editing.key) await updateRule(editing.key, payload);
      else await createRule({ ...payload, serviceKey: service.key });

      setNotice(editing.key ? "Deadline saved. Open deadlines moved to the new dates." : "Deadline added. Engaged clients have it now.");
      setEditing(null);
      await load();
    } catch (requestError) {
      setFormError(requestError.message || "The deadline could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const otherServices = services.filter((item) => item.key && item.key !== service.key);

  return (
    <section className="service-deadlines" role="tabpanel" aria-label="Deadlines">
      <header className="engagement-tab-head">
        <div>
          <h2>Deadlines</h2>
          <p>When this service's filings fall due. Every client engaged for it gets these each year; extensions move one period's date.</p>
        </div>
        {canEdit && (
          <button type="button" className="primary" onClick={() => { setFormError(""); setEditing({ form: emptyForm() }); }}>
            <Plus size={14} aria-hidden="true" />Add deadline
          </button>
        )}
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {editing && (
        <Modal
          title={editing.key ? `Edit ${editing.name}` : `New deadline for ${service.name}`}
          description="Every client engaged for this service gets it each year. Open deadlines move when you change the date; filed ones never do."
          onClose={() => setEditing(null)}
          onSubmit={save}
          busy={busy}
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
              <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : editing.key ? "Save deadline" : "Add deadline"}</button>
            </>
          }
        >
          <RuleForm form={editing.form} onChange={(form) => setEditing({ ...editing, form })} services={otherServices} error={formError} />
        </Modal>
      )}

      {extending && (
        <Modal
          size="sm"
          title={`Extend ${extending.name}`}
          description="A government extension for one period: its open deadlines move to the new date."
          onClose={() => setExtending(null)}
          onSubmit={() =>
            run(() => setExtension(extending.key, extending.periodKey, { dueOn: extending.dueOn, reason: extending.reason }), (result) => `Extension saved; ${result.moved} open deadline${result.moved === 1 ? "" : "s"} moved.`).then(() => setExtending(null))
          }
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => setExtending(null)}>Cancel</button>
              <button type="submit" className="primary">Save extension</button>
            </>
          }
        >
          <div className="modal-fields">
            <label>
              Period
              <input placeholder={extending.frequency === "monthly" ? "2025-09" : extending.frequency === "quarterly" ? "2025-26:Q2" : "2025-26"} value={extending.periodKey} onChange={(e) => setExtending({ ...extending, periodKey: e.target.value })} required autoFocus />
            </label>
            <label>
              Extended due date
              <input type="date" value={extending.dueOn} onChange={(e) => setExtending({ ...extending, dueOn: e.target.value })} required />
            </label>
            <label>
              Reason
              <input placeholder="e.g. CBDT circular" value={extending.reason} onChange={(e) => setExtending({ ...extending, reason: e.target.value })} />
            </label>
          </div>
        </Modal>
      )}

      {rules && (
        <DataGrid
          id="service-deadlines"
          label={`${service.name} deadlines`}
          rows={rules}
          rowKey={(rule) => rule.key}
          empty={canEdit ? "No deadlines yet. Add one to give engaged clients their due dates." : "No deadlines for this service."}
          columns={[
            {
              key: "name",
              header: "Deadline",
              render: (rule) => (
                <>
                  <span className="grid-cell-title">{rule.name}</span>
                  <span className="grid-cell-sub">
                    {rule.bundle_key ? "From the profession bundle" : "Your firm's"}
                    {rule.update_available_version && ` · bundle ${rule.update_available_version} has a different version`}
                  </span>
                </>
              ),
            },
            { key: "when", header: "When it is due", sortable: false, render: (rule) => <span className="settings-cell-muted">{describeRule(rule, serviceName)}</span> },
            {
              key: "extensions",
              header: "Extensions",
              sortable: false,
              render: (rule) => (
                <>
                  {rule.overrides.map((override) => (
                    <span key={override.period_key} className="extension">
                      {override.period_key}: {formatDay(String(override.due_on).slice(0, 10))}
                      {canEdit && (
                        <button type="button" className="link delete-link" onClick={() => run(() => removeExtension(rule.key, override.period_key), "Extension removed.")} aria-label={`Remove the ${override.period_key} extension`}>×</button>
                      )}
                    </span>
                  ))}
                  {canEdit && (
                    <button type="button" className="link" onClick={() => setExtending({ key: rule.key, name: rule.name, frequency: rule.frequency, periodKey: "", dueOn: "", reason: "" })} aria-label={`Extend ${rule.name}`}>
                      + Extension
                    </button>
                  )}
                </>
              ),
            },
            {
              key: "active",
              header: "Active",
              value: (rule) => (rule.is_active ? "On" : "Off"),
              render: (rule) => (
                <label className="client-checkbox">
                  <input type="checkbox" checked={rule.is_active} disabled={!canEdit} onChange={(e) => run(() => setRuleActive(rule.key, e.target.checked), e.target.checked ? "Deadline switched on." : "Deadline switched off — existing deadlines stay.")} aria-label={`${rule.name} active`} />
                </label>
              ),
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (rule) => {
                if (!canEdit) return null;
                const form = formFromRule(rule);

                return (
                  <div className="table-actions">
                    {form ? (
                      <button type="button" className="link" onClick={() => { setFormError(""); setEditing({ key: rule.key, name: rule.name, form }); }} aria-label={`Edit ${rule.name}`}>Edit</button>
                    ) : (
                      <Pill tone="neutral" title="This deadline's timing is set by the bundle in a form the editor cannot show">Set by bundle</Pill>
                    )}
                    {!rule.bundle_key && (
                      <button
                        type="button"
                        className="link delete-link"
                        onClick={() => window.confirm(`Delete ${rule.name}? Its open deadlines go too; filed ones stay.`) && run(() => removeRule(rule.key), "Deadline deleted.")}
                        aria-label={`Delete ${rule.name}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      )}
    </section>
  );
}

export default ServiceDeadlines;
