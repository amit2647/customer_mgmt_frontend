import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  addBankAccount,
  archiveClient,
  getClient,
  lockClient,
  purgeClient,
  removeBankAccount,
  restoreClient,
  setPrimaryBankAccount,
  unlockClient,
} from "../../api/clients";
import { getServices } from "../../api/services";
import Field, { formatDate } from "../../components/common/Field";
import { enumLabel, formatDay, identifiersFor, roleLabel } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import ClientCompliance from "./ClientCompliance";
import ClientEngagements from "./ClientEngagements";
import ClientCredentials from "./ClientCredentials";
import ClientDocuments from "./ClientDocuments";
import ClientFiles from "./ClientFiles";
import ClientOrigin from "./ClientOrigin";
import Breadcrumb from "../../components/ui/Breadcrumb";

/*
 * One client (CD-01–05, CD-11): header with lock and type flags, then tabs.
 * Engagement, compliance, fees, documents, credentials and files tabs arrive
 * with their milestones; only what exists is shown.
 */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "engagement", label: "Engagement", permission: "engagements.read", needs: "engagements" },
  { id: "compliance", label: "Compliance", permission: "obligations.read", needs: "obligations" },
  { id: "fees", label: "Fees", permission: "fees.read", needs: "engagements" },
  { id: "documents", label: "Documents", permission: "documents.read", needs: "documents" },
  { id: "credentials", label: "Credentials", permission: "vault.read", needs: "vault" },
  { id: "files", label: "Files", permission: "files.read", needs: "vault" },
  { id: "people", label: "People" },
  { id: "bank", label: "Bank accounts", permission: "profiles.read" },
];

const NEW_ACCOUNT = { bankName: "", branch: "", accountNumber: "", routingCode: "", accountType: "Current", holderName: "" };

function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);

  const [client, setClient] = useState(null);
  // The Deadlines page opens a client straight on its Compliance tab.
  const [tab, setTab] = useState(location.state?.tab || "overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.saved ? "Saved." : "");
  const [services, setServices] = useState([]);
  const [account, setAccount] = useState(null);

  const load = useCallback(async () => {
    try {
      setClient(await getClient(id));
    } catch (requestError) {
      setError(requestError.message || "Could not load the client.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Service names for the engagement and fee tabs.
  useEffect(() => {
    getServices()
      .then((list) => setServices(Array.isArray(list) ? list : list?.services || []))
      .catch(() => setServices([]));
  }, []);

  async function act(action, done, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;

    try {
      setBusy(true);
      setError("");
      await action();
      setNotice(done);
      await load();
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="page record-detail-page"><div className="communication-empty">Loading…</div></main>;
  }

  if (!client) {
    return <main className="page record-detail-page"><div className="alert alert-error" role="alert">{error || "Client not found."}</div></main>;
  }

  const profile = bundle?.profiles?.client;
  const attributes = client.attributes || {};
  const archived = Boolean(client.archived_at);
  const locked = Boolean(client.locked_at);
  const shownIdentifiers = identifiersFor(bundle, attributes).filter((rule) => rule.shown || client.identifiers?.[rule.type]);

  return (
    <main className="page record-detail-page client-detail">
      <Breadcrumb onBack={() => navigate("/clients")} backLabel={term("client", true)} section={term("client", true).toUpperCase()} title={client.name} />

      <div className="page-header">
        <div>
          <h1>
            {client.name}
            {locked && <span className="client-badge locked">Locked</span>}
            {archived && <span className="client-badge archived">Archived</span>}
            {attributes.client_type && <span className="client-badge">{enumLabel(profile, "client_type", attributes.client_type)}</span>}
          </h1>
          <p>
            {[enumLabel(profile, "constitution", attributes.constitution), ...shownIdentifiers.filter((rule) => client.identifiers?.[rule.type]).map((rule) => `${rule.label} ${client.identifiers[rule.type]}`)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="service-badges">
            {(client.services || []).map((service) => <span key={service.id} className="service-badge">{service.name}</span>)}
          </div>
        </div>

        <div className="page-header-actions">
          {!archived && can("customers.update") && (!locked || can("profiles.lock")) && (
            <button type="button" className="secondary-button" onClick={() => navigate(`/clients/${id}/edit`)} disabled={busy}>Edit</button>
          )}
          {!archived && can("profiles.lock") && (
            <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => (locked ? unlockClient(id) : lockClient(id)), locked ? "Unlocked." : "Locked — only people who can unlock clients can change it now.")}>
              {locked ? "Unlock" : "Lock"}
            </button>
          )}
          {!archived && can("customers.delete") && (
            <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => archiveClient(id), "Archived. Its records are kept; restore it to work on it again.", `Archive ${client.name}? It leaves every list, and nothing about it is deleted.`)}>
              Archive
            </button>
          )}
          {archived && can("customers.delete") && (
            <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => restoreClient(id), "Restored.")}>Restore</button>
          )}
          {archived && can("customers.purge") && (
            <button
              type="button"
              className="secondary-button danger"
              disabled={busy}
              onClick={() =>
                act(
                  async () => {
                    await purgeClient(id);
                    navigate("/clients", { replace: true });
                  },
                  "Deleted permanently.",
                  `Permanently delete ${client.name} and everything recorded about it? This cannot be undone.`,
                )
              }
            >
              Delete permanently
            </button>
          )}
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {location.state?.warning && <div className="alert alert-error" role="alert">{location.state.warning}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="client-tabs" role="tablist">
        {TABS.filter((item) => (!item.permission || can(item.permission)) && (!item.needs || (bundle?.capabilities || []).includes(item.needs))).map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="record-details" role="tabpanel" aria-label="Overview">
          <Field label="Constitution" value={enumLabel(profile, "constitution", attributes.constitution)} />
          {Object.entries(profile?.schema?.properties || {})
            .filter(([field]) => field !== "constitution" && attributes[field] !== undefined && attributes[field] !== "")
            .map(([field, definition]) => (
              <Field key={field} label={definition.title || field} value={enumLabel(profile, field, attributes[field])} />
            ))}
          {shownIdentifiers.map((rule) => <Field key={rule.type} label={rule.label} value={client.identifiers?.[rule.type]} />)}
          <Field label="Email" value={client.email} href={client.email && `mailto:${client.email}`} />
          <Field label="Phone" value={client.phone} href={client.phone && `tel:${client.phone}`} />
          <Field label="Address" value={client.address} />
          <Field label="Added" value={formatDate(client.created_at)} />
        </section>
      )}

      {tab === "overview" && <ClientOrigin client={client} can={can} readOnly={archived} onLinked={load} />}

      {(tab === "engagement" || tab === "fees") && (
        <ClientEngagements view={tab} client={client} bundle={bundle} services={services} can={can} readOnly={archived || (locked && !can("profiles.lock"))} />
      )}

      {tab === "compliance" && (
        <ClientCompliance client={client} can={can} readOnly={archived || (locked && !can("profiles.lock"))} onEditEngagement={() => setTab("engagement")} />
      )}

      {tab === "documents" && <ClientDocuments client={client} can={can} readOnly={archived} />}

      {tab === "credentials" && <ClientCredentials client={client} can={can} readOnly={archived} onOpenFiles={() => setTab("files")} />}

      {tab === "files" && <ClientFiles client={client} can={can} readOnly={archived} />}

      {tab === "people" && (
        <section className="card" role="tabpanel" aria-label="People">
          {(client.people || []).length === 0 ? (
            <div className="settings-empty">No people recorded.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Designation</th><th>Details</th><th /></tr>
              </thead>
              <tbody>
                {client.people.map((person) => (
                  <tr key={person.id}>
                    <td><strong>{person.name}</strong></td>
                    <td>{roleLabel(bundle, person.role, attributes)}</td>
                    <td className="settings-cell-muted">{person.designation}</td>
                    <td className="settings-cell-muted">
                      {Object.entries(person.attributes || {})
                        .map(([field, value]) => `${bundle?.profiles?.person?.schema?.properties?.[field]?.title || field}: ${/_on$/.test(field) ? formatDay(value) : value}`)
                        .join(" · ")}
                    </td>
                    <td>{person.is_signatory && <span className="settings-pill on">Signatory</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "bank" && (
        <section className="card" role="tabpanel" aria-label="Bank accounts">
          {(client.bankAccounts || []).length === 0 && <div className="settings-empty">No bank accounts.</div>}

          <div className="client-accounts">
            {(client.bankAccounts || []).map((item) => (
              <article key={item.id} className="client-account">
                <div>
                  <strong>{item.bank_name}</strong>
                  <span className="settings-row-hint">{[item.branch, item.account_type, item.routing_code].filter(Boolean).join(" · ")}</span>
                  <span className="client-account-number">{item.account_number}</span>
                  {item.holder_name && <span className="settings-row-hint">{item.holder_name}</span>}
                </div>
                <div className="table-actions">
                  {item.is_primary ? (
                    <span className="settings-pill on">Primary</span>
                  ) : (
                    can("profiles.update") && !archived && (
                      <button type="button" className="link" disabled={busy} onClick={() => act(() => setPrimaryBankAccount(id, item.id), "Primary account changed.")}>Set primary</button>
                    )
                  )}
                  {can("profiles.update") && !archived && (
                    <button type="button" className="link delete-link" disabled={busy} onClick={() => act(() => removeBankAccount(id, item.id), "Account removed.", `Remove the ${item.bank_name} account?`)}>
                      Remove
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {can("profiles.update") && !archived && (
            account ? (
              <form
                className="client-account-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  act(async () => {
                    await addBankAccount(id, account);
                    setAccount(null);
                  }, "Account added.");
                }}
              >
                <div className="workflow-form-grid">
                  <label>Bank<input value={account.bankName} onChange={(e) => setAccount({ ...account, bankName: e.target.value })} required /></label>
                  <label>Branch<input value={account.branch} onChange={(e) => setAccount({ ...account, branch: e.target.value })} /></label>
                  <label>Account number<input value={account.accountNumber} onChange={(e) => setAccount({ ...account, accountNumber: e.target.value })} required inputMode="numeric" /></label>
                  <label>IFSC<input value={account.routingCode} onChange={(e) => setAccount({ ...account, routingCode: e.target.value.toUpperCase() })} /></label>
                  <label>Type
                    <select value={account.accountType} onChange={(e) => setAccount({ ...account, accountType: e.target.value })}>
                      {["Current", "Savings", "Cash credit", "Overdraft"].map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                  <label>Account holder<input value={account.holderName} onChange={(e) => setAccount({ ...account, holderName: e.target.value })} /></label>
                </div>
                <div className="bundle-actions">
                  <button type="button" className="secondary-button" onClick={() => setAccount(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Add account</button>
                </div>
              </form>
            ) : (
              <div className="bundle-actions">
                <button type="button" className="secondary-button" onClick={() => setAccount(NEW_ACCOUNT)}>+ Add bank account</button>
              </div>
            )
          )}
        </section>
      )}
    </main>
  );
}

export default ClientDetailPage;
