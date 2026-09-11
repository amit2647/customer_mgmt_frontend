import { NavLink } from "react-router-dom";

function Sidebar({ collapsed, onToggle }) {
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
          <span>Customer Platform</span>
        </div>
      </div>

      {/* ============================================================
          COLLAPSE BUTTON
          Always visible
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

      <nav className="sidebar-nav" aria-label="Overview">
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
      </nav>

      <nav className="sidebar-nav" aria-label="Management">
        <NavLink to="/leads" className={navigationClass} data-tooltip="Leads">
          <span className="sidebar-icon" aria-hidden="true">
            ◈
          </span>

          <span className="sidebar-link-label">Leads</span>
        </NavLink>

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

        <NavLink
          to="/services"
          className={navigationClass}
          data-tooltip="Services"
        >
          <span className="sidebar-icon" aria-hidden="true">
            ⚙
          </span>

          <span className="sidebar-link-label">Services</span>
        </NavLink>
      </nav>

      {/* ============================================================
          FLEXIBLE SPACE
          ============================================================ */}

      <div className="sidebar-spacer" />

      {/* ============================================================
          SYSTEM STATUS
          ============================================================ */}

      <div
        className="sidebar-system-card"
        title={collapsed ? "SOA Platform — Gateway connected" : undefined}
      >
        <div className="system-card-icon">S</div>

        <div className="system-card-copy">
          <strong>SOA Platform</strong>
          <span>Gateway connected</span>
        </div>

        <span className="system-status" aria-label="System online" />
      </div>

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
