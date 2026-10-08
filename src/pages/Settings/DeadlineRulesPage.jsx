import { useCallback, useEffect, useState } from "react";

import { getRules, removeExtension, runReminders, setExtension, setRuleActive } from "../../api/obligations";
import { formatDay } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

/*
 * Settings → Deadline rules: the bundle's rules, which generate every
 * client's deadlines. Switch a rule off, or record a government extension
 * for one period (FIX-20) — open deadlines move with it, filed ones do not.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthDay = (value) => {
  const [month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

// The rule's schedule in words.
function describe(rule) {
  const { schedule, condition, else: otherwise } = rule.definition || {};

  if (!schedule) return rule.kind === "manual" ? "Added by hand" : "Relative to a date on the engagement";
  if (schedule.dates) return `Quarterly: ${Object.values(schedule.dates).map(monthDay).join(", ")}`;
  if (schedule.date) {
    const base = `Yearly, ${monthDay(schedule.date)} after the year`;
    return condition && otherwise ? `${base} (otherwise ${monthDay(otherwise.date)})` : base;
  }

  return `${rule.frequency === "quarterly" ? "Quarterly" : "Monthly"}, day ${schedule.day} of the ${schedule.offsetMonths ? "next" : "same"} month`;
}

function DeadlineRulesPage() {
  const { user } = useAuth();
  const canEdit = (user?.permissions || []).includes("obligations.rules");

  const [rules, setRules] = useState([]);
  const [extending, setExtending] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setRules(await getRules());
    } catch (requestError) {
      setError(requestError.message || "Could not load the rules.");
    }
  }, []);

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

  return (
    <div className="settings-panel settings-sub-page deadline-rules-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Deadline rules</h2>
          <p>The rules every client's deadlines are generated from. Record a government extension for one year here; open deadlines move to the new date.</p>
        </div>

        {canEdit && (
          <div className="page-header-actions">
            <button type="button" className="secondary-button" onClick={() => run(runReminders, (result) => `${result.raised} reminder${result.raised === 1 ? "" : "s"} raised. Emails go out only for reminder automations that are switched on.`)}>
              Send reminders now
            </button>
          </div>
        )}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <DataGrid
        id="deadline-rules"
        label="Deadline rules"
        rows={rules}
        rowKey={(rule) => rule.key}
        search={{ placeholder: "Search rules", label: "Search rules", text: (rule) => [rule.name, rule.service_key].join(" ") }}
        columns={[
          {
            key: "name",
            header: "Rule",
            render: (rule) => (
              <>
                <span className="grid-cell-title">{rule.name}</span>
                <span className="grid-cell-sub">{rule.service_key.replace(/_/g, " ")}</span>
              </>
            ),
          },
          { key: "service_key", header: "Service", hidden: true, filter: { label: (value) => value.replace(/_/g, " "), tone: toneFor }, render: (rule) => <Pill tone={toneFor(rule.service_key)}>{rule.service_key.replace(/_/g, " ")}</Pill> },
          { key: "schedule", header: "Schedule", sortable: false, render: (rule) => <span className="settings-cell-muted">{describe(rule)}</span> },
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
                extending?.key === rule.key ? (
                  <form
                    className="extension-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      run(() => setExtension(rule.key, extending.periodKey, { dueOn: extending.dueOn, reason: extending.reason }), (result) => `Extension saved; ${result.moved} open deadline${result.moved === 1 ? "" : "s"} moved.`).then(() => setExtending(null));
                    }}
                  >
                    <input aria-label="Period" placeholder={rule.frequency === "monthly" ? "2025-09" : rule.frequency === "quarterly" ? "2025-26:Q2" : "2025-26"} value={extending.periodKey} onChange={(e) => setExtending({ ...extending, periodKey: e.target.value })} required />
                    <input aria-label="Extended due date" type="date" value={extending.dueOn} onChange={(e) => setExtending({ ...extending, dueOn: e.target.value })} required />
                    <input aria-label="Reason" placeholder="e.g. CBDT circular" value={extending.reason} onChange={(e) => setExtending({ ...extending, reason: e.target.value })} />
                    <button type="submit" className="primary">Save</button>
                    <button type="button" className="link" onClick={() => setExtending(null)}>Cancel</button>
                  </form>
                ) : (
                  <button type="button" className="link" onClick={() => setExtending({ key: rule.key, periodKey: "", dueOn: "", reason: "" })}>+ Extension</button>
                )
              )}
              </>
            ),
          },
          {
            key: "active",
            header: "Active",
            value: (rule) => (rule.is_active ? "On" : "Off"),
            filter: { tone: (value) => (value === "On" ? "success" : "neutral") },
            render: (rule) => (
              <label className="client-checkbox">
                <input type="checkbox" checked={rule.is_active} disabled={!canEdit} onChange={(e) => run(() => setRuleActive(rule.key, e.target.checked), e.target.checked ? "Rule switched on." : "Rule switched off — existing deadlines stay.")} aria-label={`${rule.name} active`} />
              </label>
            ),
          },
        ]}
        empty="No deadline rules."
      />
    </div>
  );
}

export default DeadlineRulesPage;
