import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getClients } from "../../api/clients";
import {
  createDocumentTemplate,
  getDocumentTemplate,
  previewDocument,
  removeDocumentTemplate,
  restoreDocumentTemplate,
  saveDocumentTemplate,
} from "../../api/documents";
import { getServices } from "../../api/services";
import { formatDate } from "../../components/common/Field";
import LetterFrame from "../../components/documents/LetterFrame";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { FormPageSkeleton } from "../../components/ui/PageSkeleton";
import PageState from "../../components/ui/PageState";

/*
 * Editing one letter's text as the firm's own version. The text is
 * Handlebars, held to exactly the rules the bundle's own text passed
 * (bundle-sdk templates.check): values are always escaped, no scripts or
 * active markup, only known helpers and fields. Saving adds a version;
 * documents already made keep theirs. "Restore" goes back to the bundle's
 * text — including newer bundle text when an upgrade brought some.
 *
 * With no key (/documents/templates/new) it writes the firm's own letter, one
 * no bundle ships: its name, the service it is offered for, its fields and
 * its text. A firm's own letter keeps all four editable, and can be removed.
 */
const FIELD_TYPES = [
  ["text", "Short text"],
  ["paragraph", "Paragraph"],
  ["date", "Date"],
  ["number", "Number"],
];

const NEW_TEXT = "<p>Dear {{client.name}},</p>\n\n<p></p>\n\n<p>Yours faithfully,<br>{{firm.name}}</p>";

// How the server names a new field ({{fields.<key>}}); an existing one keeps its key.
const fieldKey = (field) =>
  field.key || String(field.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60).replace(/^(\d)/, "n_$1");

let nextRow = 0;
const withRow = (field) => ({ ...field, row: (nextRow += 1) });
const ownOf = (data) => ({ name: data.name, service: data.service || "", fields: (data.fieldList || []).map(withRow) });
const sent = (own) => ({ name: own.name, service: own.service || null, fields: own.fields.map(({ key, title, type }) => ({ ...(key ? { key } : {}), title, type })) });

const NEW_TEMPLATE = { name: "", body: NEW_TEXT, firmMade: true, service: null, fieldList: [], versions: [] };

function DocumentTemplatePage() {
  const { key } = useParams();
  const isNew = !key;
  const navigate = useNavigate();
  const location = useLocation();

  const [template, setTemplate] = useState(isNew ? NEW_TEMPLATE : null);
  const [body, setBody] = useState(isNew ? NEW_TEXT : "");
  const [own, setOwn] = useState(isNew ? ownOf(NEW_TEMPLATE) : null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  const show = useCallback((data) => {
    setTemplate(data);
    setBody(data.body);
    setOwn(data.firmMade ? ownOf(data) : null);
  }, []);

  // A load whose effect was cleaned up (StrictMode runs effects twice; the
  // key can change) is ignored: a late answer must never overwrite text the
  // user has started typing.
  useEffect(() => {
    let current = true;

    if (!isNew) {
      getDocumentTemplate(key)
        .then((data) => current && show(data))
        .catch((requestError) => current && setError(requestError.message || "Could not load the template."));
    }
    getClients()
      .then((list) => current && setClients(Array.isArray(list) ? list : list?.customers || []))
      .catch(() => current && setClients([]));

    return () => {
      current = false;
    };
  }, [key, isNew, show]);

  // The services a firm's own letter can be offered for: those with a catalog key.
  const firmMade = Boolean(template?.firmMade);
  useEffect(() => {
    if (!firmMade) return undefined;
    let current = true;

    getServices()
      .then((list) => current && setServices((Array.isArray(list) ? list : []).filter((service) => service.key)))
      .catch(() => current && setServices([]));

    return () => {
      current = false;
    };
  }, [firmMade]);

  async function run(action, done) {
    try {
      setBusy(true);
      setError("");
      setNotice("");
      await action();
      if (done) setNotice(done);
    } catch (requestError) {
      setError(requestError.details?.body || requestError.message || "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const showPreview = () =>
    run(async () => {
      const data = await previewDocument({
        ...(isNew ? {} : { templateKey: key }),
        customerId: clientId || undefined,
        body,
        ...(own ? { fields: sent(own).fields } : {}),
      });
      setPreview(data);
    });

  const save = () => {
    if (isNew) {
      // The router may keep this page mounted for the new address, or mount it
      // afresh (which reads the notice from the navigation's state).
      const added = "Letter added. It is offered on each client's Documents tab.";
      return run(async () => {
        const created = await createDocumentTemplate({ ...sent(own), body });
        navigate(`/documents/templates/${created.key}`, { replace: true, state: { notice: added } });
      }, added);
    }
    if (own) return run(async () => show(await saveDocumentTemplate(key, { ...sent(own), body })), "Saved.");
    return run(async () => show(await saveDocumentTemplate(key, body)), "Saved as your firm's version.");
  };

  const remove = () => {
    if (!window.confirm(`Remove "${template.name}"? Letters already made from it are kept.`)) return;
    run(async () => {
      await removeDocumentTemplate(key);
      navigate("/documents");
    });
  };

  const setOwnValue = (name, value) => setOwn((previous) => ({ ...previous, [name]: value }));
  const setField = (row, change) => setOwnValue("fields", own.fields.map((field) => (field.row === row ? { ...field, ...change } : field)));

  const restore = () => {
    if (!window.confirm("Go back to the bundle's text? Your version stays in the history.")) return;
    run(async () => show(await restoreDocumentTemplate(key)), "Restored the bundle's text.");
  };

  if (!template) {
    return error ? (
      <PageState icon="!" tone="error" title="Unable to open this template" action={<button type="button" className="primary" onClick={() => navigate("/documents")}>Back to Documents</button>}>
        {error}
      </PageState>
    ) : (
      <FormPageSkeleton className="page settings-sub-page document-template-page" actions={1} />
    );
  }

  const fieldNames = Object.entries(template.fields?.properties || {});
  const changed = body !== template.body || (own && JSON.stringify(sent(own)) !== JSON.stringify(sent(ownOf(template))));
  const title = isNew ? "New letter" : template.name;

  return (
    <main className="page settings-sub-page document-template-page">
      <Breadcrumb onBack={() => navigate("/documents")} backLabel="Documents" section="DOCUMENTS" title={title} />

      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>
            {isNew
              ? "Your firm's own letter. Name it, choose when it is offered, add the fields to fill in, and write its text."
              : template.firmMade
                ? `Version ${template.version} · your firm's own letter`
                : `Version ${template.version} · ${template.customized ? "your firm's text" : "the bundle's text"}`}
            {template.updateAvailable ? ` · bundle ${template.updateAvailable} has newer text` : ""}
          </p>
        </div>

        <div className="document-actions">
          {!template.firmMade && (template.customized || template.updateAvailable) && (
            <button type="button" className="secondary-button" onClick={restore} disabled={busy}>Restore the bundle's text</button>
          )}
          {template.firmMade && !isNew && (
            <button type="button" className="secondary-button" onClick={remove} disabled={busy}>Remove letter</button>
          )}
          <button type="button" className="primary" onClick={save} disabled={busy || !changed || (own && !own.name.trim())}>
            {isNew ? "Add letter" : template.firmMade ? "Save" : "Save as firm's version"}
          </button>
        </div>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="document-editor">
        <aside className="document-side">
          {own && (
            <section className="card document-fields template-letter-form" aria-label="Letter">
              <h3>Letter</h3>
              <label>
                Name
                <input value={own.name} onChange={(e) => setOwnValue("name", e.target.value)} placeholder="Engagement reminder" maxLength={200} disabled={busy} autoFocus={isNew} />
              </label>
              <label>
                Offered when
                <select value={own.service} onChange={(e) => setOwnValue("service", e.target.value)} disabled={busy}>
                  <option value="">Every client</option>
                  {own.service && !services.some((service) => service.key === own.service) && <option value={own.service}>{own.service.replace(/_/g, " ")} engaged</option>}
                  {services.map((service) => <option key={service.key} value={service.key}>{service.name} engaged for the year</option>)}
                </select>
              </label>
            </section>
          )}

          <section className="card document-fields" aria-label="Template">
            <h3>Text</h3>
            <textarea className="template-body" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} aria-label="Template text" rows={24} />
            <p className="settings-row-hint">
              Write values as {"{{client.name}}"}, {"{{firm.name}}"}, {"{{fields.reference}}"}; helpers: date, money, upper, fyStart, fyEnd, eq, inList, engaged; blocks: #if, #unless, #each, #with.
            </p>
          </section>

          <section className="card document-fields" aria-label="Fields">
            <h3>This letter's fields</h3>
            {own ? (
              <div className="template-letter-form">
                {own.fields.length === 0 && <p className="settings-row-hint">No fields yet. Add one for anything typed in per letter, such as a reference number.</p>}
                {own.fields.map((field, index) => (
                  <div className="template-field-row" key={field.row}>
                    <input value={field.title} onChange={(e) => setField(field.row, { title: e.target.value })} placeholder="Field name" aria-label={`Field ${index + 1} name`} maxLength={100} disabled={busy} />
                    <select value={field.type} onChange={(e) => setField(field.row, { type: e.target.value })} aria-label={`Field ${index + 1} type`} disabled={busy}>
                      {FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" className="link" onClick={() => setOwnValue("fields", own.fields.filter((other) => other.row !== field.row))} aria-label={`Remove field ${index + 1}`} disabled={busy}>Remove</button>
                    {fieldKey(field) && <code className="template-field-key">{`{{fields.${fieldKey(field)}}}`}</code>}
                  </div>
                ))}
                <div>
                  <button type="button" className="secondary-button" onClick={() => setOwnValue("fields", [...own.fields, withRow({ title: "", type: "text" })])} disabled={busy}>Add field</button>
                </div>
              </div>
            ) : (
              <ul className="template-field-list">
                {fieldNames.map(([field, definition]) => (
                  <li key={field}><code>{`{{fields.${field}}}`}</code> {definition.title || field}</li>
                ))}
              </ul>
            )}
          </section>

          {!isNew && (
            <section className="card document-fields" aria-label="Versions">
              <h3>Versions</h3>
              <ul className="template-field-list">
                {(template.versions || []).map((version) => (
                  <li key={version.id}>
                    v{version.version} · {version.source === "firm" ? "firm" : `bundle ${version.source_version || ""}`} · {formatDate(version.created_at)}
                    {version.is_current && <span className="settings-pill on">In use</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section className="document-preview" aria-label="Preview">
          <div className="clients-toolbar">
            <select className="clients-select" value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Preview with client">
              <option value="">Preview with no client (shows the gaps)</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <button type="button" className="secondary-button" onClick={showPreview} disabled={busy}>Preview</button>
          </div>
          {preview ? <LetterFrame html={preview.html} title={`${title} preview`} /> : <div className="card"><div className="settings-empty">Preview the text, as written above, before saving it.</div></div>}
        </section>
      </div>
    </main>
  );
}

export default DocumentTemplatePage;
