import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { createDocument, deleteDocument, finalizeDocument, getDocument, previewDocument, updateDocument } from "../../api/documents";
import SchemaForm from "../../components/bundle/SchemaForm";
import LetterFrame from "../../components/documents/LetterFrame";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { FormPageSkeleton } from "../../components/ui/PageSkeleton";
import PageState from "../../components/ui/PageState";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";

/*
 * One letter (DOC-10–15). Left: the firm's fixed details (from Settings →
 * Firm) and the letter's own fields, pre-filled from the client and the
 * year's engagement; right: the letter as it will print.
 *
 * - A new letter only previews until it is saved as a draft.
 * - A draft is re-rendered from its own template version each time its
 *   fields are applied, and saved.
 * - Finalizing freezes it (refused while anything is still missing); a final
 *   letter is read-only and can only be printed.
 */
function DocumentEditorPage() {
  const { id, clientId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canGenerate = permissions.includes("documents.generate");

  const templateKey = params.get("template");
  const period = params.get("period") || "";
  const isNew = !id;

  const [doc, setDoc] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(location.state?.saved || "");
  const [udin, setUdin] = useState("");
  const letter = useRef(null);
  const fields = useRef(null);

  // "Save draft" moves from the new-letter route to the draft's, which
  // React renders with this same instance, so take each arrival's notice.
  useEffect(() => {
    if (location.state?.saved) setNotice(location.state.saved);
  }, [location.key, location.state]);

  const show = useCallback((data) => {
    setDoc(data);
    setValues(data.values || data.field_values || {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");

    const loading = isNew
      ? previewDocument({ templateKey, customerId: clientId, period, fieldValues: {} }).then((data) => ({ ...data, customer_id: Number(clientId), period_label: period, status: "new", rendered_html: data.html }))
      : getDocument(id);

    // Only the current load fills the form: a late answer from a cleaned-up
    // effect (StrictMode, or the inputs changed) must not overwrite edits.
    let current = true;

    loading
      .then((data) => current && show(data))
      .catch((requestError) => current && setError(requestError.message || "Could not load the document."))
      .finally(() => current && setLoading(false));

    return () => {
      current = false;
    };
  }, [id, isNew, templateKey, clientId, period, show]);

  async function run(action, done) {
    try {
      setBusy(true);
      setError("");
      setErrors({});
      setNotice("");
      await action();
      if (done) setNotice(done);
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
      setErrors(requestError.details && typeof requestError.details === "object" ? requestError.details : {});
    } finally {
      setBusy(false);
    }
  }

  // DOC-13: apply the fields to the letter (and, for a draft, save them).
  const apply = () =>
    run(async () => {
      if (isNew) {
        const data = await previewDocument({ templateKey, customerId: clientId, period, fieldValues: values });
        setDoc((current) => ({ ...current, ...data, rendered_html: data.html }));
      } else {
        show(await updateDocument(id, values));
      }
    }, isNew ? "" : "Draft saved.");

  const saveDraft = () =>
    run(async () => {
      const created = await createDocument({ templateKey, customerId: clientId, period, fieldValues: values });
      navigate(`/documents/${created.id}`, { replace: true, state: { saved: "Draft saved." } });
    });

  const finalize = () => {
    if (fields.current && !fields.current.validate()) return;
    if (!window.confirm("Finalize this letter? It can't be changed afterwards.")) return;

    run(async () => {
      await updateDocument(id, values);
      show(await finalizeDocument(id, udin.trim().toUpperCase()));
    }, "Finalized.");
  };

  const remove = () => {
    if (!window.confirm("Delete this draft?")) return;
    run(async () => {
      await deleteDocument(id);
      navigate(`/clients/${doc.customer_id}`, { state: { tab: "documents" } });
    });
  };

  const backToClient = () => navigate(`/clients/${doc?.customer_id || clientId}`, { state: { tab: "documents" } });

  if (loading) return <FormPageSkeleton className="page record-detail-page document-editor-page" actions={2} />;

  if (!doc) {
    return (
      <PageState
        icon="!"
        tone="error"
        title="Unable to open this letter"
        action={<button type="button" className="primary" onClick={() => navigate(clientId ? `/clients/${clientId}` : "/clients")}>Back to {term("client", true)}</button>}
      >
        {error}
      </PageState>
    );
  }

  const final = doc.status === "final";
  const editable = canGenerate && !final;
  const name = doc.templateName || doc.name;
  const missing = doc.missing || [];

  return (
    <main className="page record-detail-page document-editor-page">
      <Breadcrumb onBack={backToClient} backLabel={term("client")} section={`FY ${doc.period_label || period}`.toUpperCase()} title={name} />

      <header className="page-header">
        <div>
          <h1>
            {name} {doc.badge && <span className="service-badge">{doc.badge}</span>}
          </h1>
          <p>
            {final ? `Finalized${doc.udin ? ` · UDIN ${doc.udin}` : ""} — kept exactly as issued.` : isNew ? "Not saved yet: fill the fields, preview, then save a draft." : "Draft: changes are saved each time you apply them."}
          </p>
        </div>

        <div className="document-actions">
          <button type="button" className="secondary-button" onClick={() => letter.current?.print()}>Print</button>
          {!final && !isNew && canGenerate && <button type="button" className="secondary-button danger" onClick={remove} disabled={busy}>Delete draft</button>}
          {isNew && canGenerate && <button type="button" className="primary" onClick={saveDraft} disabled={busy}>Save draft</button>}
        </div>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!final && missing.length > 0 && (
        <div className="alert alert-warning">Still to fill: {missing.join(", ")}. A letter can be finalized once nothing is missing.</div>
      )}

      <div className="document-editor">
        <aside className="document-side">
          <section className="card document-firm" aria-label="Firm details">
            <h3>From Settings → Firm</h3>
            <dl>
              <div><dt>Firm</dt><dd>{doc.firm?.name || "—"}</dd></div>
              <div><dt>FRN</dt><dd>{doc.firm?.frn || "—"}</dd></div>
              <div><dt>Signing partner</dt><dd>{doc.signatory?.name || "—"}</dd></div>
              <div><dt>Membership No.</dt><dd>{doc.signatory?.membership_no || "—"}</dd></div>
              <div><dt>City</dt><dd>{doc.firm?.city || "—"}</dd></div>
            </dl>
          </section>

          <section className="card document-fields" aria-label="Letter fields">
            <h3>Letter</h3>
            <SchemaForm ref={fields} schema={doc.fields} uiSchema={doc.ui} formData={values} onChange={setValues} errors={errors} disabled={!editable} idPrefix="letter" />

            {editable && (
              <div className="bundle-actions">
                <button type="button" className="secondary-button" onClick={apply} disabled={busy}>Apply changes</button>
              </div>
            )}

            {!final && !isNew && canGenerate && (
              <div className="document-finalize">
                <label>
                  UDIN (optional)
                  <input value={udin} onChange={(e) => setUdin(e.target.value)} maxLength={18} placeholder="18 letters and digits" />
                </label>
                <button type="button" className="primary" onClick={finalize} disabled={busy || missing.length > 0}>Finalize</button>
              </div>
            )}
          </section>
        </aside>

        <section className="document-preview" aria-label="Preview">
          <p className="settings-row-hint document-print-note">Print on the firm's letterhead. Highlighted [gaps] print highlighted.</p>
          <LetterFrame ref={letter} html={doc.rendered_html} title={name} />
        </section>
      </div>
    </main>
  );
}

export default DocumentEditorPage;
