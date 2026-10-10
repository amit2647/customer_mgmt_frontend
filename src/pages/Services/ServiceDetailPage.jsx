import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderSimple, Hash, Info, PencilSimple, Power, Tag } from "@phosphor-icons/react";

import { getService, getServices, updateService } from "../../api/services";
import { getDocumentTemplates } from "../../api/documents";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { DetailPageSkeleton } from "../../components/ui/PageSkeleton";
import DataGrid from "../../components/ui/DataGrid";
import PageState from "../../components/ui/PageState";
import Pill from "../../components/ui/Pill";
import { SettingRow, SettingRows } from "../../components/ui/SettingRow";
import ServiceForm from "../../components/services/ServiceForm";
import ServiceDeadlines from "../../components/services/ServiceDeadlines";

/*
 * One service: what it is, the deadlines its clients get, and the letters
 * that depend on it. Deadlines and letters live here because they are the
 * service's: a rule belongs to a service by key, and a letter whose
 * condition names a service applies only to clients engaged for it.
 */
function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bundle } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);
  const capable = (capability) => (bundle?.capabilities || []).includes(capability);

  const [service, setService] = useState(null);
  const [services, setServices] = useState([]);
  const [letters, setLetters] = useState(null);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setService(await getService(id));
    } catch (requestError) {
      setError(requestError.message || "Could not load the service.");
    }
  }, [id]);

  useEffect(() => {
    load();
    getServices("").then((list) => setServices(Array.isArray(list) ? list : [])).catch(() => setServices([]));
  }, [load]);

  const showLetters = capable("documents") && can("documents.read");

  useEffect(() => {
    if (!showLetters || !service?.key) return;
    getDocumentTemplates().then((all) => setLetters(all.filter((template) => (template.services || []).includes(service.key)))).catch(() => setLetters([]));
  }, [showLetters, service?.key]);

  if (error && !service) {
    return (
      <main className="page record-detail-page service-detail">
        <PageState icon="!" tone="error" title="Unable to open this service" action={<button type="button" className="primary" onClick={() => navigate("/services")}>Back to Services</button>}>
          {error}
        </PageState>
      </main>
    );
  }

  if (!service) return <DetailPageSkeleton className="page record-detail-page service-detail" tabs={3} cards={1} />;

  const active = (service.status || "Active").toLowerCase() === "active";
  const tabs = [
    { id: "overview", label: "Overview" },
    capable("obligations") && can("obligations.read") && service.key && { id: "deadlines", label: "Deadlines" },
    showLetters && { id: "letters", label: "Letters" },
  ].filter(Boolean);

  return (
    <main className="page record-detail-page client-detail service-detail">
      <Breadcrumb onBack={() => navigate("/services")} backLabel="Services" section="SERVICES" title={service.name} />

      <section className="client-hero" aria-label="Service summary">
        <div className="client-hero-top">
          <div className="client-hero-main">
            <div className="client-hero-title">
              <h1>{service.name}</h1>
              <Pill dot tone={active ? "success" : "neutral"}>{service.status || "Active"}</Pill>
            </div>
            <div className="client-hero-meta">
              {service.category && <span><FolderSimple size={15} aria-hidden="true" />{service.category}</span>}
              <span><Tag size={15} aria-hidden="true" />{service.bundle_key ? "From the profession bundle" : "Your firm's service"}</span>
            </div>
          </div>

          <div className="client-hero-actions">
            {can("services.update") && (
              <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
                <PencilSimple size={15} aria-hidden="true" />Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {notice && <div className="alert alert-success">{notice}</div>}

      {tabs.length > 1 && (
        <div className="settings-subtabs client-subtabs" role="tablist">
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {tab === "overview" && (
        <div role="tabpanel" aria-label="Overview">
          <SettingRows label="Service details">
            <SettingRow icon={<Info size={16} />} title="Description" description="Shown when choosing services for a client or prospect" action={<span className="setting-value">{service.description || "—"}</span>} />
            <SettingRow icon={<FolderSimple size={16} />} title="Group" description="Services are grouped by it in the pickers" action={<span className="setting-value">{service.category || "—"}</span>} />
            <SettingRow icon={<Power size={16} />} title="Status" description="An inactive service is kept but no longer offered" action={<Pill dot tone={active ? "success" : "neutral"}>{service.status || "Active"}</Pill>} />
            <SettingRow
              icon={<Hash size={16} />}
              title="Reference"
              description="Its permanent key: deadlines, letters and CSV imports refer to the service by it"
              action={<span className="setting-value">{service.key || "—"}</span>}
            />
          </SettingRows>
        </div>
      )}

      {tab === "deadlines" && <ServiceDeadlines service={service} services={services} canEdit={can("obligations.rules")} />}

      {tab === "letters" && (
        <section role="tabpanel" aria-label="Letters">
          <header className="engagement-tab-head">
            <div>
              <h2>Letters</h2>
              <p>Letters offered only to clients engaged for {service.name}. All letters are under Documents.</p>
            </div>
          </header>
          <DataGrid
            label={`${service.name} letters`}
            rows={letters || []}
            loading={!letters && Boolean(service.key)}
            rowKey={(template) => template.key}
            empty="No letters depend on this service."
            columns={[
              {
                key: "name",
                header: "Letter",
                render: (template) => (
                  <>
                    <span className="grid-cell-title">{template.name}</span>
                    {template.badge && <span className="grid-cell-sub">{template.badge}</span>}
                  </>
                ),
              },
              { key: "version", header: "Text", render: (template) => <Pill tone={template.customized ? "info" : "neutral"}>{template.customized ? "Your wording" : "As shipped"}</Pill> },
              {
                key: "actions",
                header: "",
                sortable: false,
                hideable: false,
                render: (template) =>
                  can("system.settings") && (
                    <div className="table-actions">
                      <button type="button" className="link" onClick={() => navigate(`/documents/templates/${template.key}`)} aria-label={`Edit ${template.name}`}>Edit text</button>
                    </div>
                  ),
              },
            ]}
          />
        </section>
      )}

      {editing && (
        <ServiceForm
          service={service}
          onClose={() => setEditing(false)}
          onSubmit={async (data) => {
            try {
              await updateService(service.id, data);
              setEditing(false);
              setNotice("Service saved.");
              await load();
            } catch (requestError) {
              alert(requestError.message || "Failed to save service.");
            }
          }}
        />
      )}
    </main>
  );
}

export default ServiceDetailPage;
