import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createLead, getLead, updateLead, updateLeadServices, updateProspect } from "../../api/leads";
import { getServices } from "../../api/services";
import { enumLabel, formatDay, formatMoney } from "../../components/bundle/bundleLabels";
import { useBundle } from "../../context/BundleContext";
import WizardSteps from "../../components/ui/WizardSteps";
import ServicePicker from "../../components/ui/ServicePicker";
import PageState from "../../components/ui/PageState";

/*
 * Add or edit one prospect (PROS-01–03) as a wizard, in the same chrome and
 * steps as the client wizard: who they are, the services they asked about,
 * where the conversation stands, then a review. A prospect is a lead row:
 * contact fields and services go through the lead API (services carry over
 * to the client on Convert); stage, quote, meeting and notes through the
 * board's prospect route, which checks them against the bundle.
 */

const STEPS = [
  { id: 1, title: "Contact", description: "Who the prospect is" },
  { id: 2, title: "Services", description: "What they are asking about" },
  { id: 3, title: "Opportunity", description: "Stage, quote and next meeting" },
  { id: 4, title: "Review", description: "Check and save" },
];

const EMPTY = { name: "", email: "", phone: "", constitution: "", serviceIds: [], quotedFee: "", nextMeetingOn: "", notes: "", status: "" };

// Which step a server-side field error belongs to.
const stepOf = (field) => (["status", "quotedFee", "nextMeetingOn", "notes"].includes(field) ? 3 : 1);

function ProspectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bundle, term } = useBundle();

  const columns = bundle?.pipeline || [];
  const leadProfile = bundle?.profiles?.lead;
  const constitutions = leadProfile?.schema?.properties?.constitution?.enum || [];
  const constitutionLabel = (value) => enumLabel(bundle?.profiles?.client || leadProfile, "constitution", value);

  // Set once the lead exists, so a save that failed half-way updates it
  // instead of adding a second one.
  const [leadId, setLeadId] = useState(id ? Number(id) : null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [converted, setConverted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getServices()
      .then((list) => setServices((Array.isArray(list) ? list : list?.services || []).filter((service) => service.status !== "Inactive")))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (!id) return;

    getLead(id)
      .then((lead) => {
        if (lead.status === "Converted") setConverted(lead);

        setForm({
          name: lead.name || "",
          email: lead.email || "",
          phone: lead.phone || "",
          constitution: lead.attributes?.constitution || "",
          serviceIds: (lead.services || []).map((service) => Number(service.id)),
          quotedFee: lead.quoted_fee ?? "",
          nextMeetingOn: lead.next_meeting_on ? String(lead.next_meeting_on).slice(0, 10) : "",
          notes: lead.notes || "",
          status: lead.status || "",
        });
      })
      .catch((error) => setMessage(error.message || "Could not load the prospect."))
      .finally(() => setLoading(false));
  }, [id]);

  // A new prospect starts in the first column.
  const firstStatus = columns[0]?.status;

  useEffect(() => {
    if (!id && firstStatus) setForm((current) => (current.status ? current : { ...current, status: firstStatus }));
  }, [id, firstStatus]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const fieldError = (key) => errors[key] && <span className="field-error">{errors[key]}</span>;

  function validateStep(current) {
    if (current === 1 && !form.name.trim()) {
      setErrors((existing) => ({ ...existing, name: "Name is required" }));
      return false;
    }

    if (current === 3 && form.quotedFee !== "" && Number(form.quotedFee) < 0) {
      setErrors((existing) => ({ ...existing, quotedFee: "The quote cannot be negative" }));
      return false;
    }

    return true;
  }

  function next() {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, STEPS.length));
  }

  async function save() {
    for (const current of [1, 3]) {
      if (!validateStep(current)) {
        setStep(current);
        return;
      }
    }

    const prospect = {
      status: columns.some((column) => column.status === form.status) ? form.status : columns[0]?.status,
      quotedFee: form.quotedFee === "" ? null : Number(form.quotedFee),
      nextMeetingOn: form.nextMeetingOn || null,
      notes: form.notes,
      ...(leadProfile && form.constitution ? { attributes: { constitution: form.constitution } } : {}),
    };
    const contact = { name: form.name, email: form.email, phone: form.phone };

    try {
      setSaving(true);
      setMessage("");
      setErrors({});

      let savedId = leadId;

      if (savedId) {
        await updateLead(savedId, contact);
        await updateLeadServices(savedId, form.serviceIds);
      } else {
        const created = await createLead({ ...contact, channel: "Referral", serviceIds: form.serviceIds });
        savedId = created.id ?? created.lead?.id;
        setLeadId(savedId);
      }

      await updateProspect(savedId, prospect);
      navigate("/prospects", { state: { saved: id ? "Prospect updated." : "Prospect added." } });
    } catch (error) {
      const details = error.details || {};
      const first = Object.keys(details)[0];

      setMessage(error.message || "The prospect could not be saved.");
      setErrors(details);
      if (first) setStep(stepOf(first));
    } finally {
      setSaving(false);
    }
  }

  if (!bundle) {
    return (
      <main className="page prospects-page">
        <div className="settings-empty">The prospect board needs a profession bundle.</div>
      </main>
    );
  }

  if (loading) {
    return (
      <PageState title="Loading prospect" />
    );
  }

  if (converted) {
    return (
      <PageState
        icon="✓"
        title={`${converted.name} is already a ${term("client").toLowerCase()}`}
        action={
          converted.converted_customer_id && (
            <Link className="primary" to={`/clients/${converted.converted_customer_id}`}>Open {term("client").toLowerCase()}</Link>
          )
        }
      >
        A converted prospect is kept as the history of how the {term("client").toLowerCase()} was won.
      </PageState>
    );
  }

  const chosen = services.filter((service) => form.serviceIds.includes(Number(service.id)));
  const stageLabel = columns.find((column) => column.status === form.status)?.label || columns[0]?.label;

  return (
    <div className="customer-workflow-page client-wizard">
      <form
        className="customer-workflow"
        aria-label="Prospect"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < STEPS.length) next();
          else save();
        }}
      >
        <div className="customer-workflow-header">
          <div>
            <span className="workflow-eyebrow">{bundle.name.toUpperCase()}</span>
            <h2>{id ? "Edit prospect" : "Add prospect"}</h2>
            <p>{id ? "Update who they are, what they asked about and where the conversation stands." : `A lead on its way to becoming a ${term("client").toLowerCase()}: who they are, what they need, and where the conversation stands.`}</p>
          </div>
        </div>

        <WizardSteps steps={STEPS} current={step} className="customer-workflow-steps" />

        {message && <div className="workflow-error" role="alert">{message}</div>}

        <div className="workflow-body">
          {step === 1 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 01</span>
                <h3>Contact</h3>
                <p>Who the prospect is.</p>
              </div>

              <div className="workflow-form-grid">
                <label className="workflow-field-full">
                  Name
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus />
                  {fieldError("name")}
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                  {fieldError("email")}
                </label>
                <label>
                  Phone
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  {fieldError("phone")}
                </label>
                {constitutions.length > 0 && (
                  <label>
                    Constitution
                    <select value={form.constitution} onChange={(e) => update("constitution", e.target.value)}>
                      <option value="">—</option>
                      {constitutions.map((value) => <option key={value} value={value}>{constitutionLabel(value)}</option>)}
                    </select>
                    {fieldError("constitution")}
                  </label>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 02</span>
                <h3>Services</h3>
                <p>What the prospect is asking about. They become the {term("client").toLowerCase()}'s services on conversion.</p>
              </div>

              {services.length === 0 && <div className="settings-empty">No services to choose from.</div>}

              <ServicePicker services={services} selected={form.serviceIds} onChange={(ids) => update("serviceIds", ids)} />
            </section>
          )}

          {step === 3 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 03</span>
                <h3>Opportunity</h3>
                <p>Where the conversation stands, and what was quoted.</p>
              </div>

              <div className="workflow-form-grid">
                <label>
                  Stage
                  <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                    {columns.map((column) => <option key={column.key} value={column.status}>{column.label}</option>)}
                  </select>
                  {fieldError("status")}
                </label>
                <label>
                  Quoted fee
                  <input type="number" min="0" value={form.quotedFee} onChange={(e) => update("quotedFee", e.target.value)} />
                  {fieldError("quotedFee")}
                </label>
                <label>
                  Next meeting
                  <input type="date" value={form.nextMeetingOn} onChange={(e) => update("nextMeetingOn", e.target.value)} />
                  {fieldError("nextMeetingOn")}
                </label>
                <label className="workflow-field-full">
                  Notes
                  <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
                </label>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 04</span>
                <h3>Review</h3>
                <p>Check the details, then save.</p>
              </div>

              <div className="review-grid">
                <div className="review-card">
                  <span>CONTACT</span>
                  <strong>{form.name || "Unnamed"}</strong>
                  {form.email && <p>{form.email}</p>}
                  {form.phone && <p>{form.phone}</p>}
                  {form.constitution && <p>{constitutionLabel(form.constitution)}</p>}
                </div>

                <div className="review-card">
                  <span>OPPORTUNITY</span>
                  <strong>{stageLabel}</strong>
                  <p>{form.quotedFee !== "" ? `Quoted ${formatMoney(form.quotedFee)}` : "Nothing quoted yet"}</p>
                  {form.nextMeetingOn && <p>Meeting {formatDay(form.nextMeetingOn)}</p>}
                </div>

                <div className="review-card review-card-full">
                  <span>SERVICES</span>
                  <div className="review-services">
                    {chosen.length === 0 ? <p>None chosen</p> : chosen.map((service) => <span key={service.id}>{service.name}</span>)}
                  </div>
                </div>

                {form.notes && (
                  <div className="review-card review-card-full">
                    <span>NOTES</span>
                    <p>{form.notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="workflow-footer">
          <button type="button" className="secondary-button" onClick={() => (step === 1 ? navigate("/prospects") : setStep(step - 1))} disabled={saving}>
            {step === 1 ? "Cancel" : "← Previous"}
          </button>

          {step < STEPS.length ? (
            <button type="submit" className="primary">
              Continue <span>→</span>
            </button>
          ) : (
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving..." : id ? "Save prospect" : "Add prospect"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ProspectFormPage;
