import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import SplashScreen from "./components/common/SplashScreen";
import OnboardingScreen from "./components/common/OnboardingScreen";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";
import WithoutBundle from "./components/auth/WithoutBundle";

import { useAuth } from "./context/AuthContext";

import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/Login/LoginPage";
import SetupPage from "./pages/Setup/SetupPage";
import { getSetupStatus } from "./api/setup";
import GuestAccessPage from "./pages/Guest/GuestAccessPage";
import AssistantPage from "./pages/Assistant/AssistantPage";

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
import ProfilePage from "./pages/Settings/ProfilePage";
import EmailTemplatesPage from "./pages/Settings/EmailTemplatesPage";
import EmailAutomationsPage from "./pages/Settings/EmailAutomationsPage";
import EmailTemplateFormPage from "./pages/Settings/EmailTemplateFormPage";
import EmailAutomationFormPage from "./pages/Settings/EmailAutomationFormPage";
import UsersRolesPage from "./pages/Settings/UsersRolesPage";
import UserFormPage from "./pages/Settings/UserFormPage";
import OrganizationPage from "./pages/Settings/OrganizationPage";
import BundlePage from "./pages/Settings/BundlePage";
import FirmPage from "./pages/Settings/FirmPage";
import ClientsPage from "./pages/Clients/ClientsPage";
import ClientDetailPage from "./pages/Clients/ClientDetailPage";
import ClientWizardPage from "./pages/Clients/ClientWizardPage";
import ClientsImportPage from "./pages/Clients/ClientsImportPage";
import ProspectsPage from "./pages/Prospects/ProspectsPage";
import ProspectFormPage from "./pages/Prospects/ProspectFormPage";
import DeadlinesPage from "./pages/Deadlines/DeadlinesPage";
import DeadlineRulesPage from "./pages/Settings/DeadlineRulesPage";
import DocumentEditorPage from "./pages/Documents/DocumentEditorPage";
import DocumentTemplatesPage from "./pages/Settings/DocumentTemplatesPage";
import DocumentTemplatePage from "./pages/Settings/DocumentTemplatePage";
import RoleFormPage from "./pages/Settings/RoleFormPage";
import AccessGrantsPage from "./pages/Settings/AccessGrantsPage";

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
  const location = useLocation();

  /*
   * A guest arriving on an invite link gets neither splash nor onboarding:
   * onboarding ends by sending the visitor to /login, which is exactly where
   * someone without an account must not be sent.
   */
  const isInviteLink = location.pathname.startsWith("/access/");

  const [showSplash, setShowSplash] = useState(true);

  // A new installation is set up before anything else (SetupPage). Asked once,
  // during the splash; if the question fails, the app carries on as set up —
  // the server refuses setup anyway once an admin exists.
  const [setup, setSetup] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getSetupStatus()
      .then((status) => !cancelled && setSetup(status))
      .catch(() => !cancelled && setSetup({ required: false }));

    return () => {
      cancelled = true;
    };
  }, []);

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

  if (showSplash && !isInviteLink) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * FIRST-RUN SETUP
   * ---------------------------------------------------------
   */

  if (!isInviteLink && setup === null) {
    return null;
  }

  if (!isInviteLink && setup.required) {
    return (
      <SetupPage
        status={setup}
        onComplete={() => {
          // Signed straight in: no tour for the person who just set it up.
          setShowOnboarding(false);
          setSetup({ required: false });
        }}
      />
    );
  }

  /*
   * ---------------------------------------------------------
   * ONBOARDING
   * ---------------------------------------------------------
   */

  if (showOnboarding && !isInviteLink) {
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

      {/* Invite links for external guests — no session required to open it. */}
      <Route path="/access/:token" element={<GuestAccessPage />} />

      {/* =====================================================
          PROTECTED APPLICATION
          ===================================================== */}

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRoute />} />

          {/* Each screen is gated on the permission its API actually needs.
              Hiding the nav link is not enough on its own: the URL still mounts
              the page, and pages swallow the 403 differently — ServicesPage
              renders an empty catalog rather than an access error. */}

          {/* No permission gate: the assistant is open to anyone signed in.
              What it can actually do is filtered per-tool server-side. */}
          <Route path="/assistant" element={<AssistantPage />} />

          {/* With a bundle, the prospect board is the one screen for leads:
              both show the same `leads` rows, and Convert must open the client
              wizard. Every /leads link (dashboard, landing fallback) follows. */}
          <Route element={<RequirePermission permission="leads.read" />}>
            <Route element={<WithoutBundle redirectTo="/prospects" />}>
              <Route path="/leads" element={<LeadsPage />} />

              <Route path="/leads/new" element={<LeadWorkflowPage />} />

              <Route path="/leads/:id" element={<LeadDetailPage />} />

              <Route path="/leads/:id/edit" element={<LeadWorkflowPage />} />
            </Route>
          </Route>

          {/* Profession-bundle screens: Clients replace Customers once a bundle
              is installed (the Customers screens stay for an organization
              without one, and redirect here for one with). */}
          <Route element={<RequirePermission permission="customers.read" />}>
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Route>

          <Route element={<RequirePermission permission="customers.create" />}>
            <Route path="/clients/new" element={<ClientWizardPage />} />
            <Route path="/clients/import" element={<ClientsImportPage />} />
          </Route>

          <Route element={<RequirePermission permission="customers.update" />}>
            <Route path="/clients/:id/edit" element={<ClientWizardPage />} />
          </Route>

          <Route element={<RequirePermission permission="leads.read" />}>
            <Route path="/prospects" element={<ProspectsPage />} />
          </Route>

          <Route element={<RequirePermission permission="leads.create" />}>
            <Route path="/prospects/new" element={<ProspectFormPage />} />
          </Route>

          <Route element={<RequirePermission permission="leads.update" />}>
            <Route path="/prospects/:id/edit" element={<ProspectFormPage />} />
          </Route>

          <Route element={<RequirePermission permission="obligations.read" />}>
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/settings/deadlines" element={<DeadlineRulesPage />} />
          </Route>

          <Route element={<RequirePermission permission="documents.generate" />}>
            <Route path="/clients/:clientId/documents/new" element={<DocumentEditorPage />} />
          </Route>

          <Route element={<RequirePermission permission="documents.read" />}>
            <Route path="/documents/:id" element={<DocumentEditorPage />} />
          </Route>

          <Route element={<RequirePermission permission="system.settings" />}>
            <Route path="/settings/documents" element={<DocumentTemplatesPage />} />
            <Route path="/settings/documents/:key" element={<DocumentTemplatePage />} />
          </Route>

          <Route element={<RequirePermission permission="customers.read" />}>
            {/* With a bundle, Clients are the screens for customers (the same
                rows): each /customers path lands on its /clients twin. */}
            <Route element={<WithoutBundle redirectTo={(path) => path.replace(/^\/customers/, "/clients")} />}>
              <Route path="/customers" element={<CustomersPage />} />

              <Route path="/customers/new" element={<CustomerWorkflowPage />} />

              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              <Route
                path="/customers/:id/edit"
                element={<CustomerWorkflowPage />}
              />
            </Route>
          </Route>

          <Route element={<RequirePermission permission="services.read" />}>
            <Route path="/services" element={<ServicesPage />} />
          </Route>

          {/* The settings landing filters its own cards, so it stays open — the
              sub-routes below carry the same permissions those cards use. */}
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/settings/appearance" element={<AppearancePage />} />

          {/* Everyone's own record, so no permission beyond being signed in. */}
          <Route path="/settings/profile" element={<ProfilePage />} />

          <Route
            element={<RequirePermission permission="system.integrations" />}
          >
            <Route
              path="/settings/email-accounts"
              element={<EmailAccountsPage />}
            />
          </Route>

          <Route
            element={<RequirePermission permission="email.templates.read" />}
          >
            <Route
              path="/settings/email-templates"
              element={<EmailTemplatesPage />}
            />

            <Route
              path="/settings/email-templates/new"
              element={<EmailTemplateFormPage />}
            />

            <Route
              path="/settings/email-templates/:id/edit"
              element={<EmailTemplateFormPage />}
            />
          </Route>

          <Route
            element={<RequirePermission permission="email.automations.read" />}
          >
            <Route
              path="/settings/email-automations"
              element={<EmailAutomationsPage />}
            />

            <Route
              path="/settings/email-automations/new"
              element={<EmailAutomationFormPage />}
            />

            <Route
              path="/settings/email-automations/:id/edit"
              element={<EmailAutomationFormPage />}
            />
          </Route>

          <Route element={<RequirePermission permission="users.read" />}>
            <Route path="/settings/users" element={<UsersRolesPage />} />

            <Route path="/settings/users/new" element={<UserFormPage />} />

            <Route path="/settings/users/:id/edit" element={<UserFormPage />} />

            <Route path="/settings/roles/new" element={<RoleFormPage />} />

            <Route path="/settings/roles/:id/edit" element={<RoleFormPage />} />

            <Route path="/settings/access" element={<AccessGrantsPage />} />
          </Route>

          <Route element={<RequirePermission permission="bundles.manage" />}>
            <Route path="/settings/bundle" element={<BundlePage />} />
          </Route>

          <Route element={<RequirePermission permission="organization.read" />}>
            <Route path="/settings/firm" element={<FirmPage />} />
          </Route>

          <Route element={<RequirePermission permission="organization.read" />}>
            <Route
              path="/settings/organization"
              element={<OrganizationPage />}
            />
          </Route>
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
