import { CalendarBlank, CheckCircle, Clock, HourglassMedium, Warning } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getEngagementTypes, getPeriods } from "../../api/engagements";
import { getDeadlines } from "../../api/obligations";
import { formatDay } from "../../components/bundle/bundleLabels";
import { STATE_LABEL, STATES } from "../../components/deadlines/deadlineLabels";
import { useBundle } from "../../context/BundleContext";
import StatCard from "../../components/ui/StatCard";

/*
 * Every client's deadlines (COMP-04/05/06): counts per state as cards that
 * filter, a financial year and a search to narrow by, and the list sorted
 * overdue first. A deadline opens its client's Compliance tab. Cards and
 * table follow the Dashboard and Clients screens.
 */

const STATE_ICON = { overdue: Warning, due_soon: Clock, in_progress: HourglassMedium, upcoming: CalendarBlank, completed: CheckCircle };
const STATE_HINT = {
  overdue: "Past the due date",
  due_soon: "Within 30 days",
  in_progress: "Being prepared",
  upcoming: "Later in the year",
  completed: "Filed or not applicable",
};
function DeadlinesPage() {
  const navigate = useNavigate();
  const { bundle, term } = useBundle();

  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState("");
  const [state, setState] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEngagementTypes()
      .then(async (types) => {
        if (!types[0]) return;
        const offered = await getPeriods(types[0].key);
        setPeriods(offered.periods);
        setPeriod(offered.current || "");
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const load = useCallback(async () => {
    if (!period) return;

    try {
      setData(await getDeadlines({ period }));
    } catch (requestError) {
      setError(requestError.message || "Could not load deadlines.");
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const items = (data?.items || []).filter(
    (item) => (!state || item.state === state) && (!needle || [item.title, item.customer_name, item.service_name].some((value) => String(value || "").toLowerCase().includes(needle))),
  );

  if (!bundle) {
    return <main className="page deadlines-page"><div className="settings-empty">Deadlines need a profession bundle.</div></main>;
  }

  const openClient = (item) => navigate(`/clients/${item.customer_id}`, { state: { tab: "compliance" } });

  return (
    <main className="page deadlines-page">
      <header className="page-header">
        <div>
          <h1>Deadlines</h1>
          <p>Every {term("client").toLowerCase()}'s compliance deadlines, overdue first.</p>
        </div>
      </header>

      {/* The dashboard's cards: a count per state, each a filter. */}
      <section className="dashboard-stats deadline-stats" role="group" aria-label="Deadlines by state">
        {STATES.map((item) => {
          const Icon = STATE_ICON[item.key];
          const active = state === item.key;

          return (
            <StatCard
              key={item.key}
              label={item.label}
              icon={<Icon size={20} weight="regular" />}
              value={data?.counts?.[item.key] ?? "—"}
              hint={STATE_HINT[item.key]}
              linkLabel={active ? "Show all" : "Show"}
              active={active}
              onClick={() => setState(active ? "" : item.key)}
            />
          );
        })}
      </section>

      <div className="clients-toolbar">
        <input
          type="search"
          className="clients-search"
          placeholder={`Search by deadline, ${term("client").toLowerCase()} or service`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search deadlines"
        />

        <select className="clients-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Financial year">
          {periods.map((item) => <option key={item.label} value={item.label}>FY {item.label}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card" aria-label="Deadlines">
        {!data ? (
          <div className="settings-empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="settings-empty">Nothing here.</div>
        ) : (
          <table className="clients-table deadlines-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Deadline</th>
                <th>{term("client")}</th>
                <th>Due</th>
                <th>State</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="settings-cell-muted">{index + 1}</td>
                  <td>
                    <button type="button" className="link client-name" onClick={() => openClient(item)}>{item.title}</button>
                    {item.service_name && <span className="settings-row-hint">{item.service_name}</span>}
                  </td>
                  <td>{item.customer_name}</td>
                  <td className="deadline-due">{formatDay(item.due_on)}</td>
                  <td><span className={`deadline-pill state-${item.state}`}>{STATE_LABEL[item.state]}</span></td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="link" onClick={() => openClient(item)} aria-label={`Open ${item.customer_name} for ${item.title}`}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default DeadlinesPage;
