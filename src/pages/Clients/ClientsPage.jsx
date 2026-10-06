import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, exportClients } from "../../api/clients";
import { enumLabel } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";

/*
 * The client list (DASH-02/03/04/07): search by name, PAN or CIN, filter by
 * service, and see each client's constitution, identifiers and services at
 * a glance. Archived clients are a separate view.
 */
function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [service, setService] = useState("all");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounced, so typing a PAN does not send a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        setClients(await getClients({ query, archived }));
      } catch (requestError) {
        setError(requestError.message || "Could not load clients.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, archived]);

  // Filter chips from the services the listed clients actually have (DASH-03).
  const serviceChips = useMemo(() => {
    const names = new Map();
    clients.forEach((client) => (client.services || []).forEach((item) => names.set(String(item.id), item.name)));
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [clients]);

  const visible = service === "all" ? clients : clients.filter((client) => (client.services || []).some((item) => String(item.id) === service));

  const clientProfile = bundle?.profiles?.client;
  const identifierLabel = (type) => bundle?.identifiers?.find((rule) => rule.type === type)?.label || type.toUpperCase();

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

      <div className="clients-toolbar">
        <input
          type="search"
          className="clients-search"
          placeholder="Search by name, PAN or CIN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${term("client", true).toLowerCase()}`}
        />

        <label className="client-checkbox">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {serviceChips.length > 0 && (
        <div className="clients-chips" role="group" aria-label="Filter by service">
          <button type="button" className={`chip${service === "all" ? " active" : ""}`} onClick={() => setService("all")}>
            All
          </button>
          {serviceChips.map(([idValue, name]) => (
            <button key={idValue} type="button" className={`chip${service === idValue ? " active" : ""}`} onClick={() => setService(idValue)}>
              {name}
            </button>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="settings-empty">
            {archived ? "No archived clients." : `No ${term("client", true).toLowerCase()} yet.`}
            {!archived && !query && permissions.includes("customers.create") && (
              <div>
                <button type="button" className="primary" onClick={() => navigate("/clients/new")}>
                  Add your first {term("client").toLowerCase()}
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Constitution</th>
                <th>Services</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {visible.map((client, index) => {
                const ids = Object.entries(client.identifiers || {}).filter(([type]) => ["pan", "cin", "llpin"].includes(type));

                return (
                  <tr key={client.id}>
                    <td className="settings-cell-muted">{index + 1}</td>
                    <td>
                      <button type="button" className="link client-name" onClick={() => navigate(`/clients/${client.id}`)}>
                        {client.name}
                      </button>
                      {client.locked_at && <span className="client-badge locked" title="Locked">Locked</span>}
                      {client.attributes?.client_type && (
                        <span className="client-badge">{enumLabel(clientProfile, "client_type", client.attributes.client_type)}</span>
                      )}
                      {ids.length > 0 && (
                        <span className="settings-row-hint">{ids.map(([type, value]) => `${identifierLabel(type)} ${value}`).join(" · ")}</span>
                      )}
                    </td>
                    <td>
                      {client.attributes?.constitution && (
                        <span className={`client-constitution c-${client.attributes.constitution}`}>
                          {enumLabel(clientProfile, "constitution", client.attributes.constitution)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="service-badges">
                        {(client.services || []).map((item) => <span key={item.id} className="service-badge">{item.name}</span>)}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="link" onClick={() => navigate(`/clients/${client.id}`)}>View</button>
                        {!archived && permissions.includes("customers.update") && !client.locked_at && (
                          <button type="button" className="link" onClick={() => navigate(`/clients/${client.id}/edit`)}>Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default ClientsPage;
