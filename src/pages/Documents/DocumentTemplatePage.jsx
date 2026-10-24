import { useCallback, useEffect, useRef, useState } from "react";
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
import Pill from "../../components/ui/Pill";
import { useBundle } from "../../context/BundleContext";

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
 *
 * The text is written beside a live preview: "Insert a value" and the
 * formatting buttons write the markup at the cursor, so nobody has to know
 * the placeholder names, and the preview redraws a moment after each change
 * (checked by the server exactly as a save would be).
 */
const FIELD_TYPES = [
  ["text", "Short text"],
  ["paragraph", "Paragraph"],
  ["date", "Date"],
  ["number", "Number"],
];

const NEW_TEXT = "<p>Dear {{client.name}},</p>\n\n<p></p>\n\n<p>Yours faithfully,<br>{{firm.name}}</p>";
const PREVIEW_DELAY_MS = 500;

// How the server names a new field ({{fields.<key>}}); an existing one keeps its key.
const fieldKey = (field) =>
  field.key || String(field.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60).replace(/^(\d)/, "n_$1");

// A field written into the text: dates and amounts through their helpers.
const fieldToken = (key, type) => (type === "date" ? `{{date fields.${key}}}` : `{{fields.${key}}}`);

let nextRow = 0;
const withRow = (field) => ({ ...field, row: (nextRow += 1) });
const ownOf = (data) => ({ name: data.name, service: data.service || "", fields: (data.fieldList || []).map(withRow) });
const sent = (own) => ({ name: own.name, service: own.service || null, fields: own.fields.map(({ key, title, type }) => ({ ...(key ? { key } : {}), title, type })) });

const NEW_TEMPLATE = { name: "", body: NEW_TEXT, firmMade: true, service: null, fieldList: [], versions: [] };

// Formatting buttons: each wraps the selected text (or inserts an empty pair).
const FORMATS = [
  { label: "Paragraph", before: "<p>", after: "</p>\n" },
  { label: "Heading", before: "<h3>", after: "</h3>\n" },
  { label: "Bold", before: "<strong>", after: "</strong>" },
  { label: "Line break", before: "<br>", after: "" },
];

// What "Insert a value" offers, by group. Every token reads a binding the
// server's check allows (client, engagement, firm, signatory, fields, today, period).
function valueGroups(identifiers, letterFields) {
  return [
    {
      label: "Client",
      values: [
        ["Client name", "{{client.name}}"],
        ["Client address", "{{client.address}}"],
        ["Client email", "{{client.email}}"],
        ["Client phone", "{{client.phone}}"],
        ...identifiers.map((identifier) => [`Client ${identifier.label}`, `{{client.identifiers.${identifier.type}}}`]),
        ["Client's signing person", "{{client.signatory.name}}"],
      ],
    },
    {
      label: "Your firm",
      values: [
        ["Firm name", "{{firm.name}}"],
        ["Firm address", "{{firm.address}}"],
        ["Firm city", "{{firm.city}}"],
        ["Firm email", "{{firm.email}}"],
        ["Firm phone", "{{firm.phone}}"],
        ["Firm registration no. (FRN)", "{{firm.frn}}"],
      ],
    },
    {
      label: "Signing partner",
      values: [
        ["Partner name", "{{signatory.name}}"],
        ["Partner designation", "{{signatory.designation}}"],
        ["Membership no.", "{{signatory.membership_no}}"],
      ],
    },
    {
      label: "Year and fees",
      values: [
        ["Year (e.g. 2026-27)", "{{period.label}}"],
        ["Today's date", "{{date today}}"],
        ["Total fee", "{{money engagement.fee_total}}"],
        ["Total expenses", "{{money engagement.expenses_total}}"],
      ],
    },
    ...(letterFields.length ? [{ label: "This letter's fields", values: letterFields.map((field) => [field.title, fieldToken(field.key, field.type)]) }] : []),
  ];
}

function DocumentTemplatePage() {
  const { key } = useParams();
  const isNew = !key;
  const navigate = useNavigate();
  const location = useLocation();
  const { bundle } = useBundle();

  const [template, setTemplate] = useState(isNew ? NEW_TEMPLATE : null);
  const [body, setBody] = useState(isNew ? NEW_TEXT : "");
  const [own, setOwn] = useState(isNew ? ownOf(NEW_TEMPLATE) : null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [preview, setPreview] = useState({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const text = useRef(null);

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

  // The fields as the preview and the insert menu need them.
  const letterFields = own
    ? own.fields.filter((field) => field.title.trim()).map((field) => ({ key: fieldKey(field), title: field.title.trim(), type: field.type }))
    : Object.entries(template?.fields?.properties || {}).map(([field, definition]) => ({
        key: field,
        title: definition.title || field,
        type: definition.format === "date" ? "date" : definition.type === "number" ? "number" : "text",
      }));
  const sentFields = own ? JSON.stringify(sent(own).fields) : null;

  // The live preview: a moment after the last change, and only the latest answer counts.
  useEffect(() => {
    if (!template) return undefined;
    let current = true;

    setPreview((previous) => ({ ...previous, status: "loading" }));
    const timer = setTimeout(() => {
      previewDocument({
        ...(isNew ? {} : { templateKey: key }),
        customerId: clientId || undefined,
        body,
        ...(sentFields ? { fields: JSON.parse(sentFields) } : {}),
      })
        .then((data) => current && setPreview({ status: "ready", data }))
        .catch((requestError) => current && setPreview((previous) => ({ ...previous, status: "error", error: requestError.details?.body || requestError.message || "The preview failed." })));
    }, PREVIEW_DELAY_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [template, isNew, key, clientId, body, sentFields]);

  const changed = Boolean(template) && (body !== template.body || (own && JSON.stringify(sent(own)) !== JSON.stringify(sent(ownOf(template)))));
  const canSave = !busy && changed && !(own && !own.name.trim());

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

  const save = () => {
    if (!canSave) return undefined;
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

  // Ctrl+S / Cmd+S saves; closing the tab with unsaved changes asks first.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!changed) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);

  const leave = () => {
    if (changed && !window.confirm("Leave without saving? Your changes to this letter will be lost.")) return;
    navigate("/documents");
  };

  const remove = () => {
    if (!window.confirm(`Remove "${template.name}"? Letters already made from it are kept.`)) return;
    run(async () => {
      await removeDocumentTemplate(key);
      navigate("/documents");
    });
  };

  const restore = () => {
    if (!window.confirm("Go back to the bundle's text? Your version stays in the history.")) return;
    run(async () => show(await restoreDocumentTemplate(key)), "Restored the bundle's text.");
  };

  const setOwnValue = (name, value) => setOwn((previous) => ({ ...previous, [name]: value }));
  const setField = (row, change) => setOwnValue("fields", own.fields.map((field) => (field.row === row ? { ...field, ...change } : field)));

  // Writes markup at the cursor (wrapping any selection), then puts the cursor after it.
  function write(before, after = "") {
    const area = text.current;
    const start = area ? area.selectionStart : body.length;
    const end = area ? area.selectionEnd : body.length;
    const next = body.slice(0, start) + before + body.slice(start, end) + after + body.slice(end);
    const cursor = end + before.length + (end > start ? after.length : 0);

    setBody(next);
    requestAnimationFrame(() => {
      if (!text.current) return;
      text.current.focus();
      text.current.setSelectionRange(cursor, cursor);
    });
  }

  if (!template) {
    return error ? (
      <PageState icon="!" tone="error" title="Unable to open this template" action={<button type="button" className="primary" onClick={() => navigate("/documents")}>Back to Documents</button>}>
        {error}
      </PageState>
    ) : (
      <FormPageSkeleton className="page settings-sub-page document-template-page" actions={1} />
    );
  }

  const title = isNew ? "New letter" : template.name;
  const groups = valueGroups(bundle?.identifiers || [], letterFields);
  const missing = preview.data?.missing || [];

  return (
    <main className="page settings-sub-page document-template-page">
      <Breadcrumb onBack={leave} backLabel="Documents" section="DOCUMENTS" title={title} />

      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <div className="letter-status">
            {!isNew && <Pill tone="neutral">Version {template.version}</Pill>}
            <Pill tone={template.firmMade || template.customized ? "violet" : "neutral"}>
              {template.firmMade ? "Your firm's own letter" : template.customized ? "Your firm's text" : "The bundle's text"}
            </Pill>
            {template.updateAvailable && <Pill tone="warning">Bundle {template.updateAvailable} has newer text</Pill>}
            {changed && <Pill dot tone="warning">Unsaved changes</Pill>}
          </div>
        </div>

        <div className="document-actions">
          {!template.firmMade && (template.customized || template.updateAvailable) && (
            <button type="button" className="secondary-button" onClick={restore} disabled={busy}>Restore the bundle's text</button>
          )}
          {template.firmMade && !isNew && (
            <button type="button" className="secondary-button danger" onClick={remove} disabled={busy}>Remove letter</button>
          )}
          <button type="button" className="primary" onClick={save} disabled={!canSave} title="Ctrl+S">
            {busy ? "Saving..." : isNew ? "Add letter" : template.firmMade ? "Save" : "Save as firm's version"}
          </button>
        </div>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {own && (
        <section className="card letter-details template-letter-form" aria-label="Letter">
          <label>
            Name
            <input value={own.name} onChange={(e) => setOwnValue("name", e.target.value)} placeholder="e.g. Engagement reminder" maxLength={200} disabled={busy} autoFocus={isNew} />
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

      <div className="letter-editor">
        <div className="letter-editor-side">
          <section className="card letter-text" aria-label="Template">
            <div className="letter-card-head">
              <h3>Letter text</h3>
              <span className="settings-row-hint">Changes show in the preview as you type.</span>
            </div>

            <div className="letter-toolbar" role="toolbar" aria-label="Formatting">
              <select
                className="letter-insert"
                value=""
                onChange={(e) => e.target.value && write(e.target.value)}
                aria-label="Insert a value"
                disabled={busy}
              >
                <option value="">+ Insert a value…</option>
                {groups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.values.map(([label, token]) => <option key={token} value={token}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
              {FORMATS.map((format) => (
                <button key={format.label} type="button" className="secondary-button letter-format" onClick={() => write(format.before, format.after)} disabled={busy}>
                  {format.label}
                </button>
              ))}
            </div>

            <textarea
              ref={text}
              className="template-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              aria-label="Template text"
              rows={20}
            />

            <details className="letter-help">
              <summary>How the text works</summary>
              <ul>
                <li>Values in double braces, such as <code>{"{{client.name}}"}</code>, are filled in for each client. Use <strong>Insert a value</strong> rather than typing them.</li>
                <li>A value the client does not have yet shows as a highlighted gap, and a letter cannot be finalized until every gap is filled.</li>
                <li>Paragraphs are <code>{"<p>…</p>"}</code>; select text and press a formatting button to wrap it.</li>
                <li>Advanced: helpers <code>date</code>, <code>money</code>, <code>upper</code>, <code>fyStart</code>, <code>fyEnd</code>, <code>eq</code>, <code>inList</code>, <code>engaged</code>; blocks <code>#if</code>, <code>#unless</code>, <code>#each</code>, <code>#with</code>.</li>
              </ul>
            </details>
          </section>

          <section className="card document-fields" aria-label="Fields">
            <div className="letter-card-head">
              <h3>This letter's fields</h3>
              <span className="settings-row-hint">Filled in by whoever makes the letter for a client.</span>
            </div>
            {own ? (
              <div className="template-letter-form">
                {own.fields.length === 0 && <p className="settings-row-hint">No fields yet. Add one for anything typed in per letter, such as a reference number.</p>}
                {own.fields.map((field, index) => (
                  <div className="template-field-row" key={field.row}>
                    <input value={field.title} onChange={(e) => setField(field.row, { title: e.target.value })} placeholder="Field name" aria-label={`Field ${index + 1} name`} maxLength={100} disabled={busy} />
                    <select value={field.type} onChange={(e) => setField(field.row, { type: e.target.value })} aria-label={`Field ${index + 1} type`} disabled={busy}>
                      {FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" className="link" onClick={() => fieldKey(field) && write(fieldToken(fieldKey(field), field.type))} aria-label={`Insert field ${index + 1}`} disabled={busy || !fieldKey(field)}>Insert</button>
                    <button type="button" className="link delete-link" onClick={() => setOwnValue("fields", own.fields.filter((other) => other.row !== field.row))} aria-label={`Remove field ${index + 1}`} disabled={busy}>Remove</button>
                    {fieldKey(field) && <code className="template-field-key">{fieldToken(fieldKey(field), field.type)}</code>}
                  </div>
                ))}
                <div>
                  <button type="button" className="secondary-button" onClick={() => setOwnValue("fields", [...own.fields, withRow({ title: "", type: "text" })])} disabled={busy}>Add field</button>
                </div>
              </div>
            ) : letterFields.length === 0 ? (
              <p className="settings-row-hint">This letter has no fields of its own.</p>
            ) : (
              <ul className="template-field-list">
                {letterFields.map((field) => (
                  <li key={field.key}>
                    <span>{field.title}</span>
                    <button type="button" className="link" onClick={() => write(fieldToken(field.key, field.type))} aria-label={`Insert ${field.title}`}>Insert</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isNew && (template.versions || []).length > 0 && (
            <details className="card letter-versions">
              <summary>Versions ({template.versions.length})</summary>
              <ul className="template-field-list">
                {template.versions.map((version) => (
                  <li key={version.id}>
                    <span>v{version.version} · {version.source === "firm" ? "firm" : `bundle ${version.source_version || ""}`} · {formatDate(version.created_at)}</span>
                    {version.is_current && <span className="settings-pill on">In use</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <section className="card letter-preview" aria-label="Preview">
          <div className="letter-card-head">
            <h3>Preview</h3>
            <span className="settings-row-hint" aria-live="polite">
              {preview.status === "loading" ? "Updating…" : preview.status === "error" ? "Not updated" : "Up to date"}
            </span>
          </div>

          <select className="clients-select letter-preview-client" value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Preview with client">
            <option value="">No client — shows every gap</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>

          {preview.status === "error" && <div className="alert alert-error letter-preview-error" role="alert">{preview.error}</div>}

          {missing.length > 0 && (
            <p className="letter-gaps">
              <strong>Gaps ({missing.length}):</strong> {missing.join(", ")}
            </p>
          )}

          {preview.data ? (
            <LetterFrame html={preview.data.html} title={`${title} preview`} />
          ) : (
            <div className="settings-empty">{preview.status === "error" ? "Fix the text to see the letter." : "Loading the preview…"}</div>
          )}
        </section>
      </div>
    </main>
  );
}

export default DocumentTemplatePage;
