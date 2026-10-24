import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { createService, getService, getServices, updateService } from "../../api/services";
import { useBundle } from "../../context/BundleContext";
import WizardSteps, { goToStep } from "../../components/ui/WizardSteps";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { FormPageSkeleton } from "../../components/ui/PageSkeleton";
import Modal from "../../components/ui/Modal";
import PageState from "../../components/ui/PageState";

/*
 * Add or edit one service, as a wizard on its own page: the service, then a
 * review. Its reference (key) is set by the server when it is added and
 * never changes, so deadlines and letters stay attached through a rename.
 * Opened from a service's own page, it goes back there.
 *
 * The category is picked from a list: the installed bundle's service groups
 * (CA: Audit, Accounting, GST, Compliance, Payroll) and every category the
 * firm's services already use. "Add new category" opens a dialog; the new
 * one joins the list, selected.
 */

const STEPS = [
  { id: 1, title: "Service", description: "Name, category and what it covers" },
  { id: 2, title: "Review", description: "Check and save" },
];

const EMPTY = { name: "", category: "", status: "Active", description: "" };
const NEW_CATEGORY = "__new__";

// The bundle's groups in its own order, then the firm's other categories A–Z.
function categoryOptions(groups, services, added, current) {
  const own = [...new Set([...services.map((service) => (service.category || "").trim()), ...added].filter(Boolean))]
    .filter((category) => !groups.includes(category))
    .sort((a, b) => a.localeCompare(b));
  const options = [...groups, ...own];

  return current && !options.includes(current) ? [...options, current] : options;
}

function ServiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { bundle } = useBundle();

  // Where Cancel and Save return: the service's page when opened from it.
  const back = location.state?.from || "/services";
  const backLabel = back === "/services" ? "Services" : "Service";

  // Set once the service exists, so a retried save updates instead of adding a second.
  const [serviceId, setServiceId] = useState(id ? Number(id) : null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [key, setKey] = useState(null);
  const [services, setServices] = useState([]);
  // Categories added in the dialog, until a saved service uses them.
  const [addedCategories, setAddedCategories] = useState([]);
  const [categoryDialog, setCategoryDialog] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getServices("")
      .then((list) => setServices(Array.isArray(list) ? list : []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (!id) return;

    getService(id)
      .then((service) => {
        setForm({
          name: service.name || "",
          category: service.category || "",
          status: service.status || "Active",
          description: service.description || "",
        });
        setKey(service.key || null);
      })
      .catch((error) => setLoadError(error.message || "Could not load the service."))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const fieldError = (field) => errors[field] && <span className="field-error">{errors[field]}</span>;

  const categories = categoryOptions(bundle?.serviceGroups || [], services, addedCategories, form.category.trim());

  function chooseCategory(value) {
    if (value === NEW_CATEGORY) setCategoryDialog({ name: "", error: "" });
    else update("category", value);
  }

  function addCategory(event) {
    // The dialog's form sits inside the wizard's in React's tree: keep its
    // submit from also running Continue.
    event.stopPropagation();
    const name = categoryDialog.name.trim();

    if (!name) {
      setCategoryDialog({ ...categoryDialog, error: "Name the category" });
      return;
    }

    // An existing category typed again is selected, not added twice.
    const existing = categories.find((category) => category.toLowerCase() === name.toLowerCase());
    if (!existing) setAddedCategories((current) => [...current, name]);
    update("category", existing || name);
    setCategoryDialog(null);
  }

  function validateStep(current) {
    if (current !== 1) return true;

    if (!form.name.trim()) {
      setErrors((existing) => ({ ...existing, name: "Service name is required" }));
      return false;
    }

    return true;
  }

  async function save() {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    const data = {
      name: form.name.trim(),
      category: form.category.trim(),
      status: form.status,
      description: form.description.trim(),
    };

    try {
      setSaving(true);
      setMessage("");

      if (serviceId) {
        await updateService(serviceId, data);
      } else {
        const created = await createService(data);
        setServiceId(created.id);
      }

      navigate(back, { state: { saved: id ? "Service saved." : "Service added. Add its deadlines on the service's own page." } });
    } catch (error) {
      setMessage(error.message || "The service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormPageSkeleton as="div" className="customer-workflow-page client-wizard service-form-page" steps={STEPS.length} />;
  }

  if (loadError) {
    return (
      <PageState icon="!" tone="error" title="Unable to open this service" action={<button type="button" className="primary" onClick={() => navigate("/services")}>Back to Services</button>}>
        {loadError}
      </PageState>
    );
  }

  const title = id ? "Edit service" : "Add service";

  return (
    <div className="customer-workflow-page client-wizard service-form-page">
      <Breadcrumb onBack={() => navigate(back)} backLabel={backLabel} section="SERVICES" title={title} />
      <form
        className="customer-workflow"
        aria-label="Service"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < STEPS.length) {
            if (validateStep(step)) setStep(step + 1);
          } else {
            save();
          }
        }}
      >
        <div className="customer-workflow-header">
          <div>
            <span className="workflow-eyebrow">SERVICES</span>
            <h2>{title}</h2>
            <p>{id ? "Its reference stays the same, so its deadlines and letters stay attached." : "A service your firm offers. Once saved, add its deadlines on the service's own page."}</p>
          </div>
        </div>

        <WizardSteps steps={STEPS} current={step} className="customer-workflow-steps" onSelect={(target) => goToStep(target, { step, validateStep, setStep })} />

        {message && <div className="workflow-error" role="alert">{message}</div>}

        <div className="workflow-body">
          {step === 1 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 01</span>
                <h3>Service</h3>
                <p>What the service is called, the category it is listed under, and what it covers.</p>
              </div>

              <div className="workflow-form-grid">
                <label className="workflow-field-full">
                  Service name
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. GST Returns" autoFocus />
                  {fieldError("name")}
                </label>
                <label>
                  Category
                  <select value={form.category.trim()} onChange={(e) => chooseCategory(e.target.value)}>
                    <option value="">No category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    <option value={NEW_CATEGORY}>+ Add new category…</option>
                  </select>
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label className="workflow-field-full">
                  Description
                  <textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What the service covers" />
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 02</span>
                <h3>Review</h3>
                <p>Check the details, then save.</p>
              </div>

              <div className="review-grid">
                <div className="review-card">
                  <span>SERVICE</span>
                  <strong>{form.name || "Unnamed"}</strong>
                  <p>Category: {form.category.trim() || "—"}</p>
                  {key && <p>Reference: {key}</p>}
                </div>

                <div className="review-card">
                  <span>STATUS</span>
                  <strong>{form.status}</strong>
                  <p>{form.status === "Active" ? "Offered when choosing services" : "Kept, but no longer offered"}</p>
                </div>

                <div className="review-card review-card-full">
                  <span>DESCRIPTION</span>
                  <p>{form.description || "None"}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="workflow-footer">
          <button type="button" className="secondary-button" onClick={() => (step === 1 ? navigate(back) : setStep(step - 1))} disabled={saving}>
            {step === 1 ? "Cancel" : "← Previous"}
          </button>

          {step < STEPS.length ? (
            <button type="submit" className="primary">
              Continue <span>→</span>
            </button>
          ) : (
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving..." : id ? "Save service" : "Add service"}
            </button>
          )}
        </div>

        {categoryDialog && (
          <Modal
            title="Add category"
            description="It joins the list and is chosen for this service."
            size="sm"
            onClose={() => setCategoryDialog(null)}
            onSubmit={addCategory}
            footer={
              <>
                <button type="button" className="secondary-button" onClick={() => setCategoryDialog(null)}>Cancel</button>
                <button type="submit" className="primary">Add category</button>
              </>
            }
          >
            <div className="modal-fields">
              <label>
                Category name
                <input
                  value={categoryDialog.name}
                  onChange={(e) => setCategoryDialog({ name: e.target.value, error: "" })}
                  placeholder="e.g. Advisory"
                  maxLength={100}
                  autoFocus
                />
                {categoryDialog.error && <span className="field-error">{categoryDialog.error}</span>}
              </label>
            </div>
          </Modal>
        )}
      </form>
    </div>
  );
}

export default ServiceFormPage;
