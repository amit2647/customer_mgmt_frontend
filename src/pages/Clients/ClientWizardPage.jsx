import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { checkIdentifier, createClient, getClient, updateClient, updateClientServices } from "../../api/clients";
import { createEngagement, getEngagementTypes, getPeriods } from "../../api/engagements";
import { getLead } from "../../api/leads";
import { getServices } from "../../api/services";
import EngagementForm, { engagementPayload } from "../../components/bundle/EngagementForm";
import SchemaForm from "../../components/bundle/SchemaForm";
import { formatMoney, identifiersFor, roleLabel } from "../../components/bundle/bundleLabels";
import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import WizardSteps from "../../components/ui/WizardSteps";
import ServicePicker from "../../components/ui/ServicePicker";
import PageState from "../../components/ui/PageState";

/*
 * The client wizard (WIZ-01–15): entity, management, services, bank
 * accounts, review. Everything the bundle defines — fields, identifiers and
 * when they apply, people roles — comes from the installed bundle; the
 * server checks the same rules again on save.
 */

const STEPS = [
  { id: 1, title: "Entity", description: "Who the client is" },
  { id: 2, title: "Management", description: "People and signatory" },
  { id: 3, title: "Services", description: "What you do, and for which year" },
  { id: 4, title: "Bank accounts", description: "Where they bank" },
  { id: 5, title: "Review", description: "Check and save" },
];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  attributes: {},
  identifiers: {},
  people: [],
  serviceIds: [],
  bankAccounts: [],
};

const ACCOUNT_TYPES = ["Current", "Savings", "Cash credit", "Overdraft"];

// Which step a server-side field error belongs to.
function stepOf(field) {
  if (field.startsWith("people")) return 2;
  if (field.startsWith("bankAccounts")) return 4;
  return 1;
}

function ClientWizardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { bundle, term } = useBundle();
  const { user } = useAuth();
  const editing = Boolean(id);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReadFees = permissions.includes("fees.read");
  const canChangeFees = permissions.includes("fees.update");

  // A new client's first engagement (WIZ-08/09), when the bundle has
  // engagements and the person may create them. Existing clients' engagements
  // are edited on their Engagement tab.
  const [engagementType, setEngagementType] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [engagement, setEngagement] = useState({ period: "", appointmentOn: "", stage: "", attributes: {}, lines: {} });

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState([]);
  const [errors, setErrors] = useState({});
  const [taken, setTaken] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  // The prospect a converted client was won from: what it learned (the
  // constitution, the quote) carries into onboarding.
  const [origin, setOrigin] = useState(null);

  const attributesForm = useRef(null);

  const clientProfile = bundle?.profiles?.client;
  const personProfile = bundle?.profiles?.person;
  const identifierRules = useMemo(() => identifiersFor(bundle, form.attributes).filter((rule) => rule.shown), [bundle, form.attributes]);

  useEffect(() => {
    getServices()
      .then((list) => setServices((Array.isArray(list) ? list : list?.services || []).filter((service) => service.status !== "Inactive")))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (editing || !(bundle?.engagementTypes || []).length || !permissions.includes("engagements.update")) return;

    getEngagementTypes()
      .then(async (types) => {
        const type = types[0];
        if (!type) return;

        const offered = await getPeriods(type.key);

        setEngagementType(type);
        setPeriods(offered.periods);
        setEngagement((current) => ({ ...current, period: offered.current || offered.periods.at(-1)?.label || "", stage: type.stages?.[0]?.key || "" }));
      })
      .catch(() => setEngagementType(null));
    // permissions is derived from user; re-run only when the bundle or mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, editing]);

  // Edit mode reloads every field, person and service (WIZ-14).
  useEffect(() => {
    if (!editing) return;

    getClient(id)
      .then((client) => {
        setForm({
          ...EMPTY,
          name: client.name || "",
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          notes: client.notes || "",
          attributes: client.attributes || {},
          identifiers: client.identifiers || {},
          people: (client.people || []).map((person) => ({
            role: person.role,
            name: person.name,
            designation: person.designation || "",
            isSignatory: person.is_signatory,
            attributes: person.attributes || {},
          })),
          serviceIds: (client.services || []).map((service) => Number(service.id)),
        });

        if (params.get("onboarding") && client.source_lead_id && permissions.includes("leads.read")) {
          getLead(client.source_lead_id)
            .then((lead) => {
              setOrigin(lead);

              const constitution = lead.attributes?.constitution;
              if (constitution && !client.attributes?.constitution) {
                setForm((current) => ({ ...current, attributes: { ...current.attributes, constitution } }));
              }
            })
            .catch(() => setOrigin(null));
        }
      })
      .catch((error) => setMessage(error.message || "Could not load the client."))
      .finally(() => setLoading(false));
    // params and permissions only matter on the first load of this client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, id]);

  if (!bundle) {
    return (
      <main className="page clients-page">
        <div className="settings-empty">This screen needs a profession bundle. Install one in Settings, then Profession Bundle.</div>
      </main>
    );
  }

  // A field's error clears as soon as the field changes.
  const clearError = (key) =>
    setErrors((current) => {
      if (!(key in current)) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });

  const update = (field, value) => {
    clearError(field);
    setForm((current) => ({ ...current, [field]: value }));

    // The engagement's lines follow the services ticked on the same step.
    if (field === "serviceIds") {
      setEngagement((current) => ({
        ...current,
        lines: Object.fromEntries(value.map((serviceId) => [serviceId, current.lines[serviceId] || { feeAmount: "", expensesAmount: "" }])),
      }));
    }
  };

  const updateIdentifier = (type, value) => {
    clearError(`identifiers.${type}`);
    setTaken((current) => ({ ...current, [type]: null }));
    setForm((current) => ({ ...current, identifiers: { ...current.identifiers, [type]: value.toUpperCase() } }));
  };

  // Live duplicate check as soon as an identifier is typed in (WIZ-11).
  async function checkTaken(type) {
    const value = form.identifiers[type];

    if (!value) {
      setTaken((current) => ({ ...current, [type]: null }));
      return;
    }

    try {
      const result = await checkIdentifier(type, value, id);
      setTaken((current) => ({ ...current, [type]: result.available ? null : result.customer }));
    } catch {
      setTaken((current) => ({ ...current, [type]: null }));
    }
  }

  function validateStep(current) {
    const found = {};

    if (current === 1) {
      if (!form.name.trim()) found.name = "Name is required";

      for (const rule of identifierRules) {
        const value = form.identifiers[rule.type];

        if (!value && rule.required) found[`identifiers.${rule.type}`] = `${rule.label} is required`;
        else if (value && rule.pattern && !new RegExp(rule.pattern).test(value)) found[`identifiers.${rule.type}`] = `${rule.label} is not in the expected format`;
        else if (taken[rule.type]) found[`identifiers.${rule.type}`] = `Already held by ${taken[rule.type].name}`;
      }

      if (attributesForm.current && !attributesForm.current.validate()) found.attributes = "Some fields need attention";
    }

    if (current === 2) {
      form.people.forEach((person, index) => {
        if (person.name.trim() && !person.role) found[`people[${index}].role`] = "Choose a role";
      });
    }

    if (current === 4) {
      form.bankAccounts.forEach((account, index) => {
        if (!account.bankName.trim()) found[`bankAccounts[${index}].bankName`] = "Bank is required";
        if (!account.accountNumber.trim()) found[`bankAccounts[${index}].accountNumber`] = "Account number is required";
      });
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, STEPS.length));
  }

  async function save() {
    for (const current of [1, 2, 4]) {
      if (!validateStep(current)) {
        setStep(current);
        return;
      }
    }

    const shownTypes = new Set(identifierRules.map((rule) => rule.type));
    const profile = {
      address: form.address,
      notes: form.notes,
      attributes: form.attributes,
      identifiers: Object.fromEntries(Object.entries(form.identifiers).filter(([type, value]) => value && shownTypes.has(type))),
      people: form.people.filter((person) => person.name.trim()),
    };

    try {
      setSaving(true);
      setMessage("");

      if (editing) {
        await updateClient(id, { name: form.name, email: form.email, phone: form.phone, profile });
        await updateClientServices(id, form.serviceIds);
        navigate(`/clients/${id}`, { state: { saved: true } });
      } else {
        const created = await createClient({
          name: form.name,
          email: form.email,
          phone: form.phone,
          serviceIds: form.serviceIds,
          profile: { ...profile, bankAccounts: form.bankAccounts.filter((account) => account.bankName.trim() || account.accountNumber.trim()) },
        });

        // The first engagement is a second request to another service. If it
        // fails the client still exists, and its Engagement tab says why.
        let warning = "";

        if (engagementType && engagement.period) {
          try {
            await createEngagement({ customerId: created.id, typeKey: engagementType.key, ...engagementPayload(engagement, { canChangeFees }) });
          } catch (engagementError) {
            warning = `The client was saved, but its engagement was not: ${engagementError.message}`;
          }
        }

        navigate(`/clients/${created.id}`, { state: { saved: true, warning } });
      }
    } catch (error) {
      setMessage(error.message || "The client could not be saved.");

      if (error.details) {
        setErrors(error.details);
        setStep(Math.min(...Object.keys(error.details).map(stepOf)));
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (key) => errors[key] && <span className="field-error">{errors[key]}</span>;

  const attributeErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => !key.includes(".") && !key.includes("[") && key !== "name" && key !== "attributes"),
  );


  if (loading) {
    return (
      <PageState title={`Loading ${term("client").toLowerCase()}`} />
    );
  }

  return (
    <div className="customer-workflow-page client-wizard">
      <div className="customer-workflow">
        <div className="customer-workflow-header">
          <div>
            <span className="workflow-eyebrow">{bundle.name.toUpperCase()}</span>
            <h2>{editing ? `Edit ${term("client")}` : `Add ${term("client")}`}</h2>
            <p>
              {params.get("onboarding")
                ? "Converted from a prospect — complete the client's details."
                : editing
                  ? "Update the client's details, people and services."
                  : "Capture the entity, its people, the services you provide and where it banks."}
            </p>
          </div>
        </div>

        <WizardSteps steps={STEPS} current={step} className="customer-workflow-steps" />

        {message && <div className="workflow-error" role="alert">{message}</div>}

        <div className="workflow-body">
          {step === 1 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 01</span>
                <h3>Entity</h3>
                <p>Name, constitution and registration details. The identifiers asked for follow the constitution.</p>
              </div>

              <div className="workflow-form-grid">
                <label className="workflow-field-full">
                  Entity name
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus required />
                  {fieldError("name")}
                </label>

                <label>
                  Email
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </label>

                <label>
                  Phone
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </label>

                <label className="workflow-field-full">
                  Address
                  <textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} />
                </label>
              </div>

              <SchemaForm
                ref={attributesForm}
                schema={clientProfile?.schema}
                uiSchema={clientProfile?.ui}
                formData={form.attributes}
                onChange={(attributes) => update("attributes", attributes)}
                errors={attributeErrors}
                idPrefix="client"
              />

              <div className="workflow-form-grid client-identifiers">
                {identifierRules.map((rule) => (
                  <label key={rule.type}>
                    {rule.label}
                    {rule.required && <span className="required-mark"> *</span>}
                    <input
                      value={form.identifiers[rule.type] || ""}
                      onChange={(e) => updateIdentifier(rule.type, e.target.value)}
                      onBlur={() => checkTaken(rule.type)}
                      aria-invalid={Boolean(errors[`identifiers.${rule.type}`])}
                    />
                    {taken[rule.type] && !errors[`identifiers.${rule.type}`] && (
                      <span className="field-error">Already held by {taken[rule.type].archived ? "the archived client " : ""}{taken[rule.type].name}</span>
                    )}
                    {fieldError(`identifiers.${rule.type}`)}
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 02</span>
                <h3>Management</h3>
                <p>The people on this client — rows without a name are left out.</p>
              </div>

              {form.people.length === 0 && <div className="workflow-empty"><span>No people added.</span></div>}

              {form.people.map((person, index) => (
                <div key={index} className="client-person-row">
                  <div className="workflow-form-grid">
                    <label>
                      Role
                      <select
                        value={person.role}
                        onChange={(e) => update("people", form.people.map((item, at) => (at === index ? { ...item, role: e.target.value } : item)))}
                      >
                        <option value="">Choose…</option>
                        {(bundle.peopleRoles || []).map((role) => (
                          <option key={role.key} value={role.key}>{roleLabel(bundle, role.key, form.attributes)}</option>
                        ))}
                      </select>
                      {fieldError(`people[${index}].role`)}
                    </label>

                    <label>
                      Name
                      <input value={person.name} onChange={(e) => update("people", form.people.map((item, at) => (at === index ? { ...item, name: e.target.value } : item)))} />
                    </label>

                    <label>
                      Designation
                      <input value={person.designation} onChange={(e) => update("people", form.people.map((item, at) => (at === index ? { ...item, designation: e.target.value } : item)))} />
                    </label>

                    <label className="client-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(person.isSignatory)}
                        onChange={(e) => update("people", form.people.map((item, at) => (at === index ? { ...item, isSignatory: e.target.checked } : item)))}
                      />
                      Authorised signatory
                    </label>
                  </div>

                  <SchemaForm
                    schema={personProfile?.schema}
                    uiSchema={personProfile?.ui}
                    formData={person.attributes}
                    onChange={(attributes) => update("people", form.people.map((item, at) => (at === index ? { ...item, attributes } : item)))}
                    errors={Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith(`people[${index}].`)).map(([key, value]) => [key.split(".").pop(), value]))}
                    idPrefix={`person${index}`}
                  />

                  <button type="button" className="link delete-link" onClick={() => update("people", form.people.filter((_, at) => at !== index))}>
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="secondary-button"
                onClick={() => update("people", [...form.people, { role: bundle.peopleRoles?.[0]?.key || "", name: "", designation: "", isSignatory: false, attributes: {} }])}
              >
                + Add person
              </button>
            </section>
          )}

          {step === 3 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 03</span>
                <h3>Services</h3>
                <p>The services you provide this client.</p>
                {origin?.quoted_fee !== null && origin?.quoted_fee !== undefined && (
                  <p className="client-origin-quote">Quoted {formatMoney(origin.quoted_fee)} as a prospect — record the fees per service on the Engagement tab.</p>
                )}
              </div>

              <ServicePicker services={services} selected={form.serviceIds} onChange={(ids) => update("serviceIds", ids)} />

              {engagementType && (
                <div className="wizard-engagement">
                  <h4>{engagementType.name}</h4>
                  <EngagementForm
                    type={engagementType}
                    periods={periods}
                    services={services.filter((service) => form.serviceIds.includes(Number(service.id)))}
                    value={engagement}
                    onChange={(next) => {
                      // Unticking a service here unticks it above too.
                      const kept = Object.keys(next.lines).map(Number);
                      if (kept.length !== form.serviceIds.length) update("serviceIds", form.serviceIds.filter((serviceId) => kept.includes(serviceId)));
                      setEngagement(next);
                    }}
                    profile={bundle.profiles?.engagement?.[engagementType.key]}
                    canReadFees={canReadFees}
                    canChangeFees={canChangeFees}
                  />
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 04</span>
                <h3>Bank accounts</h3>
                <p>{editing ? "Bank accounts of an existing client are managed on its Bank accounts tab." : "The first account becomes the primary one."}</p>
              </div>

              {!editing && (
                <>
                  {form.bankAccounts.map((account, index) => {
                    const set = (field, value) => update("bankAccounts", form.bankAccounts.map((item, at) => (at === index ? { ...item, [field]: value } : item)));

                    return (
                      <div key={index} className="client-person-row">
                        <div className="workflow-form-grid">
                          <label>
                            Bank
                            <input value={account.bankName} onChange={(e) => set("bankName", e.target.value)} />
                            {fieldError(`bankAccounts[${index}].bankName`)}
                          </label>
                          <label>
                            Branch
                            <input value={account.branch} onChange={(e) => set("branch", e.target.value)} />
                          </label>
                          <label>
                            Account number
                            <input value={account.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} inputMode="numeric" />
                            {fieldError(`bankAccounts[${index}].accountNumber`)}
                          </label>
                          <label>
                            IFSC
                            <input value={account.routingCode} onChange={(e) => set("routingCode", e.target.value.toUpperCase())} />
                          </label>
                          <label>
                            Type
                            <select value={account.accountType} onChange={(e) => set("accountType", e.target.value)}>
                              {ACCOUNT_TYPES.map((type) => <option key={type}>{type}</option>)}
                            </select>
                          </label>
                          <label>
                            Account holder
                            <input value={account.holderName} onChange={(e) => set("holderName", e.target.value)} />
                          </label>
                        </div>
                        {index === 0 && <span className="settings-pill on">Primary</span>}
                        <button type="button" className="link delete-link" onClick={() => update("bankAccounts", form.bankAccounts.filter((_, at) => at !== index))}>
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => update("bankAccounts", [...form.bankAccounts, { bankName: "", branch: "", accountNumber: "", routingCode: "", accountType: ACCOUNT_TYPES[0], holderName: "" }])}
                  >
                    + Add bank account
                  </button>
                </>
              )}
            </section>
          )}

          {step === 5 && (
            <section className="workflow-panel">
              <div className="workflow-panel-heading">
                <span>STEP 05</span>
                <h3>Review</h3>
                <p>Check the details, then save.</p>
              </div>

              <div className="review-grid">
                <div className="review-card">
                  <span>ENTITY</span>
                  <strong>{form.name || "Unnamed"}</strong>
                  {form.email && <p>{form.email}</p>}
                  {form.address && <p>{form.address}</p>}
                </div>

                <div className="review-card">
                  <span>IDENTIFIERS</span>
                  {identifierRules.filter((rule) => form.identifiers[rule.type]).map((rule) => (
                    <p key={rule.type}>{rule.label}: <strong>{form.identifiers[rule.type]}</strong></p>
                  ))}
                </div>

                <div className="review-card">
                  <span>PEOPLE</span>
                  {form.people.filter((person) => person.name.trim()).map((person, index) => (
                    <p key={index}>{person.name} — {roleLabel(bundle, person.role, form.attributes)}</p>
                  ))}
                </div>

                <div className="review-card review-card-full">
                  <span>SERVICES</span>
                  <div className="review-services">
                    {services.filter((service) => form.serviceIds.includes(Number(service.id))).map((service) => <span key={service.id}>{service.name}</span>)}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="workflow-footer">
          <button type="button" className="secondary-button" onClick={() => (step === 1 ? navigate(editing ? `/clients/${id}` : "/clients") : setStep(step - 1))} disabled={saving}>
            {step === 1 ? "Cancel" : "← Previous"}
          </button>

          {step < STEPS.length ? (
            <button type="button" className="primary" onClick={next}>
              Continue <span>→</span>
            </button>
          ) : (
            <button type="button" className="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : editing ? `Update ${term("client")}` : `Save ${term("client")}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientWizardPage;
