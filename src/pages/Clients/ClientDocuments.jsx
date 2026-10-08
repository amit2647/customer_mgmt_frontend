import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { deleteDocument, getDocuments, getDocumentTemplates } from "../../api/documents";
import { getEngagementTypes, getPeriods } from "../../api/engagements";
import { formatDate } from "../../components/common/Field";
import DataGrid from "../../components/ui/DataGrid";
import Pill from "../../components/ui/Pill";

/*
 * A client's documents for one financial year (CD-12, DOC-09): a tile per
 * letter the bundle ships — faded, with the reason, when it does not apply
 * to this client that year — and the documents already made, drafts and
 * finalized.
 */
function ClientDocuments({ client, can, readOnly }) {
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState("");
  const [tiles, setTiles] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getEngagementTypes()
      .then(async (types) => {
        if (!types[0]) return;
        const offered = await getPeriods(types[0].key);
        setPeriods(offered.periods);
        setPeriod(offered.current || offered.periods.at(-1)?.label || "");
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const load = useCallback(async () => {
    if (!period) return;

    try {
      setError("");
      const [offered, made] = await Promise.all([getDocumentTemplates({ customerId: client.id, period }), getDocuments(client.id, period)]);
      setTiles(offered);
      setDocuments(made);
    } catch (requestError) {
      setError(requestError.message || "Could not load documents.");
    }
  }, [client.id, period]);

  useEffect(() => {
    load();
  }, [load]);

  const canGenerate = can("documents.generate") && !readOnly;

  async function remove(document) {
    if (!window.confirm(`Delete the draft "${document.title}"?`)) return;

    try {
      await deleteDocument(document.id);
      await load();
    } catch (requestError) {
      setError(requestError.message || "The draft was not deleted.");
    }
  }

  return (
    <section className="client-documents" role="tabpanel" aria-label="Documents">
      <div className="compliance-toolbar">
        <label>
          Financial year
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Financial year">
            {periods.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="document-tiles" role="group" aria-label="Letters">
        {(tiles || []).map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`document-tile${tile.enabled ? "" : " disabled"}`}
            disabled={!tile.enabled || !canGenerate}
            title={tile.reason || undefined}
            onClick={() => navigate(`/clients/${client.id}/documents/new?template=${tile.key}&period=${encodeURIComponent(period)}`)}
          >
            <span className="document-tile-top">
              <span className="document-tile-icon" aria-hidden="true">✉</span>
              {tile.badge && <span className="service-badge">{tile.badge}</span>}
            </span>
            <strong>{tile.name}</strong>
            <span className="settings-row-hint">{tile.enabled ? `FY ${period}` : tile.reason}</span>
            {tile.customized && <span className="client-badge">Firm's text</span>}
          </button>
        ))}
      </div>

      <DataGrid
        label="Documents made"
        rows={documents}
        initialSort={{ key: "updated_at", dir: "desc" }}
        columns={[
          {
            key: "title",
            header: "Document",
            render: (document) => (
              <>
                <button type="button" className="link client-name" onClick={() => navigate(`/documents/${document.id}`)}>{document.title}</button>
                <span className="grid-cell-sub">Template version {document.template_version}{document.udin ? ` · UDIN ${document.udin}` : ""}</span>
              </>
            ),
          },
          {
            key: "status",
            header: "Status",
            value: (document) => (document.status === "final" ? "Final" : "Draft"),
            filter: { tone: (value) => (value === "Final" ? "success" : "info") },
            render: (document) => <Pill dot tone={document.status === "final" ? "success" : "info"}>{document.status === "final" ? "Final" : "Draft"}</Pill>,
          },
          { key: "updated_at", header: "Updated", render: (document) => <span className="settings-cell-muted">{formatDate(document.updated_at)}</span> },
          {
            key: "actions",
            header: "",
            sortable: false,
            hideable: false,
            render: (document) => (
              <div className="table-actions">
                <button type="button" className="link" onClick={() => navigate(`/documents/${document.id}`)}>{document.status === "final" ? "View" : "Edit"}</button>
                {canGenerate && document.status === "draft" && (
                  <button type="button" className="link delete-link" onClick={() => remove(document)}>Delete</button>
                )}
              </div>
            ),
          },
        ]}
        empty={`No documents for FY ${period} yet. Choose a letter above to start one.`}
      />
    </section>
  );
}

export default ClientDocuments;
