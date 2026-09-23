import { Outlet } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/*
 * Per-route permission gate, layered inside ProtectedRoute.
 *
 * Without it a route only fails at the API, and pages handle that inconsistently
 * — ServicesPage, for instance, logs the 403 and falls through to its empty
 * state, so a screen someone cannot access reads as an empty catalog with an
 * "Add" button. Hiding a nav item is not access control while the URL still
 * mounts the page.
 */
function RequirePermission({ permission }) {
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  if (permissions.includes(permission)) {
    return <Outlet />;
  }

  return (
    <main className="page">
      <div className="card access-denied">
        <h1>No access to this screen</h1>

        <p>
          Your account does not have the <code>{permission}</code> permission. If
          you need it, ask an administrator — temporary access can be granted
          without changing your role.
        </p>
      </div>
    </main>
  );
}

export default RequirePermission;
