import { useEffect, useMemo, useState } from "react";
import { getServices } from "../../api/services";

const STEPS = [
  {
    id: 1,
    title: "Capture",
    description: "Lead details",
  },
  {
    id: 2,
    title: "Qualify",
    description: "Opportunity",
  },
  {
    id: 3,
    title: "Services",
    description: "Customer interest",
  },
  {
    id: 4,
    title: "Review",
    description: "Confirm",
  },
];

const INITIAL_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  channel: "Website",
  status: "New",
  score: 50,
  serviceIds: [],
};

function LeadWorkflow({ lead = null, onSubmit, onClose }) {
  const isEditing = Boolean(lead);

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!lead) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm({
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      channel: lead.channel || "Website",
      status: lead.status || "New",
      score: lead.score ?? 50,
      serviceIds: Array.isArray(lead.services)
        ? lead.services.map((service) => Number(service.id))
        : [],
    });
  }, [lead]);

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

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

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

  function validateStep(currentStep) {
    setError("");

    if (currentStep === 1) {
      if (!form.name.trim()) {
        setError("Please enter the lead's name.");
        return false;
      }

      if (!form.email.trim()) {
        setError("Please enter an email address.");
        return false;
      }
    }

    if (currentStep === 2) {
      const score = Number(form.score);

      if (Number.isNaN(score) || score < 0 || score > 100) {
        setError("Lead score must be between 0 and 100.");
        return false;
      }
    }

    return true;
  }

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

  async function handleSubmit() {
    if (!validateStep(4)) {
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
        score: Number(form.score),
        serviceIds: form.serviceIds,
      });
    } catch (err) {
      console.error("Failed to save lead:", err);

      setError(
        err?.message ||
          `Failed to ${isEditing ? "update" : "create"} the lead.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getScoreLabel(score) {
    const value = Number(score);

    if (value >= 80) return "High-quality opportunity";
    if (value >= 60) return "Promising opportunity";
    if (value >= 40) return "Moderate opportunity";

    return "Low-priority opportunity";
  }

  return (
    <div className="lead-workflow">
      <div className="lead-workflow-header">
        <div>
          <span className="workflow-eyebrow">
            {isEditing ? "LEAD MANAGEMENT" : "LEAD INTAKE"}
          </span>

          <h2>{isEditing ? "Edit Lead" : "Create New Lead"}</h2>

          <p>
            {isEditing
              ? "Update lead information and qualification."
              : "Capture and qualify a new business opportunity."}
          </p>
        </div>
      </div>

      <div className="workflow-steps">
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

      <div className="workflow-body">
        {step === 1 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 01</span>
              <h3>Lead Information</h3>
              <p>Tell us who we're working with.</p>
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
                Lead Source
                <select
                  value={form.channel}
                  onChange={(e) => updateField("channel", e.target.value)}
                >
                  <option>Website</option>
                  <option>Phone</option>
                  <option>Email</option>
                  <option>WhatsApp</option>
                  <option>Social</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 02</span>
              <h3>Qualify Opportunity</h3>
              <p>
                Assess where this lead currently sits in the sales pipeline.
              </p>
            </div>

            <div className="qualification-block">
              <div className="qualification-label">
                <div>
                  <strong>Lead Status</strong>
                  <span>Current pipeline stage</span>
                </div>

                <span className="qualification-current">{form.status}</span>
              </div>

              <div className="workflow-status-options">
                {["New", "Contacted", "Qualified", "Lost"].map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={form.status === status ? "selected" : ""}
                    onClick={() => updateField("status", status)}
                  >
                    <span className="status-option-dot" />
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="qualification-block">
              <div className="qualification-label">
                <div>
                  <strong>Lead Score</strong>
                  <span>How promising is this opportunity?</span>
                </div>

                <strong className="score-value">{form.score}</strong>
              </div>

              <input
                className="score-slider"
                type="range"
                min="0"
                max="100"
                value={form.score}
                onChange={(e) => updateField("score", Number(e.target.value))}
              />

              <div className="score-scale">
                <span>Low</span>
                <span>{getScoreLabel(form.score)}</span>
                <span>High</span>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 03</span>
              <h3>Services of Interest</h3>
              <p>Select the services this lead may be interested in.</p>
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
                  lead.
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

        {step === 4 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 04</span>
              <h3>Review Lead</h3>
              <p>Check the information before saving.</p>
            </div>

            <div className="review-grid">
              <div className="review-card">
                <span>CONTACT</span>

                <strong>{form.name || "Unnamed lead"}</strong>

                {form.company && <p>{form.company}</p>}
                <p>{form.email}</p>

                {form.phone && <p>{form.phone}</p>}
              </div>

              <div className="review-card">
                <span>QUALIFICATION</span>

                <div className="review-status">
                  <strong>{form.status}</strong>
                </div>

                <div className="review-score">
                  <strong>{form.score}</strong>
                  <span>Lead score</span>
                </div>
              </div>

              <div className="review-card">
                <span>LEAD SOURCE</span>

                <strong>{form.channel}</strong>
              </div>

              <div className="review-card">
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

      <div className="workflow-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={step === 1 ? onClose : previousStep}
          disabled={submitting}
        >
          {step === 1 ? "Back to Leads" : "← Previous"}
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
                ? "Update Lead"
                : "Create Lead"}
          </button>
        )}
      </div>
    </div>
  );
}

export default LeadWorkflow;
