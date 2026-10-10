import { useCallback, useEffect, useState } from "react";

import { chooseCustomizedItem, getCustomizedItems } from "../../api/bundles";
import DataGrid from "../../components/ui/DataGrid";
import { GridSkeleton } from "../../components/ui/Skeleton";
import Pill, { toneFor } from "../../components/ui/Pill";

/*
 * Customized items: things the bundle installed that the firm has since
 * edited, while the installed version ships them differently. Upgrades keep
 * the firm's version; here an admin decides per item — take the bundle's
 * (Accept new) or keep theirs (Keep mine: not asked again until a later
 * version changes it). Shows only the fields that differ.
 */

const KIND_LABELS = {
  role: "Role",
  service: "Service",
  package: "Service package",
  template: "Email template",
  automation: "Email automation",
  engagement_type: "Engagement type",
  rule: "Deadline rule",
  document: "Document template",
  portal: "Portal",
};

const show = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
};

const label = (field) => field.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

function differences(mine = {}, theirs = {}) {
  return [...new Set([...Object.keys(mine || {}), ...Object.keys(theirs || {})])]
    .filter((field) => JSON.stringify(mine?.[field] ?? null) !== JSON.stringify(theirs?.[field] ?? null))
    .map((field) => ({ field, mine: mine?.[field], theirs: theirs?.[field] }));
}

function BundleCustomized({ version }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setItems((await getCustomizedItems()).items || []);
    } catch (requestError) {
      setItems([]);
      setError(requestError.message || "Could not read the customized items.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  async function choose(item, choice) {
    const id = `${item.kind}:${item.key}`;

    try {
      setBusy(id);
      setError("");
      setNotice("");
      await chooseCustomizedItem(item, choice);
      setNotice(choice === "accept" ? `${item.name} now has the bundle's version.` : `Your version of ${item.name} is kept.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || "That did not work.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card bundle-customized" aria-label="Customized items">
      <div className="bundle-summary">
        <div>
          <h2>Customized items</h2>
          <span className="settings-row-hint">
            Things you edited that version {version} ships differently. Your version stays until you choose.
          </span>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {items === null ? (
        error ? null : <GridSkeleton embedded label="Customized items" columns={4} rows={3} />
      ) : items.length === 0 ? (
        <div className="settings-empty">Nothing customized: everything matches the installed version.</div>
      ) : (
        <DataGrid
          embedded
          label="Customized item list"
          rows={items}
          rowKey={(item) => `${item.kind}:${item.key}`}
          columns={[
            { key: "name", header: "Item", render: (item) => <span className="grid-cell-title">{item.name}</span> },
            {
              key: "kind",
              header: "Kind",
              value: (item) => KIND_LABELS[item.kind] || item.kind,
              filter: { tone: toneFor },
              render: (item) => <Pill tone={toneFor(KIND_LABELS[item.kind] || item.kind)}>{KIND_LABELS[item.kind] || item.kind}</Pill>,
            },
            {
              key: "diff",
              header: "What differs (yours → the bundle's)",
              sortable: false,
              render: (item) => (
                <ul className="bundle-diff">
                  {differences(item.mine, item.theirs).map((change) => (
                    <li key={change.field}>
                      <span className="settings-cell-muted">{label(change.field)}:</span> {show(change.mine)} → <strong>{show(change.theirs)}</strong>
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (item) => (
                <div className="table-actions">
                  <button type="button" className="link" disabled={Boolean(busy)} onClick={() => choose(item, "accept")} aria-label={`Accept the bundle's ${item.name}`}>
                    Accept new
                  </button>
                  <button type="button" className="link" disabled={Boolean(busy)} onClick={() => choose(item, "dismiss")} aria-label={`Keep my ${item.name}`}>
                    Keep mine
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </section>
  );
}

export default BundleCustomized;
