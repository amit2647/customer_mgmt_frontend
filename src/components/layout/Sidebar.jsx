import { NavLink } from "react-router-dom";

import {
  CaretLeft,
  CaretRight,
  GearSix,
  CalendarCheck,
  Kanban,
  Sparkle,
  Package,
  SquaresFour,
  UserCircle,
  Users,
} from "@phosphor-icons/react";

import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const { bundle, term } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  function hasPermission(permission) {
    return permissions.includes(permission);
  }

  const navigationClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      aria-label="Main navigation"
    >
      {/* ============================================================
          BRAND
          ============================================================ */}

      <div className="sidebar-brand">
        <div className="brand-mark">OC</div>

        <div className="brand-copy">
          <strong>OmniCore</strong>

          <span>CRM Platform</span>
        </div>
      </div>

      {/* ============================================================
          COLLAPSE BUTTON
          ============================================================ */}

      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="sidebar-toggle-icon" aria-hidden="true">
          {collapsed ? (
            <CaretRight size={12} weight="bold" />
          ) : (
            <CaretLeft size={12} weight="bold" />
          )}
        </span>
      </button>

      {/* ============================================================
          MANAGEMENT
          ============================================================ */}

      <nav className="sidebar-nav" aria-label="Management">
        {hasPermission("reports.read") && (
          <NavLink
            to="/"
            end
            className={navigationClass}
            data-tooltip="Dashboard"
          >
            <span className="sidebar-icon" aria-hidden="true">
              <SquaresFour size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Dashboard</span>
          </NavLink>
        )}

        {/* With a bundle, Prospects is the one screen for leads. */}
        {!bundle && hasPermission("leads.read") && (
          <NavLink to="/leads" className={navigationClass} data-tooltip="Leads">
            <span className="sidebar-icon" aria-hidden="true">
              <UserCircle size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Leads</span>
          </NavLink>
        )}

        {/* With a profession bundle, its board and its word for a customer. */}
        {bundle && hasPermission("leads.read") && (
          <NavLink to="/prospects" className={navigationClass} data-tooltip="Prospects">
            <span className="sidebar-icon" aria-hidden="true">
              <Kanban size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Prospects</span>
          </NavLink>
        )}

        {bundle?.capabilities?.includes("obligations") && hasPermission("obligations.read") && (
          <NavLink to="/deadlines" className={navigationClass} data-tooltip="Deadlines">
            <span className="sidebar-icon" aria-hidden="true">
              <CalendarCheck size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Deadlines</span>
          </NavLink>
        )}

        {hasPermission("customers.read") && (
          <NavLink
            to={bundle ? "/clients" : "/customers"}
            className={navigationClass}
            data-tooltip={bundle ? term("client", true) : "Customers"}
          >
            <span className="sidebar-icon" aria-hidden="true">
              <Users size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">{bundle ? term("client", true) : "Customers"}</span>
          </NavLink>
        )}

        {hasPermission("services.read") && (
          <NavLink
            to="/services"
            className={navigationClass}
            data-tooltip="Services"
          >
            <span className="sidebar-icon" aria-hidden="true">
              <Package size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Services</span>
          </NavLink>
        )}
      </nav>

      {/* ============================================================
          FLEXIBLE SPACE
          ============================================================ */}

      <div className="sidebar-spacer" />

      {/* ============================================================
          ASSISTANT
          ============================================================ */}

      {/* No permission gate: the assistant is open to anyone signed in, and
          what it can actually do is filtered per-tool server-side. */}
      <nav className="sidebar-assistant" aria-label="Assistant">
        <NavLink
          to="/assistant"
          className={navigationClass}
          data-tooltip="Assistant"
        >
          <span className="sidebar-icon" aria-hidden="true">
            <Sparkle size={20} weight="regular" />
          </span>

          <span className="sidebar-link-label">Assistant</span>
        </NavLink>
      </nav>

      {/* ============================================================
          SETTINGS
          ============================================================ */}

      {hasPermission("system.integrations") && (
        <nav className="sidebar-settings" aria-label="Settings">
          <NavLink
            to="/settings"
            className={navigationClass}
            data-tooltip="Settings"
          >
            <span className="sidebar-icon" aria-hidden="true">
              <GearSix size={20} weight="regular" />
            </span>

            <span className="sidebar-link-label">Settings</span>
          </NavLink>
        </nav>
      )}

      {/* ============================================================
          FOOTER
          ============================================================ */}

      <div className="sidebar-footer">
        <span>OmniCore</span>
        <span>v1.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;
