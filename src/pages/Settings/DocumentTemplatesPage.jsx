import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDocumentTemplates } from "../../api/documents";
import Breadcrumb from "../../components/ui/Breadcrumb";

/*
 * Settings → Document templates: the letters the bundle installed, which
 * version is in use, whether the firm has its own text, and whether the
 * bundle has newer text the firm has not taken.
 */
function DocumentTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocumentTemplates()
      .then(setTemplates)
      .catch((requestError) => setError(requestError.message || "Could not load the templates."));
  }, []);

  return (
    <main className="page settings-sub-page document-templates-page">
      <Breadcrumb onBack={() => navigate("/settings")} backLabel="Settings" section="SETTINGS" title="Document templates" />

      <header className="page-header">
        <div>
          <h1>Document templates</h1>
          <p>The letters your firm issues. Edit a letter's text as your own version; documents already made keep the text they were made from.</p>
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card" aria-label="Templates">
        {!templates ? (
          <div className="settings-empty">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="settings-empty">No document templates. Install a profession bundle that ships letters.</div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr><th>#</th><th>Letter</th><th>Text</th><th>Version</th><th /></tr>
            </thead>
            <tbody>
              {templates.map((template, index) => (
                <tr key={template.key}>
                  <td className="settings-cell-muted">{index + 1}</td>
                  <td>
                    <button type="button" className="link client-name" onClick={() => navigate(`/settings/documents/${template.key}`)}>{template.name}</button>
                    {template.badge && <span className="settings-row-hint">{template.badge}</span>}
                  </td>
                  <td>
                    <span className={`settings-pill${template.customized ? " on" : ""}`}>{template.customized ? "Firm's own" : "From the bundle"}</span>
                    {template.updateAvailable && <span className="client-badge">Bundle {template.updateAvailable} available</span>}
                  </td>
                  <td className="settings-cell-muted">v{template.version}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="link" onClick={() => navigate(`/settings/documents/${template.key}`)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default DocumentTemplatesPage;
