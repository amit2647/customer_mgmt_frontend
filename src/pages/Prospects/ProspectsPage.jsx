import { CurrencyInr, Kanban, UserCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { convertLead, deleteLead, getLeads, updateProspect } from "../../api/leads";
import { enumLabel, formatDay, formatMoney } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import StatCard from "../../components/ui/StatCard";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";
import { Skeleton } from "../../components/ui/Skeleton";

/*
 * The prospect board (PROS-01–05): the bundle's pipeline as columns. Cards
 * move with Back/Next; Convert creates the client and opens the wizard to
 * complete it — the prospect is only marked converted once a client exists,
 * so cancelling the wizard loses nothing (FIX-09).
 *
 * With a bundle this is the one screen for leads (the Leads list redirects
 * here), so it also offers a searchable list, which can include converted
 * prospects with a link to the client each became.
 */

const VIEW_KEY = "omnicore-prospects-view";

function rememberedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
}

function ProspectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);

  const columns = bundle?.pipeline || [];
  const leadProfile = bundle?.profiles?.lead;

  const [everyLead, setEveryLead] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(rememberedView);
  const [search, setSearch] = useState("");
  const [showConverted, setShowConverted] = useState(false);
  const [stage, setStage] = useState("all");
  const [error, setError] = useState("");
  // Back from the add / edit page.
  const [notice] = useState(location.state?.saved || "");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getLeads();
      setEveryLead(Array.isArray(all) ? all : []);
    } catch (requestError) {
      setError(requestError.message || "Could not load prospects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function chooseView(next) {
    setView(next);

    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Remembering the view is a convenience only.
    }
  }

  const leads = everyLead.filter((lead) => lead.status !== "Converted");
  // A status outside the pipeline sits in the first column, as on the board.
  const columnOf = (lead) => {
    const index = columns.findIndex((column) => column.status === lead.status);
    return index < 0 ? 0 : index;
  };
  const needle = search.trim().toLowerCase();
  const matches = (lead) => !needle || [lead.name, lead.email, lead.phone].some((value) => String(value || "").toLowerCase().includes(needle));
  // The list: the stage cards narrow it; the grid searches and filters the rest.
  const listed = everyLead
    .filter((lead) => showConverted || lead.status !== "Converted")
    .filter((lead) => stage === "all" || (lead.status !== "Converted" && columns[columnOf(lead)]?.key === stage));
  const stageOf = (lead) => (lead.status === "Converted" ? "Converted" : columns[columnOf(lead)]?.label);

  // The Dashboard's cards: open prospects, one per stage, and what is quoted.
  const quoted = (list) => list.reduce((total, lead) => total + (Number(lead.quoted_fee) || 0), 0);
  const inStage = (column) => leads.filter((lead) => columns[columnOf(lead)]?.key === column.key);
  const showStage = (key) => {
    setStage(key);
    chooseView("list");
  };

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

  const startEditing = (lead) => navigate(`/prospects/${lead.id}/edit`);

  const constitutionPill = (lead) =>
    lead.attributes?.constitution ? (
      <span className={`client-constitution c-${lead.attributes.constitution}`}>
        {enumLabel(bundle?.profiles?.client || leadProfile, "constitution", lead.attributes.constitution)}
      </span>
    ) : null;

  // The same actions on a card and on a list row.
  const actionsFor = (lead, columnIndex) => (
    <>
      {can("leads.update") && columnIndex > 0 && <button type="button" className="link" disabled={busy} onClick={() => move(lead, -1)} aria-label={`Move ${lead.name} back`}>← Back</button>}
      {can("leads.update") && columnIndex < columns.length - 1 && <button type="button" className="link" disabled={busy} onClick={() => move(lead, 1)} aria-label={`Move ${lead.name} on`}>Next →</button>}
      {can("leads.update") && <button type="button" className="link" onClick={() => startEditing(lead)}>Edit</button>}
      {can("customers.create") && <button type="button" className="link" disabled={busy} onClick={() => convert(lead)}>Convert</button>}
      {can("leads.delete") && (
        <button type="button" className="link delete-link" disabled={busy} onClick={() => window.confirm(`Delete ${lead.name}?`) && run(() => deleteLead(lead.id))}>Delete</button>
      )}
    </>
  );

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

        <div className="prospect-header-actions">
          <div className="prospect-view-toggle" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "board"} onClick={() => chooseView("board")}>Board</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => chooseView("list")}>List</button>
          </div>

          {can("leads.create") && (
            <button type="button" className="primary" onClick={() => navigate("/prospects/new")}>
              + Add prospect
            </button>
          )}
        </div>
      </header>

      <section className="dashboard-stats prospect-stats" style={{ "--stat-columns": columns.length + 2 }} aria-label="Prospects by stage">
        <StatCard
          label="Open prospects"
          icon={<Kanban size={20} weight="regular" />}
          loading={loading} value={loading ? "—" : leads.length}
          hint={`Not yet ${term("client", true).toLowerCase()}`}
          linkLabel="View list"
          active={view === "list" && stage === "all"}
          onClick={() => showStage("all")}
        />

        {columns.map((column) => {
          const here = inStage(column);

          return (
            <StatCard
              key={column.key}
              label={column.label}
              icon={<UserCircle size={20} weight="regular" />}
              loading={loading} value={loading ? "—" : here.length}
              hint={quoted(here) > 0 ? `${formatMoney(quoted(here))} quoted` : "Nothing quoted"}
              linkLabel="Show"
              active={view === "list" && stage === column.key}
              onClick={() => showStage(column.key)}
            />
          );
        })}

        <StatCard
          label="Quoted value"
          icon={<CurrencyInr size={20} weight="regular" />}
          loading={loading} value={loading ? "—" : formatMoney(quoted(leads))}
          hint="Across open prospects"
        />
      </section>

      {notice && <div className="alert alert-success">{notice}</div>}

      {view !== "list" && (
        <div className="clients-toolbar">
          <input
            type="search"
            className="clients-search"
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search prospects"
          />
        </div>
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {view === "list" ? (
        <DataGrid
          id="prospects"
          label="Prospect list"
          rows={listed}
          loading={loading}
          search={{ placeholder: "Search by name, email or phone", label: "Search prospects", text: (lead) => [lead.name, lead.email, lead.phone].join(" ") }}
          controls={
            <label className="client-checkbox">
              <input type="checkbox" checked={showConverted} onChange={(e) => setShowConverted(e.target.checked)} />
              Show converted
            </label>
          }
          rowClassName={(lead) => (lead.status === "Converted" ? "prospect-row-converted" : "")}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (lead) => (
                <>
                  <span className="grid-cell-title client-name">{lead.name}</span>
                  {(lead.email || lead.phone) && <span className="grid-cell-sub">{[lead.email, lead.phone].filter(Boolean).join(" · ")}</span>}
                </>
              ),
            },
            {
              key: "stage",
              header: "Stage",
              value: (lead) => (lead.status === "Converted" ? columns.length : columnOf(lead)),
              filter: { values: (lead) => [stageOf(lead)], tone: (value) => (value === "Converted" ? "success" : "info") },
              render: (lead) => <Pill dot tone={lead.status === "Converted" ? "success" : "info"}>{stageOf(lead)}</Pill>,
            },
            { key: "channel", header: "Source", filter: { tone: toneFor }, render: (lead) => lead.channel ? <Pill tone={toneFor(lead.channel)}>{lead.channel}</Pill> : "—" },
            {
              key: "constitution",
              header: "Constitution",
              value: (lead) => lead.attributes?.constitution || "",
              filter: { label: (value) => enumLabel(bundle?.profiles?.client || leadProfile, "constitution", value), tone: toneFor },
              render: (lead) => lead.attributes?.constitution && <Pill tone={toneFor(lead.attributes.constitution)}>{enumLabel(bundle?.profiles?.client || leadProfile, "constitution", lead.attributes.constitution)}</Pill>,
            },
            { key: "quoted_fee", header: "Quoted fee", align: "right", value: (lead) => (lead.quoted_fee === null || lead.quoted_fee === undefined ? null : Number(lead.quoted_fee)), render: (lead) => (lead.quoted_fee !== null && lead.quoted_fee !== undefined ? formatMoney(lead.quoted_fee) : "—") },
            { key: "next_meeting_on", header: "Next meeting", render: (lead) => (lead.next_meeting_on ? formatDay(lead.next_meeting_on) : "—") },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (lead) => (
                <div className="table-actions">
                  {lead.status === "Converted"
                    ? lead.converted_customer_id && <Link className="link" to={`/clients/${lead.converted_customer_id}`}>Open {term("client").toLowerCase()}</Link>
                    : actionsFor(lead, columnOf(lead))}
                </div>
              ),
            },
          ]}
          empty="No prospects match."
          emptyFiltered="No prospects match."
        />
      ) : (
        <div className="prospect-board" aria-busy={loading || undefined}>
          {loading && <span className="skeleton-sr" role="status">Loading…</span>}
          {columns.map((column, columnIndex) => {
            const cards = leads.filter((lead) => columnOf(lead) === columnIndex).filter(matches);

            return (
              <section key={column.key} className="prospect-column" aria-label={column.label}>
                <header>
                  <h2>{column.label}</h2>
                  {!loading && <span className="prospect-count">{cards.length}</span>}
                </header>

                {loading && [0, 1].map((index) => (
                  <article key={index} className="prospect-card" aria-hidden="true">
                    <Skeleton width={index ? "64%" : "78%"} height={13} />
                    <Skeleton width={72} height={11} />
                    <Skeleton width="52%" height={10} />
                  </article>
                ))}

                {cards.map((lead) => (
                  <article key={lead.id} className="prospect-card">
                    <div className="prospect-card-top">
                      <span className="client-name">{lead.name}</span>
                      {constitutionPill(lead)}
                    </div>
                    {lead.quoted_fee !== null && lead.quoted_fee !== undefined && <span className="prospect-quote">{formatMoney(lead.quoted_fee)}</span>}
                    {lead.next_meeting_on && <span className="settings-row-hint">Meeting {formatDay(lead.next_meeting_on)}</span>}
                    {lead.channel && <span className="settings-row-hint">Source: {lead.channel}</span>}
                    {lead.notes && <p>{lead.notes}</p>}

                    <div className="table-actions prospect-actions">{actionsFor(lead, columnIndex)}</div>
                  </article>
                ))}

                {!loading && cards.length === 0 && <div className="prospect-empty">No prospects</div>}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default ProspectsPage;
