import { useEffect, useMemo, useState } from "react";
import { getServices } from "../../api/services";

const STEPS = [
  {
    id: 1,
    title: "Profile",
    description: "Customer details",
  },
  {
    id: 2,
    title: "Services",
    description: "Assigned services",
  },
  {
    id: 3,
    title: "Review",
    description: "Confirm",
  },
];

const INITIAL_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  segment: "Standard",
  serviceIds: [],
};

function CustomerWorkflow({ customer = null, onSubmit, onClose }) {
  const isEditing = Boolean(customer);

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  /*
   * =========================================================
   * INITIALIZE CUSTOMER
   * =========================================================
   */

  useEffect(() => {
    if (!customer) {
      setForm(INITIAL_FORM);
      setStep(1);
      return;
    }

    setForm({
      name: customer.name || "",
      company: customer.company || "",
      email: customer.email || "",
      phone: customer.phone || "",
      segment: customer.segment || "Standard",
      serviceIds: Array.isArray(customer.services)
        ? customer.services.map((service) => Number(service.id))
        : [],
    });
  }, [customer]);

  /*
   * =========================================================
   * LOAD SERVICES
   * =========================================================
   */

  useEffect(() => {
    async function loadServices() {
      try {
        setLoadingServices(true);

        const data = await getServices();

        setServices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load services:", err);

        setError("Unable to load services.");
      } finally {
        setLoadingServices(false);
      }
    }

    loadServices();
  }, []);

  /*
   * =========================================================
   * ACTIVE SERVICES
   * =========================================================
   */

  const activeServices = useMemo(
    () => services.filter((service) => service.status === "Active"),
    [services],
  );

  const selectedServices = useMemo(
    () =>
      activeServices.filter((service) =>
        form.serviceIds.includes(Number(service.id)),
      ),
    [activeServices, form.serviceIds],
  );

  /*
   * =========================================================
   * UPDATE FIELD
   * =========================================================
   */

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  /*
   * =========================================================
   * TOGGLE SERVICE
   * =========================================================
   */

  function toggleService(serviceId) {
    const id = Number(serviceId);

    setForm((current) => {
      const exists = current.serviceIds.includes(id);

      return {
        ...current,
        serviceIds: exists
          ? current.serviceIds.filter((item) => item !== id)
          : [...current.serviceIds, id],
      };
    });
  }

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  function validateStep(currentStep) {
    setError("");

    if (currentStep === 1) {
      if (!form.name.trim()) {
        setError("Please enter the customer's name.");
        return false;
      }

      if (!form.email.trim()) {
        setError("Please enter an email address.");
        return false;
      }
    }

    return true;
  }

  /*
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length));
  }

  function previousStep() {
    setError("");

    setStep((current) => Math.max(current - 1, 1));
  }

  /*
   * =========================================================
   * SUBMIT
   * =========================================================
   */

  async function handleSubmit() {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await onSubmit({
        ...form,
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        serviceIds: form.serviceIds,
      });
    } catch (err) {
      console.error("Failed to save customer:", err);

      setError(
        err?.message ||
          `Failed to ${isEditing ? "update" : "create"} the customer.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="customer-workflow">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="customer-workflow-header">
        <div>
          <span className="workflow-eyebrow">
            {isEditing ? "CUSTOMER MANAGEMENT" : "CUSTOMER ONBOARDING"}
          </span>

          <h2>{isEditing ? "Edit Customer" : "Create New Customer"}</h2>

          <p>
            {isEditing
              ? "Update customer information and service assignments."
              : "Create a customer profile and assign relevant services."}
          </p>
        </div>
      </div>

      {/* =====================================================
          STEPS
          ===================================================== */}

      <div className="workflow-steps customer-workflow-steps">
        {STEPS.map((item) => {
          const active = step === item.id;
          const completed = step > item.id;

          return (
            <div
              key={item.id}
              className={`workflow-step ${
                active ? "active" : ""
              } ${completed ? "completed" : ""}`}
            >
              <div className="workflow-step-number">
                {completed ? "✓" : item.id}
              </div>

              <div className="workflow-step-content">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="workflow-error">{error}</div>}

      {/* =====================================================
          BODY
          ===================================================== */}

      <div className="workflow-body">
        {/* ===================================================
            STEP 1 — PROFILE
            =================================================== */}

        {step === 1 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 01</span>

              <h3>Customer Profile</h3>

              <p>Capture the customer's primary contact information.</p>
            </div>

            <div className="workflow-form-grid">
              <label>
                Full Name
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Amit Mahorkar"
                  autoFocus
                  required
                />
              </label>

              <label>
                Company
                <input
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </label>

              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </label>

              <label className="workflow-field-full">
                Customer Segment
                <select
                  value={form.segment}
                  onChange={(e) => updateField("segment", e.target.value)}
                >
                  <option>Standard</option>
                  <option>Premium</option>
                  <option>Enterprise</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {/* ===================================================
            STEP 2 — SERVICES
            =================================================== */}

        {step === 2 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 02</span>

              <h3>Assigned Services</h3>

              <p>Select the services associated with this customer.</p>
            </div>

            {loadingServices ? (
              <div className="workflow-loading">
                Loading available services...
              </div>
            ) : activeServices.length === 0 ? (
              <div className="workflow-empty">
                <strong>No active services</strong>

                <span>
                  Create an active service before assigning services to this
                  customer.
                </span>
              </div>
            ) : (
              <div className="workflow-service-grid">
                {activeServices.map((service) => {
                  const selected = form.serviceIds.includes(Number(service.id));

                  return (
                    <button
                      type="button"
                      key={service.id}
                      className={`workflow-service-card ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <div className="workflow-service-check">
                        {selected ? "✓" : ""}
                      </div>

                      <div>
                        <strong>{service.name}</strong>

                        {service.category && <span>{service.category}</span>}

                        {service.description && <p>{service.description}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="workflow-selection-summary">
              <strong>{selectedServices.length}</strong>

              <span>
                {selectedServices.length === 1
                  ? "service selected"
                  : "services selected"}
              </span>
            </div>
          </section>
        )}

        {/* ===================================================
            STEP 3 — REVIEW
            =================================================== */}

        {step === 3 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 03</span>

              <h3>Review Customer</h3>

              <p>Verify the customer information before saving.</p>
            </div>

            <div className="review-grid">
              <div className="review-card">
                <span>CONTACT</span>

                <strong>{form.name || "Unnamed customer"}</strong>

                {form.company && <p>{form.company}</p>}

                <p>{form.email}</p>

                {form.phone && <p>{form.phone}</p>}
              </div>

              <div className="review-card">
                <span>SEGMENT</span>

                <div className="review-status">
                  <strong>{form.segment}</strong>
                </div>
              </div>

              <div className="review-card review-card-full">
                <span>SERVICES</span>

                {selectedServices.length === 0 ? (
                  <p>No services selected</p>
                ) : (
                  <div className="review-services">
                    {selectedServices.map((service) => (
                      <span key={service.id}>{service.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="workflow-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={step === 1 ? onClose : previousStep}
          disabled={submitting}
        >
          {step === 1 ? "Back to Customers" : "← Previous"}
        </button>

        {step < STEPS.length ? (
          <button type="button" className="primary" onClick={nextStep}>
            Continue
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update Customer"
                : "Create Customer"}
          </button>
        )}
      </div>
    </div>
  );
}

export default CustomerWorkflow;
