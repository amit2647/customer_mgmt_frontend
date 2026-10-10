import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, exportClients } from "../../api/clients";
import { enumLabel } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

/*
 * The client list (DASH-02/03/04/07): search by name, PAN or CIN, filter by
 * service, constitution or type, and see each client's identifiers and
 * services at a glance. Archived clients are a separate view (loaded apart).
 */
function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const [archived, setArchived] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The whole list (or the archived one); the grid searches and filters it.
  useEffect(() => {
    let current = true;

    setLoading(true);
    setError("");
    getClients({ query: "", archived })
      .then((list) => current && setClients(list))
      .catch((requestError) => current && setError(requestError.message || "Could not load clients."))
      .finally(() => current && setLoading(false));

    return () => {
      current = false;
    };
  }, [archived]);

  const clientProfile = bundle?.profiles?.client;
  const identifierLabel = (type) => bundle?.identifiers?.find((rule) => rule.type === type)?.label || type.toUpperCase();

  const identifiersOf = (client) => Object.entries(client.identifiers || {}).filter(([type]) => ["pan", "cin", "llpin"].includes(type));
  const constitution = (value) => enumLabel(clientProfile, "constitution", value);
  const clientType = (value) => enumLabel(clientProfile, "client_type", value);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (client) => {
        const ids = identifiersOf(client);
        return (
          <>
            <button type="button" className="link client-name" onClick={() => navigate(`/clients/${client.id}`)}>
              {client.name}
            </button>
            {client.locked_at && <span className="client-badge locked" title="Locked">Locked</span>}
            {ids.length > 0 && <span className="grid-cell-sub">{ids.map(([type, value]) => `${identifierLabel(type)} ${value}`).join(" · ")}</span>}
          </>
        );
      },
    },
    {
      key: "constitution",
      header: "Constitution",
      value: (client) => client.attributes?.constitution || "",
      filter: { label: constitution, tone: toneFor },
      render: (client) => client.attributes?.constitution && <Pill tone={toneFor(client.attributes.constitution)}>{constitution(client.attributes.constitution)}</Pill>,
    },
    {
      key: "client_type",
      header: "Type",
      value: (client) => client.attributes?.client_type || "",
      filter: { label: clientType, tone: (value) => (value === "one_time" ? "warning" : "neutral") },
      render: (client) => client.attributes?.client_type && <Pill tone={client.attributes.client_type === "one_time" ? "warning" : "neutral"}>{clientType(client.attributes.client_type)}</Pill>,
    },
    {
      key: "services",
      header: "Services",
      sortable: false,
      value: (client) => (client.services || []).map((item) => item.name),
      filter: { tone: toneFor },
      render: (client) => (
        <div className="grid-pills">
          {(client.services || []).map((item) => <Pill key={item.id} tone={toneFor(item.name)}>{item.name}</Pill>)}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      hideable: false,
      render: (client) => (
        <div className="table-actions">
          <button type="button" className="link" onClick={() => navigate(`/clients/${client.id}`)}>View</button>
          {!archived && permissions.includes("customers.update") && !client.locked_at && (
            <button type="button" className="link" onClick={() => navigate(`/clients/${client.id}/edit`)}>Edit</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <main className="page clients-page">
      <header className="page-header">
        <div>
          <h1>{term("client", true)}</h1>
          <p>Every {term("client").toLowerCase()} with its constitution, identifiers and services.</p>
        </div>

        <div className="document-actions">
          <button type="button" className="secondary-button" onClick={() => exportClients().catch((exportError) => setError(exportError.message || "The export did not finish."))}>
            Export CSV
          </button>
          {permissions.includes("customers.create") && permissions.includes("profiles.update") && (
            <button type="button" className="secondary-button" onClick={() => navigate("/clients/import")}>
              Import CSV
            </button>
          )}
          {permissions.includes("customers.create") && !archived && (
            <button type="button" className="primary" onClick={() => navigate("/clients/new")}>
              + Add {term("client")}
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && clients.length === 0 && !archived && permissions.includes("customers.create") ? (
        <section className="card">
          <div className="settings-empty">
            No {term("client", true).toLowerCase()} yet.
            <div>
              <button type="button" className="primary" onClick={() => navigate("/clients/new")}>
                Add your first {term("client").toLowerCase()}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <DataGrid
          id="clients"
          label={term("client", true)}
          rows={clients}
          columns={columns}
          loading={loading}
          initialSort={{ key: "name", dir: "asc" }}
          search={{
            placeholder: "Search by name, PAN or CIN",
            label: `Search ${term("client", true).toLowerCase()}`,
            text: (client) => [client.name, client.email, ...identifiersOf(client).map(([, value]) => value)].join(" "),
          }}
          controls={
            <label className="client-checkbox">
              <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
              Show archived
            </label>
          }
          empty={archived ? "No archived clients." : `No ${term("client", true).toLowerCase()} yet.`}
        />
      )}
    </main>
  );
}

export default ClientsPage;
