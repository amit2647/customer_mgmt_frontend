import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CaretDown, Palette, SignOut, UserCircle } from "@phosphor-icons/react";

/*
 * The account menu in the header: who is signed in, a way to their profile,
 * and sign out.
 *
 * Closes on outside click, on Escape (returning focus to the trigger), and on
 * navigation, so it never lingers over the page it just opened.
 */
function UserMenu({ displayName, email, role, initials, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`user-menu-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        <div className="user-avatar">{initials}</div>

        <div className="user-info">
          <strong>{displayName}</strong>

          <span>{role}</span>
        </div>

        <CaretDown size={12} weight="bold" className="user-menu-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-identity">
            <strong>{displayName}</strong>
            {email && <span>{email}</span>}
          </div>

          <button type="button" role="menuitem" onClick={() => go("/settings/profile")}>
            <UserCircle size={16} aria-hidden="true" />
            My profile
          </button>

          <button type="button" role="menuitem" onClick={() => go("/settings/appearance")}>
            <Palette size={16} aria-hidden="true" />
            Appearance
          </button>

          <div className="user-menu-separator" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="user-menu-signout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <SignOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
