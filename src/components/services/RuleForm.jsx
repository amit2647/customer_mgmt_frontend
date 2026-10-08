import NumberInput from "../ui/NumberInput";
import { MONTHS, MONTH_AFTER, QUARTERS, describeRule, payloadFrom } from "./ruleTiming";

/*
 * One deadline's timing, built from parts rather than typed as a rule:
 * how often, which day, and — optionally — a different date when another
 * service is also engaged (ITR: 31 Oct with a tax audit, 31 Jul without).
 * The server checks the result with bundle-sdk before saving it.
 *
 *   form, onChange           the fields (ruleTiming: emptyForm / formFromRule)
 *   services                 [{ key, name }] for the alternate date's choice
 *   error                    the server's reason, when it refused the rule
 *
 * Fields only: the page puts them in a Modal with its own Save and Cancel.
 */

const FREQUENCIES = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["yearly", "Yearly"],
];

function Timing({ frequency, timing, onChange, label }) {
  const set = (field, value) => onChange({ ...timing, [field]: value });

  if (frequency === "yearly") {
    return (
      <div className="rule-timing" role="group" aria-label={label}>
        <span>Due on</span>
        <NumberInput size="sm" decimals={0} value={timing.date} onChange={(value) => set("date", value)} aria-label={`${label}: day`} className="rule-day" />
        <select className="clients-select" value={timing.month} onChange={(event) => set("month", event.target.value)} aria-label={`${label}: month`}>
          {MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
        </select>
        <span>after the year ends</span>
      </div>
    );
  }

  if (frequency === "quarterly" && timing.mode === "dates") {
    return (
      <div className="rule-timing rule-quarters" role="group" aria-label={label}>
        {QUARTERS.map((quarter) => (
          <span key={quarter} className="rule-quarter">
            <strong>{quarter}</strong>
            <NumberInput size="sm" decimals={0} value={timing.dates[quarter][1]} onChange={(value) => set("dates", { ...timing.dates, [quarter]: [timing.dates[quarter][0], value] })} aria-label={`${label}: ${quarter} day`} className="rule-day" />
            <select className="clients-select" value={timing.dates[quarter][0]} onChange={(event) => set("dates", { ...timing.dates, [quarter]: [event.target.value, timing.dates[quarter][1]] })} aria-label={`${label}: ${quarter} month`}>
              {MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
            </select>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rule-timing" role="group" aria-label={label}>
      <span>Day</span>
      <NumberInput size="sm" decimals={0} value={timing.day} onChange={(value) => set("day", value)} aria-label={`${label}: day`} className="rule-day" />
      <span>of</span>
      <select className="clients-select" value={timing.offsetMonths} onChange={(event) => set("offsetMonths", event.target.value)} aria-label={`${label}: month`}>
        {MONTH_AFTER[frequency === "quarterly" ? "quarterly" : "monthly"].map((text, index) => <option key={text} value={String(index)}>{text}</option>)}
      </select>
    </div>
  );
}

function RuleForm({ form, onChange, services = [], error }) {
  const set = (field, value) => onChange({ ...form, [field]: value });
  const preview = describeRule({ kind: "periodic", frequency: form.frequency, definition: payloadFrom(form) }, (key) => services.find((service) => service.key === key)?.name || key);

  return (
    <div className="rule-form">
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <label className="rule-name">
        Name
        <input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. GSTR-1" required maxLength={200} autoFocus />
      </label>

      <div className="rule-field">
        <span className="rule-label">How often</span>
        <div className="engagement-stage-picker" role="radiogroup" aria-label="How often">
          <div>
            {FREQUENCIES.map(([value, text]) => (
              <label key={value} className={`engagement-stage-option${form.frequency === value ? " selected" : ""}`}>
                <input type="radio" name="rule-frequency" value={value} checked={form.frequency === value} onChange={() => set("frequency", value)} />
                {text}
              </label>
            ))}
          </div>
        </div>
      </div>

      {form.frequency === "quarterly" && (
        <div className="rule-field">
          <span className="rule-label">Due date</span>
          <div className="rule-modes">
            <label className="client-checkbox">
              <input type="radio" name="rule-quarter-mode" checked={form.timing.mode !== "dates"} onChange={() => set("timing", { ...form.timing, mode: "day" })} />
              The same day after every quarter
            </label>
            <label className="client-checkbox">
              <input type="radio" name="rule-quarter-mode" checked={form.timing.mode === "dates"} onChange={() => set("timing", { ...form.timing, mode: "dates" })} />
              A date for each quarter
            </label>
          </div>
        </div>
      )}

      <div className="rule-field">
        {form.frequency !== "quarterly" && <span className="rule-label">Due date</span>}
        <Timing frequency={form.frequency} timing={form.timing} onChange={(timing) => set("timing", timing)} label="Due date" />
      </div>

      <div className="rule-field rule-alternate">
        <label className="client-checkbox">
          <input
            type="checkbox"
            checked={form.alternate.on}
            onChange={(event) => set("alternate", { ...form.alternate, on: event.target.checked, timing: { ...form.timing } })}
          />
          Use a different date when another service is also engaged
        </label>

        {form.alternate.on && (
          <div className="rule-alternate-body">
            <label>
              When this is engaged
              <select className="clients-select" value={form.alternate.service} onChange={(event) => set("alternate", { ...form.alternate, service: event.target.value })} required>
                <option value="">Choose a service…</option>
                {services.map((service) => <option key={service.key} value={service.key}>{service.name}</option>)}
              </select>
            </label>
            <Timing frequency={form.frequency} timing={form.alternate.timing} onChange={(timing) => set("alternate", { ...form.alternate, timing })} label="Other date" />
          </div>
        )}
      </div>

      <p className="rule-preview" aria-live="polite">{preview}</p>
    </div>
  );
}

export default RuleForm;
