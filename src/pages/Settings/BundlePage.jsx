import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { getBundles, installBundle, upgradeBundle } from "../../api/bundles";
import BundleCustomized from "./BundleCustomized";
import { useBundle } from "../../context/BundleContext";
import DataGrid from "../../components/ui/DataGrid";
import { CardSkeleton } from "../../components/ui/Skeleton";
import Pill from "../../components/ui/Pill";

const STEP_LABELS = {
  permissions: "Permissions",
  roles: "Role templates",
  catalog: "Services and packages",
  engagementTypes: "Engagement types",
  obligations: "Deadline rules",
  documents: "Document templates",
  vault: "Portals",
  email: "Reminder emails",
  help: "Assistant help",
};

const STATUS_LABELS = {
  installed: "Installed",
  installing: "Installing",
  upgrading: "Upgrading",
  failed: "Stopped",
  done: "Done",
  pending: "Waiting",
};

// Whether x.y.z version `a` is later than `b`.
function isNewer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    if ((pa[index] || 0) !== (pb[index] || 0)) return (pa[index] || 0) > (pb[index] || 0);
  }

  return false;
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";
}

/*
 * Settings → Bundle: set the workspace up for a profession.
 *
 * One bundle per organization. Installing runs one step per part of the
 * product (roles, services, emails…); a step that fails stops the install,
 * and installing again resumes where it stopped.
 */
function BundlePage() {
  // First-run setup lands here when installing its bundle stopped part-way.
  const setupBundleError = useLocation().state?.setupBundleError;
  const { refresh } = useBundle();

  const [offered, setOffered] = useState([]);
  const [installed, setInstalled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getBundles();

      setOffered(data?.bundles ?? []);
      setInstalled(data?.installed ?? null);
    } catch (requestError) {
      setError(requestError.message || "Failed to load bundles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInstall(bundle, resuming = false) {
    if (
      !resuming &&
      !window.confirm(
        `Install ${bundle.name} ${bundle.version}?\n\nIt adds its services, role templates and reminder emails to this workspace. An organization has one bundle, and it cannot be removed in this version.`,
      )
    ) {
      return;
    }

    try {
      setBusyKey(bundle.key);
      setError("");
      setSuccess("");

      await installBundle(bundle.key);

      // The navigation and screens follow the installed bundle at once.
      await refresh();

      setSuccess(`${bundle.name} is installed. Its reminder emails are switched off until you turn them on in Email Automations.`);
    } catch (requestError) {
      setError(requestError.message || "The install did not finish.");
    } finally {
      setBusyKey("");
      await load();
    }
  }

  async function handleUpgrade(version) {
    if (
      !installed.upgrade &&
      !window.confirm(
        `Upgrade ${installed.name} from ${installed.version} to ${version}?\n\nNew items are added and items you have not edited move to the new version. Anything you edited is kept, with the newer version offered beside it.`,
      )
    ) {
      return;
    }

    try {
      setBusyKey(installed.key);
      setError("");
      setSuccess("");

      await upgradeBundle(installed.key);
      await refresh();

      setSuccess(`${installed.name} is upgraded to ${version}.`);
    } catch (requestError) {
      setError(requestError.message || "The upgrade did not finish.");
    } finally {
      setBusyKey("");
      await load();
    }
  }

  const unfinished = installed && installed.status !== "installed";

  // A newer version of the installed bundle, or an upgrade that stopped part-way.
  const newer = installed && offered.find((bundle) => bundle.key === installed.key && isNewer(bundle.version, installed.version));
  const upgradeTo = installed?.upgrade?.version || newer?.version;

  return (
    <div className="settings-panel settings-sub-page bundle-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Profession Bundle</h2>

          <p>
            Set this workspace up for a profession: its services, role templates,
            client fields and reminder emails. Anything a bundle installs can be
            edited, and your edits are kept when a newer version arrives.
          </p>
        </div>
      </div>

      {setupBundleError && !success && (
        <div className="alert alert-warning" role="status">
          Setup is complete, but installing the profession bundle stopped: {setupBundleError}. Resume it below.
        </div>
      )}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <CardSkeleton label="Profession bundle" lines={3} />
      ) : installed ? (
        <section className="card bundle-installed" aria-label="Installed bundle">
          <div className="bundle-summary">
            <div>
              <h2>
                {installed.name} <span className="settings-cell-muted">{installed.version}</span>
              </h2>

              <span className="settings-row-hint">
                {installed.status === "installed"
                  ? `Installed ${formatDate(installed.installedAt)}`
                  : "The install did not finish. Installing again resumes where it stopped."}
              </span>
            </div>

            <span className={`settings-pill${installed.status === "installed" ? " on" : ""}`}>
              {STATUS_LABELS[installed.status] || installed.status}
            </span>
          </div>

          <DataGrid
            embedded
            label="Install steps"
            rows={installed.steps}
            rowKey={(step) => step.step}
            columns={[
              {
                key: "step",
                header: "Step",
                // The install order, not the alphabet.
                sortable: false,
                render: (step) => (
                  <>
                    <span className="grid-cell-title">{STEP_LABELS[step.step] || step.step}</span>
                    {step.error && <span className="grid-cell-sub settings-cell-warning">{step.error}</span>}
                  </>
                ),
              },
              {
                key: "status",
                header: "Status",
                sortable: false,
                render: (step) => (
                  <Pill dot tone={step.status === "done" ? "success" : step.status === "failed" ? "danger" : "neutral"}>
                    {STATUS_LABELS[step.status] || step.status}
                  </Pill>
                ),
              },
              { key: "attempts", header: "Attempts", align: "right", sortable: false },
            ]}
          />

          {!unfinished && upgradeTo && (
            <div className="bundle-upgrade" aria-label="Upgrade">
              <p>
                <strong>{installed.upgrade ? `The upgrade to ${upgradeTo} did not finish.` : `Version ${upgradeTo} is available.`}</strong>{" "}
                {installed.upgrade
                  ? `${installed.version} is still in use. Upgrading again resumes where it stopped.`
                  : "Upgrading adds what is new; anything you have edited is kept."}
              </p>

              {installed.upgrade && (
                <ul className="bundle-upgrade-steps">
                  {installed.upgrade.steps.map((step) => (
                    <li key={step.step}>
                      {STEP_LABELS[step.step] || step.step}: {STATUS_LABELS[step.status] || step.status}
                      {step.error && <span className="settings-row-hint settings-cell-warning">{step.error}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="bundle-actions">
                <button type="button" className="button button-primary" disabled={Boolean(busyKey)} onClick={() => handleUpgrade(upgradeTo)}>
                  {busyKey ? "Upgrading..." : installed.upgrade ? `Resume upgrade to ${upgradeTo}` : `Upgrade to ${upgradeTo}`}
                </button>
              </div>
            </div>
          )}

          {unfinished && (
            <div className="bundle-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={Boolean(busyKey)}
                onClick={() => handleInstall({ key: installed.key, name: installed.name, version: installed.version }, true)}
              >
                {busyKey ? "Installing..." : "Resume install"}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* Only once a version is fully in place: it compares against that version. */}
      {!loading && installed?.status === "installed" && !installed.upgrade && <BundleCustomized version={installed.version} />}

      {loading || installed ? null : offered.length === 0 ? (
        <section className="card">
          <div className="settings-empty">This deployment offers no bundles.</div>
        </section>
      ) : (
        <section className="bundle-offers">
          {offered.map((bundle) => (
            <article key={bundle.key} className="card bundle-offer">
              <div className="bundle-summary">
                <div>
                  <h2>
                    {bundle.name} <span className="settings-cell-muted">{bundle.version}</span>
                  </h2>

                  {bundle.description && <p>{bundle.description}</p>}
                </div>
              </div>

              <ul className="bundle-contents">
                <li>{bundle.contents.services} services and {bundle.contents.packages} packages</li>
                {bundle.contents.roles.length > 0 && <li>Role templates: {bundle.contents.roles.join(", ")}</li>}
                {bundle.contents.emails > 0 && <li>{bundle.contents.emails} reminder emails, switched off</li>}
              </ul>

              <div className="bundle-actions">
                <button
                  type="button"
                  className="button button-primary"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleInstall(bundle)}
                >
                  {busyKey === bundle.key ? "Installing..." : `Install ${bundle.name}`}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default BundlePage;
