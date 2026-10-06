import { useCallback, useEffect, useRef, useState } from "react";

import { deleteFile, downloadFile, getFiles, uploadFile } from "../../api/vault";
import { formatDate } from "../../components/common/Field";

/*
 * A client's files (CD-13): drop or choose a file, give it a category, and
 * it is kept in the firm's object store. The signed consent and power of
 * attorney is the category the vault needs before it keeps any password.
 * Files always download; nothing uploaded is opened in the browser.
 */

const MAX_MB = 25;

const sizeOf = (bytes) => {
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

function ClientFiles({ client, can, readOnly }) {
  const [data, setData] = useState(null);
  const [category, setCategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef(null);

  const canUpload = can("files.upload") && !readOnly;

  const load = useCallback(async () => {
    try {
      const loaded = await getFiles(client.id);
      setData(loaded);
      // The signed consent is the first thing a new client needs.
      setCategory((current) => current || (loaded.consent.category && !loaded.consent.onFile ? loaded.consent.category : "general"));
    } catch (requestError) {
      setError(requestError.message || "Could not load the files.");
    }
  }, [client.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(files) {
    const chosen = [...(files || [])];
    if (chosen.length === 0) return;

    const tooLarge = chosen.find((file) => file.size > MAX_MB * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} is larger than ${MAX_MB} MB.`);
      return;
    }

    try {
      setBusy(true);
      setError("");
      setNotice("");
      for (const file of chosen) {
        await uploadFile(client.id, file, category);
      }
      setNotice(chosen.length === 1 ? `${chosen[0].name} uploaded.` : `${chosen.length} files uploaded.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || "The upload did not finish.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(file) {
    if (!window.confirm(`Delete ${file.file_name}? It cannot be recovered.`)) return;

    try {
      setError("");
      await deleteFile(file.id);
      setNotice(`${file.file_name} deleted.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || "The file was not deleted.");
    }
  }

  async function download(file) {
    try {
      setError("");
      await downloadFile(file);
    } catch (requestError) {
      setError(requestError.message || "The file could not be downloaded.");
    }
  }

  if (!data) {
    return (
      <section className="card" role="tabpanel" aria-label="Files">
        <div className="settings-empty">{error || "Loading…"}</div>
      </section>
    );
  }

  const consentCategory = data.consent.category;
  const label = (value) => (value === consentCategory ? "Signed consent & power of attorney" : value === "general" ? "Other document" : value.replace(/_/g, " "));

  return (
    <section className="client-files" role="tabpanel" aria-label="Files">
      {consentCategory && (
        <div className={`alert ${data.consent.onFile ? "alert-success" : "alert-warning"}`}>
          {data.consent.onFile ? "The signed consent and power of attorney is on file." : "No signed consent and power of attorney yet — portal credentials can be saved once it is uploaded."}
        </div>
      )}
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {canUpload && (
        <section
          className={`card file-drop${dragging ? " dragging" : ""}`}
          aria-label="Upload"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            upload(event.dataTransfer.files);
          }}
        >
          <p>Drop files here, or choose them. Up to {MAX_MB} MB each.</p>
          <div className="clients-toolbar">
            <select className="clients-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {consentCategory && <option value={consentCategory}>{label(consentCategory)}</option>}
              <option value="general">{label("general")}</option>
            </select>
            <label className="secondary-button file-choose">
              {busy ? "Uploading…" : "Choose files"}
              <input ref={input} type="file" multiple onChange={(e) => upload(e.target.files)} disabled={busy} aria-label="Choose files" />
            </label>
          </div>
        </section>
      )}

      <section className="card" aria-label="Client files">
        {data.files.length === 0 ? (
          <div className="settings-empty">No files yet.</div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr><th>#</th><th>File</th><th>Category</th><th className="numeric">Size</th><th>Uploaded</th><th /></tr>
            </thead>
            <tbody>
              {data.files.map((file, index) => (
                <tr key={file.id}>
                  <td className="settings-cell-muted">{index + 1}</td>
                  <td>
                    <span className="client-name">{file.file_name}</span>
                    <span className="settings-row-hint" title={file.sha256}>SHA-256 {file.sha256.slice(0, 12)}…</span>
                  </td>
                  <td><span className={`settings-pill${file.category === consentCategory ? " on" : ""}`}>{label(file.category)}</span></td>
                  <td className="numeric">{sizeOf(file.size_bytes)}</td>
                  <td className="settings-cell-muted">{formatDate(file.created_at)}{file.uploaded_by_name ? ` · ${file.uploaded_by_name}` : ""}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="link" onClick={() => download(file)} aria-label={`Download ${file.file_name}`}>Download</button>
                      {can("files.delete") && !readOnly && (
                        <button type="button" className="link delete-link" onClick={() => remove(file)} aria-label={`Delete ${file.file_name}`}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

export default ClientFiles;
