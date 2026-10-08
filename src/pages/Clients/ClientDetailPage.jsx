import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowCounterClockwise,
  Buildings,
  CalendarBlank,
  ClockCounterClockwise,
  EnvelopeSimple,
  IdentificationCard,
  Lock,
  LockOpen,
  PencilSimple,
  Phone,
  Trash,
} from "@phosphor-icons/react";

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
import { formatDate } from "../../components/common/Field";
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
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

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

// A label over a read-only value, in a field-shaped box (the Overview cards).
function DetailField({ label, value, href, wide }) {
  const shown = value === undefined || value === null || value === "" ? "—" : value;

  return (
    <div className={`client-field${wide ? " wide" : ""}`}>
      <span className="client-field-label">{label}</span>
      <div className="client-field-value">{href && value ? <a href={href}>{shown}</a> : shown}</div>
    </div>
  );
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
  const primaryIdentifier = shownIdentifiers.find((rule) => client.identifiers?.[rule.type]);
  const signatory = (client.people || []).find((person) => person.is_signatory);

  return (
    <main className="page record-detail-page client-detail">
      <Breadcrumb onBack={() => navigate("/clients")} backLabel={term("client", true)} section={term("client", true).toUpperCase()} title={client.name} />

      <section className="client-hero" aria-label={`${term("client")} summary`}>
        <div className="client-hero-top">
          <div className="client-hero-main">
            <div className="client-hero-title">
              <h1>{client.name}</h1>
              {client.phone && (
                <a className="client-quick" href={`tel:${client.phone}`} aria-label={`Call ${client.phone}`} title={client.phone}>
                  <Phone size={15} />
                </a>
              )}
              {client.email && (
                <a className="client-quick" href={`mailto:${client.email}`} aria-label={`Email ${client.email}`} title={client.email}>
                  <EnvelopeSimple size={15} />
                </a>
              )}
              {locked && <span className="client-badge locked">Locked</span>}
              {archived && <span className="client-badge archived">Archived</span>}
            </div>

            <div className="client-hero-meta">
              {attributes.constitution && (
                <span><Buildings size={15} aria-hidden="true" />{enumLabel(profile, "constitution", attributes.constitution)}</span>
              )}
              {primaryIdentifier && (
                <span><IdentificationCard size={15} aria-hidden="true" />{primaryIdentifier.label} {client.identifiers[primaryIdentifier.type]}</span>
              )}
              <span><CalendarBlank size={15} aria-hidden="true" />Added {formatDate(client.created_at)}</span>
              {client.updated_at && (
                <span><ClockCounterClockwise size={15} aria-hidden="true" />Updated {formatDate(client.updated_at)}</span>
              )}
            </div>

            <dl className="client-hero-facts">
              {attributes.client_type && (
                <div>
                  <dt>Client type</dt>
                  <dd><Pill tone="info">{enumLabel(profile, "client_type", attributes.client_type)}</Pill></dd>
                </div>
              )}
              <div className="client-hero-services">
                <dt>Services</dt>
                <dd className="grid-pills">
                  {(client.services || []).length === 0 && <span className="settings-cell-muted">None yet</span>}
                  {(client.services || []).map((service) => <Pill key={service.id} tone={toneFor(service.name)}>{service.name}</Pill>)}
                </dd>
              </div>
              {signatory && (
                <div>
                  <dt>Signatory</dt>
                  <dd className="client-signatory">
                    <span className="client-signatory-dot" aria-hidden="true">{initials(signatory.name).slice(0, 1)}</span>
                    {signatory.name}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="client-hero-actions">
            {!archived && can("customers.update") && (!locked || can("profiles.lock")) && (
              <button type="button" className="secondary-button" onClick={() => navigate(`/clients/${id}/edit`)} disabled={busy}>
                <PencilSimple size={15} aria-hidden="true" />Edit
              </button>
            )}
            {!archived && can("profiles.lock") && (
              <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => (locked ? unlockClient(id) : lockClient(id)), locked ? "Unlocked." : "Locked — only people who can unlock clients can change it now.")}>
                {locked ? <LockOpen size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
                {locked ? "Unlock" : "Lock"}
              </button>
            )}
            {!archived && can("customers.delete") && (
              <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => archiveClient(id), "Archived. Its records are kept; restore it to work on it again.", `Archive ${client.name}? It leaves every list, and nothing about it is deleted.`)}>
                <Archive size={15} aria-hidden="true" />Archive
              </button>
            )}
            {archived && can("customers.delete") && (
              <button type="button" className="secondary-button" disabled={busy} onClick={() => act(() => restoreClient(id), "Restored.")}>
                <ArrowCounterClockwise size={15} aria-hidden="true" />Restore
              </button>
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
                <Trash size={15} aria-hidden="true" />Delete permanently
              </button>
            )}
          </div>
        </div>

      </section>

      {notice && <div className="alert alert-success">{notice}</div>}
      {location.state?.warning && <div className="alert alert-error" role="alert">{location.state.warning}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="settings-subtabs client-subtabs" role="tablist">
        {TABS.filter((item) => (!item.permission || can(item.permission)) && (!item.needs || (bundle?.capabilities || []).includes(item.needs))).map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="card client-overview" role="tabpanel" aria-label="Overview">
          <section className="client-section" aria-label={`${term("client")} details`}>
            <div className="client-section-heading">
              <span>Profile</span>
              <h2>{term("client")} details</h2>
              <p>Constitution, type and how to reach them. Change any of it with Edit.</p>
            </div>
            <div className="client-fields">
              <DetailField label="Constitution" value={enumLabel(profile, "constitution", attributes.constitution)} />
              {Object.entries(profile?.schema?.properties || {})
                .filter(([field]) => field !== "constitution" && attributes[field] !== undefined && attributes[field] !== "")
                .map(([field, definition]) => (
                  <DetailField key={field} label={definition.title || field} value={enumLabel(profile, field, attributes[field])} />
                ))}
              <DetailField label="Email" value={client.email} href={client.email && `mailto:${client.email}`} />
              <DetailField label="Phone" value={client.phone} href={client.phone && `tel:${client.phone}`} />
            </div>
          </section>

          <section className="client-section" aria-label="Address">
            <div className="client-section-heading">
              <span>Contact</span>
              <h2>Address</h2>
              <p>Where the {term("client").toLowerCase()} is, and when the record was made and last changed.</p>
            </div>
            <div className="client-fields">
              <DetailField wide label="Address" value={client.address} />
              <DetailField label="Added" value={formatDate(client.created_at)} />
              <DetailField label="Last updated" value={client.updated_at ? formatDate(client.updated_at) : ""} />
            </div>
          </section>

          {shownIdentifiers.length > 0 && (
            <section className="client-section" aria-label="Identifiers">
              <div className="client-section-heading">
                <span>Registration</span>
                <h2>Identifiers</h2>
                <p>The registration numbers this constitution asks for.</p>
              </div>
              <div className="client-fields">
                {shownIdentifiers.map((rule) => <DetailField key={rule.type} label={rule.label} value={client.identifiers?.[rule.type]} />)}
              </div>
            </section>
          )}

          <ClientOrigin client={client} can={can} readOnly={archived} onLinked={load} />
        </section>
      )}

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
          <DataGrid
            embedded
            label="People list"
            rows={client.people || []}
            columns={[
              { key: "name", header: "Name", render: (person) => <span className="grid-cell-title">{person.name}</span> },
              {
                key: "role",
                header: "Role",
                value: (person) => roleLabel(bundle, person.role, attributes),
                render: (person) => <Pill tone={toneFor(person.role)}>{roleLabel(bundle, person.role, attributes)}</Pill>,
              },
              { key: "designation", header: "Designation", render: (person) => <span className="settings-cell-muted">{person.designation}</span> },
              {
                key: "details",
                header: "Details",
                sortable: false,
                render: (person) => (
                  <span className="settings-cell-muted">
                    {Object.entries(person.attributes || {})
                      .map(([field, value]) => `${bundle?.profiles?.person?.schema?.properties?.[field]?.title || field}: ${/_on$/.test(field) ? formatDay(value) : value}`)
                      .join(" · ")}
                  </span>
                ),
              },
              { key: "is_signatory", header: "", sortable: false, hideable: false, render: (person) => person.is_signatory && <Pill dot tone="success">Signatory</Pill> },
            ]}
            empty="No people recorded."
          />
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
