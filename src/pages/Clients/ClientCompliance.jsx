import { useCallback, useEffect, useState } from "react";

import { getEngagementTypes, getPeriods } from "../../api/engagements";
import { getClientDeadlines, updateDeadline } from "../../api/obligations";
import { formatDay } from "../../components/bundle/bundleLabels";
import { STATE_LABEL, STATE_TONE, STATES, STATUSES } from "../../components/deadlines/deadlineLabels";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

/*
 * A client's deadlines for one financial year (CD-07): each service's
 * progress (done/total, overdue) above one grid of every deadline, filtered
 * by service and state, a status per deadline, overdue rows tinted.
 * Deadlines come from the year's engagement — change its services on the
 * Engagement tab.
 */
function ClientCompliance({ client, can, readOnly, onEditEngagement }) {
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // The grid's filters, held here so a service card and the Service chip
  // are the same filter.
  const [filters, setFilters] = useState({});

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

  const groups = data?.services || [];
  const rows = groups.flatMap((group) => group.items.map((item) => ({ ...item, serviceName: group.serviceName })));

  const chosenServices = filters.serviceName || new Set();
  // The cards pick one service at a time; the grid's Service chip may still
  // pick several, and then no card shows as chosen.
  const chosenCard = chosenServices.size === 1 ? [...chosenServices][0] : null;

  function toggleService(name) {
    const { serviceName, ...rest } = filters;
    setFilters(chosenCard === name ? rest : { ...rest, serviceName: new Set([name]) });
  }

  function showAllServices() {
    const { serviceName, ...rest } = filters;
    setFilters(rest);
  }

  const yearPicker = (
    <select className="clients-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Financial year">
      {periods.map((item) => <option key={item.label} value={item.label}>FY {item.label}</option>)}
    </select>
  );

  return (
    <section className="client-compliance" role="tabpanel" aria-label="Compliance">
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {groups.length > 0 && (
        <div className="compliance-progress-head">
          <span>Click a service to show only its deadlines.</span>
          {chosenServices.size > 0 && (
            <button type="button" className="link" onClick={showAllServices}>
              Show all services
            </button>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <ul className="compliance-progress" aria-label="Progress by service">
          {groups.map((group) => (
            <li key={group.serviceKey || "other"}>
              <button
                type="button"
                className={`compliance-progress-card${group.overdue > 0 ? " has-overdue" : ""}${chosenCard === group.serviceName ? " selected" : ""}`}
                aria-pressed={chosenCard === group.serviceName}
                onClick={() => toggleService(group.serviceName)}
              >
                <span className="compliance-progress-name">{group.serviceName}</span>
                <span className="compliance-progress-count">
                  <strong>{group.done}/{group.total} done</strong>
                  {group.overdue > 0 && <Pill tone="danger">{group.overdue} overdue</Pill>}
                </span>
                <span className="compliance-progress-bar" aria-hidden="true">
                  <span style={{ width: `${group.total ? Math.round((group.done / group.total) * 100) : 0}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DataGrid
        id="client-compliance"
        label="Deadlines"
        rows={rows}
        filters={filters}
        onFiltersChange={setFilters}
        initialSort={{ key: "due_on", dir: "asc" }}
        rowClassName={(item) => `deadline-row state-${item.state}`}
        search={{ placeholder: "Search deadlines", label: "Search deadlines" }}
        controls={yearPicker}
        actions={
          can("engagements.update") && !readOnly && onEditEngagement && (
            <button type="button" className="secondary-button" onClick={onEditEngagement}>Edit engagement</button>
          )
        }
        loading={!data && !error}
        empty={`No deadlines for FY ${period}. Engage services for this year on the Engagement tab.`}
        columns={[
          { key: "title", header: "Deadline", render: (item) => <span className="grid-cell-title">{item.title}</span> },
          {
            key: "serviceName",
            header: "Service",
            filter: { tone: (value) => toneFor(value) },
            render: (item) => <Pill tone={toneFor(item.serviceName)}>{item.serviceName}</Pill>,
          },
          { key: "due_on", header: "Due", value: (item) => item.due_on, render: (item) => formatDay(item.due_on) },
          {
            key: "state",
            header: "State",
            // Urgency order (overdue first), shown by name in the filter.
            value: (item) => STATES.findIndex((entry) => entry.key === item.state),
            filter: { label: (index) => STATES[index]?.label, tone: (index) => STATE_TONE[STATES[index]?.key] || "neutral" },
            render: (item) => <Pill dot tone={STATE_TONE[item.state]}>{STATE_LABEL[item.state]}</Pill>,
          },
          {
            key: "status",
            header: "Status",
            sortable: false,
            hideable: false,
            render: (item) => (
              <select className="clients-select" value={item.status} onChange={(e) => setStatus(item, e.target.value)} disabled={!canChange} aria-label={`Status of ${item.title}`}>
                {STATUSES.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
              </select>
            ),
          },
        ]}
      />
    </section>
  );
}

export default ClientCompliance;
