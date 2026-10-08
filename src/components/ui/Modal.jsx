import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/*
 * The product's one dialog, for a task that interrupts a page: add a
 * deadline, record a payment, save a credential. The page stays behind it.
 *
 *   title, description       the heading, and one line under it
 *   onClose                  ×, Escape and a click outside (not while busy)
 *   onSubmit                 makes the body a <form> named by the title, so
 *                            Enter submits and the footer buttons belong to it
 *   footer                   the actions (Cancel, Save), pinned to the bottom
 *   size                     "sm" (440px) | "md" (640px) | "lg" (920px)
 *   busy                     while saving: no closing by Escape or outside click
 *
 * Focus moves into the dialog (an autoFocus field wins), Tab stays inside it,
 * and it returns to whatever opened the dialog when it closes.
 */

const FIELD = '.ui-modal-body input:not([disabled]):not([type="hidden"]), .ui-modal-body select:not([disabled]), .ui-modal-body textarea:not([disabled])';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ title, description, onClose, onSubmit, footer, size = "md", busy = false, className = "", children }) {
  const titleId = useId();
  const panel = useRef(null);
  const close = useRef(onClose);
  const locked = useRef(busy);
  // What had focus before the dialog: read on the first render, before an
  // autoFocus field inside takes it (an effect would run too late).
  const [opener] = useState(() => (typeof document === "undefined" ? null : document.activeElement));

  close.current = onClose;
  locked.current = busy;

  useEffect(() => {
    // Land on the first field, not the × button. (Also when StrictMode's
    // remount has just handed focus back to the opener.)
    if (panel.current && !panel.current.contains(document.activeElement)) {
      (panel.current.querySelector(FIELD) || panel.current.querySelector(FOCUSABLE))?.focus();
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && !locked.current) {
        event.stopPropagation();
        close.current?.();
      }

      if (event.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("ui-modal-open");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("ui-modal-open");
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, []);

  const content = (
    <>
      <div className="ui-modal-body">{children}</div>
      {footer && <footer className="ui-modal-actions">{footer}</footer>}
    </>
  );

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !locked.current) onClose?.();
      }}
    >
      <div ref={panel} className={`ui-modal size-${size} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ui-modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="ui-modal-close" onClick={() => onClose?.()} aria-label="Close" disabled={busy}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {onSubmit ? (
          <form
            className="ui-modal-form"
            aria-labelledby={titleId}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(event);
            }}
          >
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
