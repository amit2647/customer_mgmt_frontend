import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside>
      <div className="brand">
        <div className="logo">OC</div>

        <div>
          <b>OmniCore</b>
          <span>Customer Platform</span>
        </div>
      </div>

      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="nav-icon">▦</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/leads"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="nav-icon">◈</span>
          <span>Leads</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="nav-icon">◉</span>
          <span>Customers</span>
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="nav-icon">⚙</span>
          <span>Services</span>
        </NavLink>
      </nav>

      <div className="side-note">
        <b>SOA</b>
      </div>
    </aside>
  );
}

export default Sidebar;
