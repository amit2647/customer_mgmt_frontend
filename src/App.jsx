import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import SplashScreen from "./components/common/SplashScreen";
import OnboardingScreen from "./components/common/OnboardingScreen";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/Login/LoginPage";

import DashboardPage from "./pages/Dashboard/DashboardPage";

import LeadsPage from "./pages/Leads/LeadsPage";
import LeadWorkflowPage from "./pages/Leads/LeadWorkflowPage";

import CustomersPage from "./pages/Customers/CustomersPage";
import CustomerWorkflowPage from "./pages/Customers/CustomerWorkflowPage";

import ServicesPage from "./pages/Services/ServicesPage";

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
          <Route path="/" element={<DashboardPage />} />

          <Route path="/leads" element={<LeadsPage />} />

          <Route path="/leads/new" element={<LeadWorkflowPage />} />

          <Route path="/leads/:id/edit" element={<LeadWorkflowPage />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/customers/new" element={<CustomerWorkflowPage />} />

          <Route
            path="/customers/:id/edit"
            element={<CustomerWorkflowPage />}
          />

          <Route path="/services" element={<ServicesPage />} />
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
