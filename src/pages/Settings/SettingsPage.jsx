import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useBundle } from "../../context/BundleContext";
import { visibleTabs } from "./settingsSections";

// /settings opens the first tab this person can see (Profile, for everyone).
function SettingsPage() {
  const { user } = useAuth();
  const { bundle } = useBundle();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const [first] = visibleTabs(permissions, bundle);

  return <Navigate to={first ? first.sections[0].path : "/settings/profile"} replace />;
}

export default SettingsPage;
