import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getDocumentTemplates } from "../../api/documents";
import { useAuth } from "../../context/AuthContext";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

/*
 * Documents: every letter the firm issues — what each depends on (a service
 * engaged, a previous auditor recorded, or every client), whether the firm
 * has its own text, and whether the bundle has newer text. A letter's own
 * service also lists it (Services → a service → Letters). Editing the text
 * needs system.settings; documents already made keep the text they used.
 * With it, "New letter" adds the firm's own letter beside the bundle's.
 */
const EVERY_CLIENT = "Every client";
const textOf = (template) => (template.firmMade ? "Firm's letter" : template.customized ? "Firm's own" : "From the bundle");

function DocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = (user?.permissions || []).includes("system.settings");

  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocumentTemplates()
      .then(setTemplates)
      .catch((requestError) => setError(requestError.message || "Could not load the letters."));
  }, []);

  const open = (template) => navigate(`/documents/templates/${template.key}`);
  const needs = (template) => (template.needs ? template.needs.replace(/^Needs /, "").replace(/ for this year$/, "") : EVERY_CLIENT);

  return (
    <main className="page documents-page document-templates-page">
      <header className="page-header">
        <div>
          <h1>Documents</h1>
          <p>The letters your firm issues and when each is offered. Edit a letter's text as your own version; letters already made keep the text they were made from.</p>
        </div>
        {canEdit && (
          <button type="button" className="primary" onClick={() => navigate("/documents/templates/new")}>+ New letter</button>
        )}
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!templates && error ? null : (
        <DataGrid
          id="documents"
          label="Templates"
          rows={templates || []}
          loading={!templates}
          rowKey={(template) => template.key}
          search={{ placeholder: "Search letters", label: "Search letters" }}
          columns={[
            {
              key: "name",
              header: "Letter",
              render: (template) => (
                <>
                  {canEdit ? (
                    <button type="button" className="link client-name" onClick={() => open(template)}>{template.name}</button>
                  ) : (
                    <span className="grid-cell-title">{template.name}</span>
                  )}
                  {template.badge && <span className="grid-cell-sub">{template.badge}</span>}
                </>
              ),
            },
            {
              key: "needs",
              header: "Offered when",
              value: needs,
              filter: { tone: (value) => (value === EVERY_CLIENT ? "neutral" : toneFor(value)) },
              render: (template) => <Pill tone={template.needs ? toneFor(needs(template)) : "neutral"}>{needs(template)}</Pill>,
            },
            {
              key: "text",
              header: "Text",
              value: textOf,
              filter: { tone: (value) => (value === "From the bundle" ? "neutral" : "violet") },
              render: (template) => (
                <div className="grid-pills">
                  <Pill tone={template.customized ? "violet" : "neutral"}>{textOf(template)}</Pill>
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
              render: (template) =>
                canEdit && (
                  <div className="table-actions">
                    <button type="button" className="link" onClick={() => open(template)}>Edit</button>
                  </div>
                ),
            },
          ]}
          empty={canEdit ? "No letters yet. Add your firm's own with New letter." : "No letters yet."}
        />
      )}
    </main>
  );
}

export default DocumentsPage;
