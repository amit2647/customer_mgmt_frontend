import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDocumentTemplates } from "../../api/documents";
import DataGrid from "../../components/ui/DataGrid";
import Pill from "../../components/ui/Pill";

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
    <div className="settings-panel settings-sub-page document-templates-page">

      <header className="page-header settings-panel-header">
        <div>
          <h2>Document templates</h2>
          <p>The letters your firm issues. Edit a letter's text as your own version; documents already made keep the text they were made from.</p>
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!templates ? (
        <section className="card" aria-label="Templates">
          <div className="settings-empty">Loading…</div>
        </section>
      ) : (
        <DataGrid
          id="document-templates"
          label="Templates"
          rows={templates}
          rowKey={(template) => template.key}
          columns={[
            {
              key: "name",
              header: "Letter",
              render: (template) => (
                <>
                  <button type="button" className="link client-name" onClick={() => navigate(`/settings/documents/${template.key}`)}>{template.name}</button>
                  {template.badge && <span className="grid-cell-sub">{template.badge}</span>}
                </>
              ),
            },
            {
              key: "text",
              header: "Text",
              value: (template) => (template.customized ? "Firm's own" : "From the bundle"),
              filter: { tone: (value) => (value === "Firm's own" ? "violet" : "neutral") },
              render: (template) => (
                <div className="grid-pills">
                  <Pill tone={template.customized ? "violet" : "neutral"}>{template.customized ? "Firm's own" : "From the bundle"}</Pill>
                  {template.updateAvailable && <Pill tone="warning">Bundle {template.updateAvailable} available</Pill>}
                </div>
              ),
            },
            { key: "version", header: "Version", align: "right", value: (template) => Number(template.version), render: (template) => <span className="settings-cell-muted">v{template.version}</span> },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (template) => (
                <div className="table-actions">
                  <button type="button" className="link" onClick={() => navigate(`/settings/documents/${template.key}`)}>Edit</button>
                </div>
              ),
            },
          ]}
          empty="No document templates. Install a profession bundle that ships letters."
        />
      )}
    </div>
  );
}

export default DocumentTemplatesPage;
