import { NavLink } from "react-router-dom";

function Sidebar() {
  const navigationClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  return (
    <aside className="sidebar">
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

      <nav className="sidebar-nav" aria-label="Overview">
        <NavLink to="/" end className={navigationClass}>
          <span className="sidebar-icon" aria-hidden="true">
            ▦
          </span>

          <span>Dashboard</span>
        </NavLink>
      </nav>
      <nav className="sidebar-nav" aria-label="Management">
        <NavLink to="/leads" className={navigationClass}>
          <span className="sidebar-icon" aria-hidden="true">
            ◈
          </span>

          <span>Leads</span>
        </NavLink>

        <NavLink to="/customers" className={navigationClass}>
          <span className="sidebar-icon" aria-hidden="true">
            ◉
          </span>

          <span>Customers</span>
        </NavLink>

        <NavLink to="/services" className={navigationClass}>
          <span className="sidebar-icon" aria-hidden="true">
            ⚙
          </span>

          <span>Services</span>
        </NavLink>
      </nav>

      {/* ============================================================
          FLEXIBLE SPACE
          ============================================================ */}

      <div className="sidebar-spacer" />

      {/* ============================================================
          SYSTEM STATUS
          ============================================================ */}

      <div className="sidebar-system-card">
        <div className="system-card-icon">S</div>

        <div>
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
