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
          to="/leads"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          ◈ <span>Leads</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          ◉ <span>Customers</span>
        </NavLink>

        <NavLink
          to="/services"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          ⚙ <span>Services</span>
        </NavLink>
      </nav>

      <div className="side-note">
        <b>Service FC</b>
        <br />
      </div>
    </aside>
  );
}

export default Sidebar;
