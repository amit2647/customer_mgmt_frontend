import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import SplashScreen from "./components/common/SplashScreen";
import OnboardingScreen from "./components/common/OnboardingScreen";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import { useAuth } from "./context/AuthContext";

import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/Login/LoginPage";

import DashboardPage from "./pages/Dashboard/DashboardPage";

import LeadsPage from "./pages/Leads/LeadsPage";
import LeadDetailPage from "./pages/Leads/LeadDetailPage";
import LeadWorkflowPage from "./pages/Leads/LeadWorkflowPage";

import CustomersPage from "./pages/Customers/CustomersPage";
import CustomerDetailPage from "./pages/Customers/CustomerDetailPage";
import CustomerWorkflowPage from "./pages/Customers/CustomerWorkflowPage";

import ServicesPage from "./pages/Services/ServicesPage";

import SettingsPage from "./pages/Settings/SettingsPage";
import EmailAccountsPage from "./pages/Settings/EmailAccountsPage";
import AppearancePage from "./pages/Settings/AppearancePage";

// Checked in order when a user cannot open the dashboard.
const LANDING_FALLBACKS = [
  ["leads.read", "/leads"],
  ["customers.read", "/customers"],
  ["services.read", "/services"],
  ["system.integrations", "/settings"],
];

// "/" is both the post-login landing route and the catch-all target, so a role
// without reports.read would otherwise be dropped onto a dashboard that 403s.
function HomeRoute() {
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  if (permissions.includes("reports.read")) {
    return <DashboardPage />;
  }

  const fallback = LANDING_FALLBACKS.find(([permission]) =>
    permissions.includes(permission),
  );

  // With no accessible page at all, the dashboard's own error is as good as any.
  return fallback ? <Navigate to={fallback[1]} replace /> : <DashboardPage />;
}

function App() {
  const navigate = useNavigate();

  const [showSplash, setShowSplash] = useState(true);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("omnicore-onboarding-completed") !== "true";
  });

  function handleSplashComplete() {
    setShowSplash(false);
  }

  function handleOnboardingComplete() {
    localStorage.setItem("omnicore-onboarding-completed", "true");

    setShowOnboarding(false);

    navigate("/login", {
      replace: true,
    });
  }

  /*
   * ---------------------------------------------------------
   * SPLASH
   * ---------------------------------------------------------
   */

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * ONBOARDING
   * ---------------------------------------------------------
   */

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * APPLICATION ROUTES
   * ---------------------------------------------------------
   */

  return (
    <Routes>
      {/* =====================================================
          PUBLIC
          ===================================================== */}

      <Route path="/login" element={<LoginPage />} />

      {/* =====================================================
          PROTECTED APPLICATION
          ===================================================== */}

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRoute />} />

          <Route path="/leads" element={<LeadsPage />} />

          <Route path="/leads/new" element={<LeadWorkflowPage />} />

          <Route path="/leads/:id" element={<LeadDetailPage />} />

          <Route path="/leads/:id/edit" element={<LeadWorkflowPage />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/customers/new" element={<CustomerWorkflowPage />} />

          <Route path="/customers/:id" element={<CustomerDetailPage />} />

          <Route
            path="/customers/:id/edit"
            element={<CustomerWorkflowPage />}
          />

          <Route path="/services" element={<ServicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="/settings/email-accounts"
            element={<EmailAccountsPage />}
          />
          <Route path="/settings/appearance" element={<AppearancePage />} />
        </Route>
      </Route>

      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
