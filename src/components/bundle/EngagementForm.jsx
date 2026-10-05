import SchemaForm from "./SchemaForm";

/*
 * One engagement as a form: period, appointment and stage, the services
 * engaged with their fees, and the bundle's engagement fields (a CA's AGM
 * date and previous auditor). Used by the wizard and the client's
 * Engagement tab (CD-09).
 *
 * `value`: { period, appointmentOn, stage, attributes, lines: { [serviceId]: { feeAmount, expensesAmount } } }
 * Fees show only with fees.read and are editable only with fees.update.
 */
function EngagementForm({ type, periods, services, value, onChange, profile, canReadFees, canChangeFees, errors = {}, periodLocked = false }) {
  const set = (field, next) => onChange({ ...value, [field]: next });

  const toggle = (serviceId) => {
    const lines = { ...value.lines };

    if (lines[serviceId]) delete lines[serviceId];
    else lines[serviceId] = { feeAmount: "", expensesAmount: "" };

    set("lines", lines);
  };

  const setAmount = (serviceId, field, amount) => set("lines", { ...value.lines, [serviceId]: { ...value.lines[serviceId], [field]: amount } });

  const total = Object.values(value.lines).reduce((sum, line) => sum + Number(line.feeAmount || 0) + Number(line.expensesAmount || 0), 0);

  return (
    <div className="engagement-form">
      <div className="workflow-form-grid">
        <label>
          {type?.period_kind === "calendar_year" ? "Year" : "Financial year"}
          <select value={value.period} onChange={(e) => set("period", e.target.value)} disabled={periodLocked}>
            {periods.map((period) => <option key={period.label} value={period.label}>{period.label}</option>)}
          </select>
          {errors.period && <span className="field-error">{errors.period}</span>}
        </label>

        <label>
          Appointment date
          <input type="date" value={value.appointmentOn || ""} onChange={(e) => set("appointmentOn", e.target.value)} />
        </label>

        {(type?.stages || []).length > 0 && (
          <label>
            Stage
            <select value={value.stage || ""} onChange={(e) => set("stage", e.target.value)}>
              {type.stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="engagement-lines" role="group" aria-label="Services engaged">
        {services.map((service) => {
          const line = value.lines[service.id];

          return (
            <div key={service.id} className={`engagement-line${line ? " selected" : ""}`}>
              <label className="client-checkbox">
                <input type="checkbox" checked={Boolean(line)} onChange={() => toggle(service.id)} />
                {service.name}
              </label>

              {line && canReadFees && (
                <div className="engagement-amounts">
                  <label>
                    Fee
                    <input type="number" min="0" step="0.01" value={line.feeAmount} onChange={(e) => setAmount(service.id, "feeAmount", e.target.value)} disabled={!canChangeFees} aria-label={`Fee for ${service.name}`} />
                  </label>
                  <label>
                    Expenses
                    <input type="number" min="0" step="0.01" value={line.expensesAmount} onChange={(e) => setAmount(service.id, "expensesAmount", e.target.value)} disabled={!canChangeFees} aria-label={`Expenses for ${service.name}`} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canReadFees && total > 0 && (
        <div className="workflow-selection-summary">
          <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(total)}</strong>
          <span>fees and expenses for the period</span>
        </div>
      )}

      <SchemaForm
        schema={profile?.schema}
        uiSchema={profile?.ui}
        formData={value.attributes}
        onChange={(attributes) => set("attributes", attributes)}
        errors={Object.fromEntries(Object.entries(errors).filter(([key]) => !["period", "lines"].includes(key)))}
        idPrefix="engagement"
      />
    </div>
  );
}

// The request body for createEngagement / updateEngagement.
export function engagementPayload(value, { canChangeFees }) {
  return {
    period: value.period,
    appointmentOn: value.appointmentOn || null,
    stage: value.stage || undefined,
    attributes: value.attributes,
    lines: Object.entries(value.lines).map(([serviceId, line]) => ({
      serviceId: Number(serviceId),
      ...(canChangeFees ? { feeAmount: Number(line.feeAmount || 0), expensesAmount: Number(line.expensesAmount || 0) } : {}),
    })),
  };
}

// An engagement from the API back into the form's shape.
export function engagementValue(engagement) {
  return {
    period: engagement.periodLabel,
    appointmentOn: engagement.appointmentOn ? String(engagement.appointmentOn).slice(0, 10) : "",
    stage: engagement.stage || "",
    attributes: engagement.attributes || {},
    lines: Object.fromEntries(
      engagement.lines.map((line) => [line.serviceId, { feeAmount: line.feeAmount ?? "", expensesAmount: line.expensesAmount ?? "" }]),
    ),
  };
}

export default EngagementForm;
