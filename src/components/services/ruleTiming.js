/*
 * A deadline rule's timing, for people: in words, and as the editor's fields.
 *
 * A rule (obligation-service, checked by bundle-sdk) is periodic, with a
 * frequency and a schedule — { day, offsetMonths } (the Nth of a month after
 * the month or quarter), { date: "MM-DD" } (after the year) or per-quarter
 * { dates: { Q1… } }. It may carry a condition, { engaged: <service> }, whose
 * schedule applies when that service is also engaged; `else` otherwise.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const monthDay = (value) => {
  const [month, day] = String(value).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

// Which month the day falls in: counted from the month itself, or from the
// last month of the quarter.
export const MONTH_AFTER = {
  monthly: ["the same month", "the next month", "the second month after", "the third month after"],
  quarterly: ["the quarter's last month", "the month after the quarter", "the second month after the quarter", "the third month after the quarter"],
};

function scheduleText(frequency, schedule) {
  if (!schedule) return "";
  if (schedule.dates) return `Quarterly: ${QUARTERS.map((quarter) => monthDay(schedule.dates[quarter])).join(", ")}`;
  if (schedule.date) return `Yearly, ${monthDay(schedule.date)} after the year`;

  const kind = frequency === "quarterly" ? "quarterly" : "monthly";
  const month = MONTH_AFTER[kind][schedule.offsetMonths || 0] || `${schedule.offsetMonths} months later`;
  return `${kind === "quarterly" ? "Quarterly" : "Monthly"}, day ${schedule.day} of ${month}`;
}

// "Monthly, day 11 of the next month" — and the other date, when conditional.
export function describeRule(rule, serviceName = (key) => key.replace(/_/g, " ")) {
  const { schedule, condition, else: otherwise } = rule.definition || {};

  if (!schedule) return rule.kind === "manual" ? "Added by hand" : "Relative to a date on the engagement";

  const frequency = rule.frequency || rule.definition?.frequency;

  if (condition?.engaged && otherwise) {
    return `${scheduleText(frequency, otherwise)}; ${scheduleText(frequency, schedule).replace(/^(Monthly|Quarterly|Yearly),?\s*/, "")} when ${serviceName(condition.engaged)} is engaged`;
  }

  return scheduleText(frequency, schedule);
}

// ---------- The editor's fields ----------

const EMPTY_TIMING = { mode: "day", day: "11", offsetMonths: "1", month: "9", date: "30", dates: { Q1: ["7", "31"], Q2: ["10", "31"], Q3: ["1", "31"], Q4: ["5", "31"] } };

function timingFrom(frequency, schedule) {
  const timing = structuredClone(EMPTY_TIMING);
  if (!schedule) return timing;

  if (schedule.dates) {
    timing.mode = "dates";
    for (const quarter of QUARTERS) {
      const [month, day] = schedule.dates[quarter].split("-").map(Number);
      timing.dates[quarter] = [String(month), String(day)];
    }
  } else if (schedule.date) {
    const [month, day] = schedule.date.split("-").map(Number);
    timing.mode = "date";
    timing.month = String(month);
    timing.date = String(day);
  } else {
    timing.mode = "day";
    timing.day = String(schedule.day);
    timing.offsetMonths = String(schedule.offsetMonths || 0);
  }

  if (frequency === "yearly") timing.mode = "date";
  return timing;
}

const pad = (value) => String(value).padStart(2, "0");

function scheduleFrom(frequency, timing) {
  if (frequency === "yearly") return { date: `${pad(timing.month)}-${pad(timing.date)}` };
  if (frequency === "quarterly" && timing.mode === "dates") {
    return { dates: Object.fromEntries(QUARTERS.map((quarter) => [quarter, `${pad(timing.dates[quarter][0])}-${pad(timing.dates[quarter][1])}`])) };
  }
  return { day: Number(timing.day), offsetMonths: Number(timing.offsetMonths) };
}

// A rule the editor can show, or null when its timing is beyond it
// (relative, manual, or a condition other than "another service engaged").
export function formFromRule(rule) {
  const definition = rule.definition || {};
  const { condition, else: otherwise } = definition;

  if ((rule.kind || definition.kind) !== "periodic") return null;
  if (condition && (!condition.engaged || Object.keys(condition).length !== 1 || !otherwise)) return null;

  const frequency = rule.frequency || definition.frequency;

  return {
    name: rule.name,
    frequency,
    timing: timingFrom(frequency, condition ? otherwise : definition.schedule),
    alternate: condition
      ? { on: true, service: condition.engaged, timing: timingFrom(frequency, definition.schedule) }
      : { on: false, service: "", timing: structuredClone(EMPTY_TIMING) },
  };
}

export function emptyForm() {
  return { name: "", frequency: "monthly", timing: structuredClone(EMPTY_TIMING), alternate: { on: false, service: "", timing: structuredClone(EMPTY_TIMING) } };
}

// What obligation-service takes: name, frequency, schedule, and when the
// alternate date is on, the condition with the usual date as `else`.
export function payloadFrom(form) {
  const usual = scheduleFrom(form.frequency, form.timing);

  if (form.alternate.on && form.alternate.service) {
    return {
      name: form.name.trim(),
      frequency: form.frequency,
      condition: { engaged: form.alternate.service },
      schedule: scheduleFrom(form.frequency, form.alternate.timing),
      else: usual,
    };
  }

  return { name: form.name.trim(), frequency: form.frequency, schedule: usual };
}
