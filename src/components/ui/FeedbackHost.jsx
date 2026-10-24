import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";

import Modal from "./Modal";
import { dismiss, snapshot, subscribe } from "./feedback";

/*
 * Draws what feedback.js holds: the toasts, stacked in the top-right corner,
 * and the confirmation dialog. Mounted once, in App (and in the tests' setup).
 * A toast leaves on its own after a few seconds — errors stay longest — and
 * waits while the pointer is over it. Leaving, it slides out to the right and
 * its slot folds away, so the ones below move up smoothly.
 */

const ICONS = { success: CheckCircle, error: WarningCircle, info: Info };

let current = snapshot();
const read = () => {
  const next = snapshot();
  if (next.toasts !== current.toasts || next.dialog !== current.dialog) current = next;
  return current;
};

function Toast({ item }) {
  const timer = useRef(null);
  const Icon = ICONS[item.tone];

  const start = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(item.id), item.duration);
  };
  const pause = () => clearTimeout(timer.current);

  useEffect(() => {
    start();
    return pause;
    // A toast's own id and duration never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`toast-slot${item.leaving ? " leaving" : ""}`}>
      <div className="toast-slot-inner">
        <div className={`toast toast-${item.tone}`} role={item.tone === "error" ? "alert" : "status"} onMouseEnter={pause} onMouseLeave={() => !item.leaving && start()}>
          <Icon className="toast-icon" size={20} weight="fill" aria-hidden="true" />
          <p className="toast-text">{item.text}</p>
          <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss message">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackHost() {
  const { toasts, dialog } = useSyncExternalStore(subscribe, read, read);

  return (
    <>
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((item) => <Toast key={item.id} item={item} />)}
        </div>,
        document.body,
      )}

      {dialog && (
        <Modal
          title={dialog.title}
          description={dialog.message || undefined}
          size="sm"
          className="confirm-dialog"
          onClose={() => dialog.resolve(false)}
          onSubmit={() => dialog.resolve(true)}
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => dialog.resolve(false)}>{dialog.cancelLabel}</button>
              <button type="submit" className={dialog.danger ? "primary danger" : "primary"} autoFocus>{dialog.confirmLabel}</button>
            </>
          }
        />
      )}
    </>
  );
}

export default FeedbackHost;
