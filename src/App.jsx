import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import SplashScreen from "./components/common/SplashScreen";
import OnboardingScreen from "./components/common/OnboardingScreen";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";
import WithoutBundle from "./components/auth/WithoutBundle";

import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/Login/LoginPage";
import SetupPage from "./pages/Setup/SetupPage";
import { getSetupStatus } from "./api/setup";
import GuestAccessPage from "./pages/Guest/GuestAccessPage";
import VerifyEmailPage from "./pages/VerifyEmail/VerifyEmailPage";

/*
 * Pages are fetched the first time they are visited (React.lazy), so the
 * login page, which a Hydra sign-in loads twice, carries only itself. The
 * login, setup, invite and email-confirmation pages stay in the main bundle: they are the first
 * thing someone signed out sees. A page still loading shows its frame (the
 * sidebar, the Settings tabs) and a skeleton: see AppLayout and SettingsLayout.
 */
const AppLayout = lazy(() => import("./components/layout/AppLayout"));
const AssistantPage = lazy(() => import("./pages/Assistant/AssistantPage"));
const DashboardPage = lazy(() => import("./pages/Dashboard/DashboardPage"));
const LeadsPage = lazy(() => import("./pages/Leads/LeadsPage"));
const LeadDetailPage = lazy(() => import("./pages/Leads/LeadDetailPage"));
const LeadWorkflowPage = lazy(() => import("./pages/Leads/LeadWorkflowPage"));
const CustomersPage = lazy(() => import("./pages/Customers/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/Customers/CustomerDetailPage"));
const CustomerWorkflowPage = lazy(() => import("./pages/Customers/CustomerWorkflowPage"));
const ServicesPage = lazy(() => import("./pages/Services/ServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/Services/ServiceDetailPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));
const SettingsLayout = lazy(() => import("./pages/Settings/SettingsLayout"));
const EmailAccountsPage = lazy(() => import("./pages/Settings/EmailAccountsPage"));
const AppearancePage = lazy(() => import("./pages/Settings/AppearancePage"));
const ProfilePage = lazy(() => import("./pages/Settings/ProfilePage"));
const EmailTemplatesPage = lazy(() => import("./pages/Settings/EmailTemplatesPage"));
const EmailAutomationsPage = lazy(() => import("./pages/Settings/EmailAutomationsPage"));
const EmailTemplateFormPage = lazy(() => import("./pages/Settings/EmailTemplateFormPage"));
const EmailAutomationFormPage = lazy(() => import("./pages/Settings/EmailAutomationFormPage"));
const UsersRolesPage = lazy(() => import("./pages/Settings/UsersRolesPage"));
const UserFormPage = lazy(() => import("./pages/Settings/UserFormPage"));
const OrganizationPage = lazy(() => import("./pages/Settings/OrganizationPage"));
const BundlePage = lazy(() => import("./pages/Settings/BundlePage"));
const FirmPage = lazy(() => import("./pages/Settings/FirmPage"));
const ClientsPage = lazy(() => import("./pages/Clients/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/Clients/ClientDetailPage"));
const ClientWizardPage = lazy(() => import("./pages/Clients/ClientWizardPage"));
const ClientsImportPage = lazy(() => import("./pages/Clients/ClientsImportPage"));
const ProspectsPage = lazy(() => import("./pages/Prospects/ProspectsPage"));
const ProspectFormPage = lazy(() => import("./pages/Prospects/ProspectFormPage"));
const DeadlinesPage = lazy(() => import("./pages/Deadlines/DeadlinesPage"));
const DocumentEditorPage = lazy(() => import("./pages/Documents/DocumentEditorPage"));
const DocumentsPage = lazy(() => import("./pages/Documents/DocumentsPage"));
const DocumentTemplatePage = lazy(() => import("./pages/Documents/DocumentTemplatePage"));
const RoleFormPage = lazy(() => import("./pages/Settings/RoleFormPage"));
const AccessGrantsPage = lazy(() => import("./pages/Settings/AccessGrantsPage"));

// The old Settings addresses of a template's editor land on its new one.
function TemplateRedirect() {
  const { key } = useParams();
  return <Navigate to={`/documents/templates/${key}`} replace />;
}

const SPLASH_SEEN = "omnicore-splash-seen";

function splashSeen() {
  try {
    return sessionStorage.getItem(SPLASH_SEEN) === "true";
  } catch {
    return false;
  }
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_SEEN, "true");
  } catch {
    // Without storage the splash shows on each load, as it always did.
  }
}

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
  // Links people open from an email (a guest invite, an email confirmation)
  // go straight to their page: no splash, setup or tour in front of them.
  const isEmailedLink = location.pathname.startsWith("/access/") || location.pathname === "/verify-email";

  /*
   * The splash is the app opening, once per tab. Signing in through Hydra
   * reloads the app twice more (the login page with its challenge, then the
   * page asked for), and holding each of those for the splash's 1.8 s made a
   * sign-in take ten. It is skipped there, and when there is no session the
   * app goes straight on to the sign-in flow instead of waiting it out.
   */
  const { loading: authLoading, isAuthenticated } = useAuth();
  const inSignInFlow = location.pathname === "/login";
  const [showSplash, setShowSplash] = useState(() => !inSignInFlow && !splashSeen());

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
    markSplashSeen();
    setShowSplash(false);
  }

  // Skipped (signed out, or inside the sign-in flow) counts as seen, so the
  // reload that ends the sign-in does not show it either.
  const skipSplash = inSignInFlow || (!authLoading && !isAuthenticated);
  useEffect(() => {
    if (showSplash && skipSplash) handleSplashComplete();
  }, [showSplash, skipSplash]);

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

  if (showSplash && !isEmailedLink && !skipSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * FIRST-RUN SETUP
   * ---------------------------------------------------------
   */

  if (!isEmailedLink && setup === null) {
    return null;
  }

  if (!isEmailedLink && setup.required) {
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

  if (showOnboarding && !isEmailedLink) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * APPLICATION ROUTES
   * ---------------------------------------------------------
   */

  // Only the app's frame (AppLayout) can still be loading here, and only for
  // a moment after sign-in; each page's own wait is shown inside the frame.
  return (
    <Suspense fallback={null}>
    <Routes>
      {/* =====================================================
          PUBLIC
          ===================================================== */}

      <Route path="/login" element={<LoginPage />} />

      {/* Invite links for external guests — no session required to open it. */}
      <Route path="/access/:token" element={<GuestAccessPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

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
          </Route>

          <Route element={<RequirePermission permission="documents.generate" />}>
            <Route path="/clients/:clientId/documents/new" element={<DocumentEditorPage />} />
          </Route>

          <Route element={<RequirePermission permission="documents.read" />}>
            <Route path="/documents/:id" element={<DocumentEditorPage />} />
          </Route>

          {/* Documents: every letter the firm issues; a letter's text is edited
              with system.settings. Deadline rules and templates used to sit in
              Settings — those addresses forward here and to Services. */}
          <Route element={<RequirePermission permission="documents.read" />}>
            <Route path="/documents" element={<DocumentsPage />} />
          </Route>

          <Route element={<RequirePermission permission="system.settings" />}>
            <Route path="/documents/templates/new" element={<DocumentTemplatePage />} />
            <Route path="/documents/templates/:key" element={<DocumentTemplatePage />} />
          </Route>

          <Route path="/settings/documents" element={<Navigate to="/documents" replace />} />
          <Route path="/settings/documents/:key" element={<TemplateRedirect />} />
          <Route path="/settings/deadlines" element={<Navigate to="/services" replace />} />

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
            <Route path="/services/:id" element={<ServiceDetailPage />} />
          </Route>

          {/* Settings is one page with tabs (SettingsLayout); /settings opens
              the first tab this person can see. Each section keeps its own
              route and permission, so a denied one says so inside the tabs. */}
          <Route path="/settings" element={<SettingsPage />} />

          <Route element={<SettingsLayout />}>
            {/* Everyone's own record and look, so nothing beyond being signed in. */}
            <Route path="/settings/profile" element={<ProfilePage />} />
            <Route path="/settings/appearance" element={<AppearancePage />} />

            <Route element={<RequirePermission permission="organization.read" />}>
              <Route path="/settings/organization" element={<OrganizationPage />} />
              <Route path="/settings/firm" element={<FirmPage />} />
            </Route>

            <Route element={<RequirePermission permission="users.read" />}>
              <Route path="/settings/users" element={<UsersRolesPage />} />
              <Route path="/settings/access" element={<AccessGrantsPage />} />
            </Route>

            <Route element={<RequirePermission permission="system.integrations" />}>
              <Route path="/settings/email-accounts" element={<EmailAccountsPage />} />
            </Route>

            <Route element={<RequirePermission permission="email.templates.read" />}>
              <Route path="/settings/email-templates" element={<EmailTemplatesPage />} />
            </Route>

            <Route element={<RequirePermission permission="email.automations.read" />}>
              <Route path="/settings/email-automations" element={<EmailAutomationsPage />} />
            </Route>

            <Route element={<RequirePermission permission="bundles.manage" />}>
              <Route path="/settings/bundle" element={<BundlePage />} />
            </Route>

          </Route>

          {/* Full-page editors opened from a settings section. */}
          <Route element={<RequirePermission permission="email.templates.read" />}>
            <Route path="/settings/email-templates/new" element={<EmailTemplateFormPage />} />
            <Route path="/settings/email-templates/:id/edit" element={<EmailTemplateFormPage />} />
          </Route>

          <Route element={<RequirePermission permission="email.automations.read" />}>
            <Route path="/settings/email-automations/new" element={<EmailAutomationFormPage />} />
            <Route path="/settings/email-automations/:id/edit" element={<EmailAutomationFormPage />} />
          </Route>

          <Route element={<RequirePermission permission="users.read" />}>
            <Route path="/settings/users/new" element={<UserFormPage />} />
            <Route path="/settings/users/:id/edit" element={<UserFormPage />} />
            <Route path="/settings/roles/new" element={<RoleFormPage />} />
            <Route path="/settings/roles/:id/edit" element={<RoleFormPage />} />
          </Route>
        </Route>
      </Route>

      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
