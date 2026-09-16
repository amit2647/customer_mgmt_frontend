import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

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
          {collapsed ? "›" : "‹"}
        </span>
      </button>

      {/* ============================================================
          MANAGEMENT
          ============================================================ */}

      <nav className="sidebar-nav" aria-label="Management">
        <NavLink
          to="/"
          end
          className={navigationClass}
          data-tooltip="Dashboard"
        >
          <span className="sidebar-icon" aria-hidden="true">
            ▦
          </span>

          <span className="sidebar-link-label">Dashboard</span>
        </NavLink>

        {hasPermission("leads.read") && (
          <NavLink to="/leads" className={navigationClass} data-tooltip="Leads">
            <span className="sidebar-icon" aria-hidden="true">
              ◈
            </span>

            <span className="sidebar-link-label">Leads</span>
          </NavLink>
        )}

        {hasPermission("customers.read") && (
          <NavLink
            to="/customers"
            className={navigationClass}
            data-tooltip="Customers"
          >
            <span className="sidebar-icon" aria-hidden="true">
              ◉
            </span>

            <span className="sidebar-link-label">Customers</span>
          </NavLink>
        )}

        {hasPermission("services.read") && (
          <NavLink
            to="/services"
            className={navigationClass}
            data-tooltip="Services"
          >
            <span className="sidebar-icon" aria-hidden="true">
              ◇
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
              ⚙
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
