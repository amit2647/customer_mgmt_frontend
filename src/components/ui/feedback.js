/*
 * The product's messages, instead of the browser's alert() and confirm():
 *
 *   toast.success(text)   a result that went well ("Saved.")
 *   toast.error(text)     a result that failed, with the reason
 *   toast.info(text)      anything else worth a passing note
 *
 *   await confirmAction({ title, message, confirmLabel, danger })
 *                         our own dialog; resolves true when confirmed
 *
 * Both are plain functions over one small store, so any page, component or
 * event handler can call them without a hook. <FeedbackHost> (mounted once,
 * in App) draws the toasts in the top-right corner and the open dialog.
 *
 * Messages that describe a page rather than report an event (a field's
 * error, a "still to fill" warning, a page that could not load) stay in the
 * page; see docs/ui-style-guide.md.
 */

const DURATION_MS = { success: 4000, info: 5000, error: 8000 };
// How long a toast takes to slide away (toast.css's toast-out) before it is removed.
export const EXIT_MS = 220;
const MAX_TOASTS = 5;

let toasts = [];
let dialog = null;
let nextId = 0;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const snapshot = () => ({ toasts, dialog });

function show(tone, message) {
  if (!message) return null;
  nextId += 1;
  const id = nextId;
  const text = typeof message === "string" ? message : message.message || String(message);

  // The same message twice in a row restarts the first rather than stacking.
  toasts = [...toasts.filter((item) => !(item.tone === tone && item.text === text && !item.leaving)), { id, tone, text, duration: DURATION_MS[tone] }].slice(-MAX_TOASTS);
  emit();
  return id;
}

// A dismissed toast first plays its exit, then leaves the list.
export function dismiss(id) {
  if (!toasts.some((item) => item.id === id && !item.leaving)) return;
  toasts = toasts.map((item) => (item.id === id ? { ...item, leaving: true } : item));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
  }, EXIT_MS);
}

export const toast = {
  success: (message) => show("success", message),
  error: (message) => show("error", message),
  info: (message) => show("info", message),
  dismiss,
};

/*
 * Asks before something that cannot be undone. Only one dialog at a time: a
 * second call while one is open answers the first "no".
 */
export function confirmAction({ title = "Are you sure?", message = "", confirmLabel = "OK", cancelLabel = "Cancel", danger = false } = {}) {
  if (dialog) dialog.resolve(false);

  return new Promise((resolve) => {
    dialog = {
      title,
      message,
      confirmLabel,
      cancelLabel,
      danger,
      resolve: (answer) => {
        dialog = null;
        emit();
        resolve(answer);
      },
    };
    emit();
  });
}

// For tests: forget every toast and close the dialog.
export function resetFeedback() {
  if (dialog) dialog.resolve(false);
  toasts = [];
  dialog = null;
  emit();
}
