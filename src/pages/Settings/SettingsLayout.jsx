import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import { visibleTabs } from "./settingsSections";

/*
 * The Settings page: one header, a row of tabs (a group of settings each),
 * and — when a tab holds more than one section — a second, smaller row to
 * pick the section. The section itself renders below, in the Outlet.
 */
function SettingsLayout() {
  const { user } = useAuth();
  const { bundle, ready } = useBundle();
  const { pathname } = useLocation();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const tabs = visibleTabs(permissions, bundle);

  const owns = (section) => pathname === section.path || pathname.startsWith(`${section.path}/`);
  const current = tabs.find((tab) => tab.sections.some(owns));

  return (
    <main className="page settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Your account, your organization and how this workspace works.</p>
        </div>
      </div>

      {ready && !bundle && permissions.includes("bundles.manage") && !pathname.startsWith("/settings/bundle") && (
        <div className="settings-notice" role="note">
          This workspace has no profession bundle yet: install one to add its services, client fields and deadlines.{" "}
          <Link to="/settings/bundle">Set up a bundle</Link>
        </div>
      )}

      <nav className="client-tabs settings-tabs" aria-label="Settings">
        {tabs.map((tab) => (
          <Link key={tab.id} to={tab.sections[0].path} className={tab === current ? "active" : undefined} aria-current={tab === current ? "page" : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {current && current.sections.length > 1 && (
        <nav className="settings-subtabs" aria-label={`${current.label} sections`}>
          {current.sections.map((section) => (
            <Link key={section.id} to={section.path} className={owns(section) ? "active" : undefined} aria-current={owns(section) ? "page" : undefined}>
              {section.label}
            </Link>
          ))}
        </nav>
      )}

      <Outlet />
    </main>
  );
}

export default SettingsLayout;
