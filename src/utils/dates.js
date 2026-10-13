/*
 * Every date the app shows is dd/mm/yyyy (12/10/2026), whatever the
 * browser's language. Times keep the browser's own short form.
 *
 *   formatDay(value)       a date-only value ("2026-10-12", a deadline, a
 *                          period end): shown as the date stored, never
 *                          shifted by a time zone
 *   formatDate(value)      the local date of a moment (a timestamp)
 *   formatDateTime(value)  the local date and time of a moment
 *
 * Each returns "" for a missing value; callers that want a dash add it.
 */

const pad = (number) => String(number).padStart(2, "0");

const ddmmyyyy = (day, month, year) => `${pad(day)}/${pad(month)}/${year}`;

export function formatDay(value) {
  if (!value) return "";

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";

  return ddmmyyyy(day, month, year);
}

export function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return ddmmyyyy(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

export function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value) {
  const day = formatDate(value);
  return day ? `${day}, ${formatTime(value)}` : "";
}
