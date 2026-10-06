import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { downloadImportTemplate, importClients } from "../../api/clients";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { useBundle } from "../../context/BundleContext";

/*
 * Importing clients from CSV (DATA-03, DATA-04): download the template,
 * fill it in, upload it. Every row goes through the same checks as the
 * wizard; the report says what was added, skipped (a PAN or CIN already
 * held) and refused, with the line it came from.
 */
function ClientsImportPage() {
  const navigate = useNavigate();
  const { term } = useBundle();

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  async function run(event) {
    event.preventDefault();
    if (!file) return;

    try {
      setBusy(true);
      setError("");
      setReport(null);
      setReport(await importClients(await file.text()));
    } catch (importError) {
      setError(importError.message || "The import did not finish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page record-detail-page clients-import-page">
      <Breadcrumb onBack={() => navigate("/clients")} backLabel={term("client", true)} section={term("client", true).toUpperCase()} title="Import" />

      <header className="page-header">
        <div>
          <h1>Import {term("client", true).toLowerCase()}</h1>
          <p>Add many {term("client", true).toLowerCase()} at once from a CSV file. Each row is checked exactly as the Add {term("client").toLowerCase()} wizard checks it.</p>
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card import-step" aria-label="Template">
        <h3>1. Get the template</h3>
        <p className="settings-row-hint">Its columns follow your firm's setup. Lines starting with // explain the columns and are ignored.</p>
        <button type="button" className="secondary-button" onClick={() => downloadImportTemplate().catch((templateError) => setError(templateError.message))}>Download template</button>
      </section>

      <form className="card import-step" aria-label="Upload" onSubmit={run}>
        <h3>2. Upload the filled file</h3>
        <div className="clients-toolbar">
          <label className="secondary-button file-choose">
            {file ? file.name : "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="CSV file" />
          </label>
          <button type="submit" className="primary" disabled={!file || busy}>{busy ? "Importing…" : "Import"}</button>
        </div>
      </form>

      {report && (
        <section className="card import-step" aria-label="Import report">
          <h3>3. Result</h3>
          <div className="alert alert-success">
            {report.added} added · {report.skipped.length} skipped · {report.errors.length} refused
          </div>

          {[...report.skipped.map((row) => ({ ...row, kind: "Skipped", why: row.reason })), ...report.errors.map((row) => ({ ...row, kind: "Refused", why: row.error }))].length > 0 && (
            <table className="clients-table">
              <thead>
                <tr><th>Line</th><th>Name</th><th>Outcome</th><th>Why</th></tr>
              </thead>
              <tbody>
                {[...report.skipped.map((row) => ({ ...row, kind: "Skipped", why: row.reason })), ...report.errors.map((row) => ({ ...row, kind: "Refused", why: row.error }))]
                  .sort((a, b) => a.line - b.line)
                  .map((row) => (
                    <tr key={`${row.kind}-${row.line}`}>
                      <td className="settings-cell-muted">{row.line}</td>
                      <td>{row.name || "—"}</td>
                      <td><span className={`deadline-pill ${row.kind === "Skipped" ? "state-due_soon" : "state-overdue"}`}>{row.kind}</span></td>
                      <td className="settings-cell-muted">{row.why}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          <div className="bundle-actions">
            <button type="button" className="secondary-button" onClick={() => navigate("/clients")}>Back to {term("client", true)}</button>
          </div>
        </section>
      )}
    </main>
  );
}

export default ClientsImportPage;
