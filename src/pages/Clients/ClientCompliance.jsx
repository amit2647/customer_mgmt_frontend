import { useCallback, useEffect, useState } from "react";

import { getEngagementTypes, getPeriods } from "../../api/engagements";
import { getClientDeadlines, updateDeadline } from "../../api/obligations";
import { formatDay } from "../../components/bundle/bundleLabels";
import { STATE_LABEL, STATUSES } from "../../components/deadlines/deadlineLabels";

/*
 * A client's deadlines for one financial year (CD-07): a section per
 * service with done/total and overdue, a status per deadline, overdue rows
 * tinted. Deadlines come from the year's engagement — change its services
 * on the Engagement tab.
 */
function ClientCompliance({ client, can, readOnly, onEditEngagement }) {
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState("");
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    getEngagementTypes()
      .then(async (types) => {
        if (!types[0]) return;
        const offered = await getPeriods(types[0].key);
        setPeriods(offered.periods);
        setPeriod(offered.current || offered.periods.at(-1)?.label || "");
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const load = useCallback(async () => {
    if (!period) return;

    try {
      setData(await getClientDeadlines(client.id, period));
    } catch (requestError) {
      setError(requestError.message || "Could not load deadlines.");
    }
  }, [client.id, period]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(item, status) {
    try {
      setError("");
      await updateDeadline(item.id, { status });
      await load();
    } catch (requestError) {
      setError(requestError.message || "The status was not changed.");
    }
  }

  const canChange = can("obligations.update") && !readOnly;

  return (
    <section className="client-compliance" role="tabpanel" aria-label="Compliance">
      <div className="compliance-toolbar">
        <label>
          Financial year
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Financial year">
            {periods.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
          </select>
        </label>

        {can("engagements.update") && !readOnly && onEditEngagement && (
          <button type="button" className="secondary-button" onClick={onEditEngagement}>Edit engagement</button>
        )}
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {data && data.services.length === 0 && (
        <section className="card"><div className="settings-empty">No deadlines for {period}. Engage services for this year on the Engagement tab.</div></section>
      )}

      {data?.services.map((group) => {
        const key = group.serviceKey || "other";
        const expanded = open[key] ?? group.done < group.total;

        return (
          <section key={key} className="card compliance-service">
            <button type="button" className="compliance-heading" aria-expanded={expanded} onClick={() => setOpen({ ...open, [key]: !expanded })}>
              <strong>{group.serviceName}</strong>
              <span className="settings-cell-muted">{group.done}/{group.total} done</span>
              {group.overdue > 0 && <span className="deadline-pill state-overdue">{group.overdue} overdue</span>}
              <span aria-hidden="true" className="compliance-caret">{expanded ? "▾" : "▸"}</span>
            </button>

            {expanded && (
              <table>
                <thead><tr><th>Deadline</th><th>Due</th><th>State</th><th>Status</th></tr></thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id} className={`deadline-row state-${item.state}`}>
                      <td>{item.title}</td>
                      <td>{formatDay(item.due_on)}</td>
                      <td><span className={`deadline-pill state-${item.state}`}>{STATE_LABEL[item.state]}</span></td>
                      <td>
                        <select value={item.status} onChange={(e) => setStatus(item, e.target.value)} disabled={!canChange} aria-label={`Status of ${item.title}`}>
                          {STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </section>
  );
}

export default ClientCompliance;
