import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getClients } from "../../api/clients";
import { getDocumentTemplate, previewDocument, restoreDocumentTemplate, saveDocumentTemplate } from "../../api/documents";
import { formatDate } from "../../components/common/Field";
import LetterFrame from "../../components/documents/LetterFrame";
import Breadcrumb from "../../components/ui/Breadcrumb";
import PageState from "../../components/ui/PageState";

/*
 * Editing one letter's text as the firm's own version. The text is
 * Handlebars, held to exactly the rules the bundle's own text passed
 * (bundle-sdk templates.check): values are always escaped, no scripts or
 * active markup, only known helpers and fields. Saving adds a version;
 * documents already made keep theirs. "Restore" goes back to the bundle's
 * text — including newer bundle text when an upgrade brought some.
 */
function DocumentTemplatePage() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [body, setBody] = useState("");
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const show = useCallback((data) => {
    setTemplate(data);
    setBody(data.body);
  }, []);

  useEffect(() => {
    getDocumentTemplate(key).then(show).catch((requestError) => setError(requestError.message || "Could not load the template."));
    getClients()
      .then((list) => setClients(Array.isArray(list) ? list : list?.customers || []))
      .catch(() => setClients([]));
  }, [key, show]);

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
      const data = await previewDocument({ templateKey: key, customerId: clientId || undefined, body });
      setPreview(data);
    });

  const save = () => run(async () => show(await saveDocumentTemplate(key, body)), "Saved as your firm's version.");

  const restore = () => {
    if (!window.confirm("Go back to the bundle's text? Your version stays in the history.")) return;
    run(async () => show(await restoreDocumentTemplate(key)), "Restored the bundle's text.");
  };

  if (!template) {
    return error ? (
      <PageState icon="!" tone="error" title="Unable to open this template" action={<button type="button" className="primary" onClick={() => navigate("/settings/documents")}>Back to Document templates</button>}>
        {error}
      </PageState>
    ) : (
      <PageState title="Loading the template" />
    );
  }

  const fieldNames = Object.entries(template.fields?.properties || {});
  const changed = body !== template.body;

  return (
    <main className="page settings-sub-page document-template-page">
      <Breadcrumb onBack={() => navigate("/settings/documents")} backLabel="Document templates" section="SETTINGS" title={template.name} />

      <header className="page-header">
        <div>
          <h1>{template.name}</h1>
          <p>
            Version {template.version} · {template.customized ? "your firm's text" : "the bundle's text"}
            {template.updateAvailable ? ` · bundle ${template.updateAvailable} has newer text` : ""}
          </p>
        </div>

        <div className="document-actions">
          {(template.customized || template.updateAvailable) && (
            <button type="button" className="secondary-button" onClick={restore} disabled={busy}>Restore the bundle's text</button>
          )}
          <button type="button" className="primary" onClick={save} disabled={busy || !changed}>Save as firm's version</button>
        </div>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="document-editor">
        <aside className="document-side">
          <section className="card document-fields" aria-label="Template">
            <h3>Text</h3>
            <textarea className="template-body" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} aria-label="Template text" rows={24} />
            <p className="settings-row-hint">
              Write values as {"{{client.name}}"}, {"{{firm.name}}"}, {"{{fields.reference}}"}; helpers: date, money, upper, fyStart, fyEnd, eq, inList, engaged; blocks: #if, #unless, #each, #with.
            </p>
          </section>

          <section className="card document-fields" aria-label="Fields">
            <h3>This letter's fields</h3>
            <ul className="template-field-list">
              {fieldNames.map(([field, definition]) => (
                <li key={field}><code>{`{{fields.${field}}}`}</code> {definition.title || field}</li>
              ))}
            </ul>
          </section>

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
        </aside>

        <section className="document-preview" aria-label="Preview">
          <div className="clients-toolbar">
            <select className="clients-select" value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Preview with client">
              <option value="">Preview with no client (shows the gaps)</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <button type="button" className="secondary-button" onClick={showPreview} disabled={busy}>Preview</button>
          </div>
          {preview ? <LetterFrame html={preview.html} title={`${template.name} preview`} /> : <div className="card"><div className="settings-empty">Preview the text, as written above, before saving it.</div></div>}
        </section>
      </div>
    </main>
  );
}

export default DocumentTemplatePage;
