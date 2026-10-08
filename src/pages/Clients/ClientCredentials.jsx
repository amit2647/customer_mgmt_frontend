import { useCallback, useEffect, useRef, useState } from "react";

import { getCredentials, getReveals, removeCredential, revealCredential, saveCredential } from "../../api/vault";
import { formatDate } from "../../components/common/Field";
import DataGrid from "../../components/ui/DataGrid";
import Pill from "../../components/ui/Pill";

/*
 * A client's portal credentials (CD-10). The fields that are not secret are
 * shown; a stored password is only ever shown after a reveal, with a reason
 * that is recorded, and hides itself again after REVEAL_MS. Nothing secret
 * is kept in this page's state longer than that.
 */

const REVEAL_MS = 30 * 1000;
const MASK = "••••••••";

function ClientCredentials({ client, can, readOnly, onOpenFiles }) {
  const [data, setData] = useState(null);
  const [reveals, setReveals] = useState([]);
  const [editing, setEditing] = useState(null); // { portalKey, values }
  const [revealing, setRevealing] = useState(null); // { portalKey, reason }
  const [shown, setShown] = useState(null); // { portalKey, secrets }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const hideTimer = useRef(null);

  const canReveal = can("vault.reveal");
  const canUpdate = can("vault.update") && !readOnly;

  const load = useCallback(async () => {
    try {
      setData(await getCredentials(client.id));
      if (canReveal) setReveals(await getReveals(client.id));
    } catch (requestError) {
      setError(requestError.message || "Could not load the credentials.");
    }
  }, [client.id, canReveal]);

  useEffect(() => {
    load();
    return () => clearTimeout(hideTimer.current);
  }, [load]);

  async function run(action, done) {
    try {
      setBusy(true);
      setError("");
      setNotice("");
      await action();
      if (done) setNotice(done);
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const save = (event) => {
    event.preventDefault();
    run(async () => {
      setData(await saveCredential(client.id, editing.portalKey, editing.values));
      setEditing(null);
    }, "Credentials saved.");
  };

  const reveal = (event) => {
    event.preventDefault();
    run(async () => {
      const result = await revealCredential(client.id, revealing.portalKey, revealing.reason);
      setShown({ portalKey: result.portal, secrets: result.secrets });
      setRevealing(null);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShown(null), REVEAL_MS);
      if (canReveal) setReveals(await getReveals(client.id));
    });
  };

  const remove = (portal) => {
    if (!window.confirm(`Remove the saved ${portal.name} credentials?`)) return;
    run(async () => setData(await removeCredential(client.id, portal.key)), "Credentials removed.");
  };

  if (!data) {
    return (
      <section className="card" role="tabpanel" aria-label="Credentials">
        <div className="settings-empty">{error || "Loading…"}</div>
      </section>
    );
  }

  const consentMissing = data.consent.category && !data.consent.onFile;

  return (
    <section className="client-credentials" role="tabpanel" aria-label="Credentials">
      {!data.vaultReady && <div className="alert alert-error" role="alert">The vault is not configured on this server, so passwords cannot be stored or shown.</div>}
      {consentMissing && (
        <div className="alert alert-warning">
          Upload the client's signed consent and power of attorney before saving portal credentials.{" "}
          <button type="button" className="link" onClick={onOpenFiles}>Go to Files</button>
        </div>
      )}
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <DataGrid
        label="Portals"
        rows={data.portals}
        rowKey={(portal) => portal.key}
        columns={[
          {
            key: "name",
            header: "Portal",
            render: (portal) => (
              <>
                <span className="grid-cell-title client-name">{portal.name}</span>
                {portal.url && (
                  <a className="grid-cell-sub" href={portal.url} target="_blank" rel="noopener noreferrer">Open portal ↗</a>
                )}
              </>
            ),
          },
          {
            // A portal the client's services call for, still without a login.
            key: "suggested",
            header: "Suggested",
            value: (portal) => (portal.suggested && !portal.credential ? "Suggested" : "Other"),
            filter: { tone: (value) => (value === "Suggested" ? "info" : "neutral") },
            render: (portal) => portal.suggested && !portal.credential && <Pill tone="info">Suggested</Pill>,
          },
          {
            key: "saved",
            header: "Details",
            sortable: false,
            value: (portal) => (portal.credential ? "Saved" : "Not saved"),
            filter: { tone: (value) => (value === "Saved" ? "success" : "neutral") },
            render: (portal) => {
              const credential = portal.credential;
              const secretsShown = shown?.portalKey === portal.key ? shown.secrets : null;

              return credential ? (
                <dl className="credential-fields">
                  {portal.fields.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.secret
                          ? secretsShown?.[field.key] !== undefined
                            ? <code className="credential-secret">{secretsShown[field.key]}</code>
                            : credential.hasSecret ? MASK : "—"
                          : credential.publicFields[field.key] || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <span className="settings-cell-muted">Not saved</span>
              );
            },
          },
          { key: "updated", header: "Updated", value: (portal) => portal.credential?.updatedAt || "", render: (portal) => <span className="settings-cell-muted">{portal.credential ? formatDate(portal.credential.updatedAt) : ""}</span> },
          {
            key: "actions",
            header: "",
            sortable: false,
            hideable: false,
            render: (portal) => {
              const credential = portal.credential;
              const secretsShown = shown?.portalKey === portal.key ? shown.secrets : null;

              return (
                <div className="table-actions">
                  {credential?.hasSecret && canReveal && !secretsShown && (
                    <button type="button" className="link" onClick={() => setRevealing({ portalKey: portal.key, reason: "" })} aria-label={`Reveal ${portal.name} password`}>Reveal</button>
                  )}
                  {secretsShown && <button type="button" className="link" onClick={() => setShown(null)}>Hide</button>}
                  {canUpdate && (
                    <button
                      type="button"
                      className="link"
                      disabled={consentMissing || !data.vaultReady}
                      onClick={() => setEditing({ portalKey: portal.key, values: { ...(credential?.publicFields || {}) } })}
                      aria-label={`${credential ? "Edit" : "Add"} ${portal.name} credentials`}
                    >
                      {credential ? "Edit" : "Add"}
                    </button>
                  )}
                  {credential && canUpdate && (
                    <button type="button" className="link delete-link" onClick={() => remove(portal)} aria-label={`Remove ${portal.name} credentials`}>Remove</button>
                  )}
                </div>
              );
            },
          },
        ]}
        // Editing or revealing opens a form across the row's width.
        expandedRow={(portal) => {
          const credential = portal.credential;

          if (editing?.portalKey === portal.key) {
            return (
              <form className="credential-form" onSubmit={save} aria-label={`${portal.name} credentials`}>
                {portal.fields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <input
                      type={field.secret ? "password" : "text"}
                      autoComplete={field.secret ? "new-password" : "off"}
                      value={editing.values[field.key] || ""}
                      placeholder={field.secret && credential?.hasSecret ? "Leave blank to keep" : ""}
                      onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [field.key]: e.target.value } })}
                    />
                  </label>
                ))}
                <div className="bundle-actions">
                  <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Save</button>
                </div>
              </form>
            );
          }

          if (revealing?.portalKey === portal.key) {
            return (
              <form className="credential-form" onSubmit={reveal} aria-label={`Reveal ${portal.name}`}>
                <label className="credential-reason">
                  Why do you need it? (recorded)
                  <input value={revealing.reason} onChange={(e) => setRevealing({ ...revealing, reason: e.target.value })} placeholder="e.g. Filing GSTR-3B for August" autoFocus required minLength={5} />
                </label>
                <div className="bundle-actions">
                  <button type="button" className="secondary-button" onClick={() => setRevealing(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Reveal for 30 seconds</button>
                </div>
              </form>
            );
          }

          return null;
        }}
      />

      {canReveal && (
        <section className="card credential-log" aria-label="Reveal log">
          <h3>Who revealed what</h3>
          {reveals.length === 0 ? (
            <div className="settings-empty">No password has been revealed for this client.</div>
          ) : (
            <ul className="template-field-list">
              {reveals.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.user_name || `User ${entry.user_id}`}</strong> · {entry.portal_key} · {formatDate(entry.revealed_at)} — {entry.reason}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}

export default ClientCredentials;
