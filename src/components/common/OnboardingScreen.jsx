import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    number: "00",
    eyebrow: "WELCOME TO OMNICORE",
    title: "Your customer operations, in one place.",
    description:
      "OmniCore gives your team a unified workspace for managing prospects, customers and the services associated with them.",
    action: "Start tour",
    visual: "welcome",
  },
  {
    id: "dashboard",
    number: "01",
    eyebrow: "01 · DASHBOARD",
    title: "See the bigger picture.",
    description:
      "The dashboard gives you an operational overview of your customer platform, including lead pipeline, conversion activity, service demand and items that need attention.",
    action: "Next",
    visual: "dashboard",
  },
  {
    id: "leads",
    number: "02",
    eyebrow: "02 · LEADS",
    title: "Capture and qualify prospects.",
    description:
      "Create leads, capture their contact information, qualify opportunities, assign services and move prospects through the lifecycle toward conversion.",
    action: "Next",
    visual: "leads",
  },
  {
    id: "customers",
    number: "03",
    eyebrow: "03 · CUSTOMERS",
    title: "Build lasting customer relationships.",
    description:
      "Convert qualified opportunities into customers and manage customer profiles, segments and their associated services from a dedicated workspace.",
    action: "Next",
    visual: "customers",
  },
  {
    id: "services",
    number: "04",
    eyebrow: "04 · SERVICES",
    title: "Connect customers with services.",
    description:
      "Manage the service catalog and associate services with leads and customers. This creates a clear relationship between your customers and the capabilities they need.",
    action: "Get started",
    visual: "services",
  },
];

function OnboardingScreen({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  function finishOnboarding() {
    localStorage.setItem("omnicore-onboarding-completed", "true");

    onComplete?.();
  }

  function handleNext() {
    if (isLastStep) {
      finishOnboarding();
      navigate("/");
      return;
    }

    setCurrentStep((current) => current + 1);
  }

  function handleBack() {
    if (isFirstStep) {
      return;
    }

    setCurrentStep((current) => current - 1);
  }

  function handleSkip() {
    finishOnboarding();
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-shell">
        {/* ============================================================
            TOP BAR
            ============================================================ */}

        <header className="onboarding-topbar">
          <div className="onboarding-brand">
            <div className="onboarding-brand-mark">OC</div>

            <div className="onboarding-brand-copy">
              <strong>OmniCore</strong>
              <span>Customer Platform</span>
            </div>
          </div>

          <div className="onboarding-topbar-right">
            <span className="onboarding-tour-label">Platform tour</span>

            <button
              type="button"
              className="onboarding-skip"
              onClick={handleSkip}
            >
              Skip tour
            </button>
          </div>
        </header>

        {/* ============================================================
            MAIN
            ============================================================ */}

        <main className="onboarding-main">
          <div className="onboarding-content">
            {/* ========================================================
                VISUAL
                ======================================================== */}

            <div className="onboarding-visual">
              <div className="onboarding-visual-grid" />

              <OnboardingVisual type={step.visual} />

              <div className="onboarding-floating-card onboarding-floating-top">
                <span className="onboarding-floating-dot" />
                <span>Customer operations</span>
              </div>

              <div className="onboarding-floating-card onboarding-floating-bottom">
                <strong>Connected</strong>
                <span>Domain services</span>
              </div>
            </div>

            {/* ========================================================
                COPY
                ======================================================== */}

            <div className="onboarding-copy" key={step.id}>
              <span className="onboarding-eyebrow">{step.eyebrow}</span>

              <h1>{step.title}</h1>

              <p>{step.description}</p>

              {/* ======================================================
                  INDICATORS
                  ====================================================== */}

              <div
                className="onboarding-progress"
                aria-label={`Step ${currentStep + 1} of ${ONBOARDING_STEPS.length}`}
              >
                <div className="onboarding-indicators">
                  {ONBOARDING_STEPS.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`onboarding-indicator ${
                        index === currentStep
                          ? "active"
                          : index < currentStep
                            ? "completed"
                            : ""
                      }`}
                      onClick={() => setCurrentStep(index)}
                      aria-label={`Go to ${item.eyebrow}`}
                      aria-current={index === currentStep ? "step" : undefined}
                    >
                      <span />
                    </button>
                  ))}
                </div>

                <div className="onboarding-step-count">
                  <strong>{step.number}</strong>

                  <span>/</span>

                  <span>04</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ============================================================
            FOOTER
            ============================================================ */}

        <footer className="onboarding-footer">
          <button
            type="button"
            className="btn btn-secondary onboarding-back"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            ← Back
          </button>

          <div className="onboarding-footer-hint">
            {isLastStep
              ? "You're ready to explore OmniCore."
              : "You can revisit these areas anytime from the sidebar."}
          </div>

          <button
            type="button"
            className="btn btn-primary onboarding-next"
            onClick={handleNext}
          >
            {step.action}

            {!isLastStep && <span>→</span>}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ================================================================
   VISUAL SWITCHER
   ================================================================ */

function OnboardingVisual({ type }) {
  switch (type) {
    case "dashboard":
      return <DashboardVisual />;

    case "leads":
      return <LeadsVisual />;

    case "customers":
      return <CustomersVisual />;

    case "services":
      return <ServicesVisual />;

    case "welcome":
    default:
      return <WelcomeVisual />;
  }
}

/* ================================================================
   WELCOME VISUAL
   ================================================================ */

function WelcomeVisual() {
  return (
    <div className="onboarding-platform-visual">
      <div className="platform-orbit platform-orbit-one" />
      <div className="platform-orbit platform-orbit-two" />

      <div className="platform-center">
        <span>OC</span>
      </div>

      <div className="platform-node platform-node-one">
        <span>LE</span>
      </div>

      <div className="platform-node platform-node-two">
        <span>CU</span>
      </div>

      <div className="platform-node platform-node-three">
        <span>SV</span>
      </div>

      <div className="platform-connection connection-one" />
      <div className="platform-connection connection-two" />
      <div className="platform-connection connection-three" />
    </div>
  );
}

/* ================================================================
   DASHBOARD VISUAL
   ================================================================ */

function DashboardVisual() {
  return (
    <div className="onboarding-ui dashboard-ui">
      <div className="ui-header">
        <div className="ui-title-line" />
        <div className="ui-header-dot" />
      </div>

      <div className="ui-kpi-grid">
        <div className="ui-kpi">
          <span />
          <strong />
        </div>

        <div className="ui-kpi">
          <span />
          <strong />
        </div>

        <div className="ui-kpi">
          <span />
          <strong />
        </div>
      </div>

      <div className="ui-chart">
        <div className="ui-chart-lines">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="ui-chart-bars">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="ui-bottom-grid">
        <div />
        <div />
      </div>
    </div>
  );
}

/* ================================================================
   LEADS VISUAL
   ================================================================ */

function LeadsVisual() {
  return (
    <div className="onboarding-ui leads-ui">
      <div className="ui-header">
        <div className="ui-title-line" />
        <div className="ui-header-dot" />
      </div>

      <div className="lead-pipeline">
        <LeadStage label="New" count="12" />

        <LeadStage label="Contacted" count="08" />

        <LeadStage label="Qualified" count="05" active />

        <LeadStage label="Converted" count="03" />
      </div>

      <div className="lead-card">
        <div className="lead-avatar">AM</div>

        <div className="lead-card-copy">
          <strong />
          <span />
          <span />
        </div>

        <div className="lead-score">82</div>
      </div>
    </div>
  );
}

function LeadStage({ label, count, active = false }) {
  return (
    <div className={`lead-stage ${active ? "active" : ""}`}>
      <div className="lead-stage-top">
        <span>{label}</span>
        <strong>{count}</strong>
      </div>

      <div className="lead-stage-bar">
        <span />
      </div>
    </div>
  );
}

/* ================================================================
   CUSTOMERS VISUAL
   ================================================================ */

function CustomersVisual() {
  return (
    <div className="onboarding-ui customers-ui">
      <div className="customer-profile">
        <div className="customer-avatar">AM</div>

        <div className="customer-profile-copy">
          <strong>Customer</strong>
          <span>Enterprise account</span>
        </div>

        <div className="customer-status">Active</div>
      </div>

      <div className="customer-details">
        <div>
          <span>Name</span>
          <strong />
        </div>

        <div>
          <span>Company</span>
          <strong />
        </div>

        <div>
          <span>Email</span>
          <strong />
        </div>

        <div>
          <span>Segment</span>
          <strong />
        </div>
      </div>

      <div className="customer-services">
        <div className="customer-services-header">
          <span>Assigned services</span>
          <strong>03</strong>
        </div>

        <div className="customer-service-pills">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SERVICES VISUAL
   ================================================================ */

function ServicesVisual() {
  return (
    <div className="onboarding-ui services-ui">
      <div className="services-ui-header">
        <div>
          <span />
          <strong>Service Catalog</strong>
        </div>

        <div className="services-add">+</div>
      </div>

      <div className="services-grid">
        <ServiceCard icon="A" title="Analytics" active />

        <ServiceCard icon="C" title="Consulting" />

        <ServiceCard icon="D" title="Development" />

        <ServiceCard icon="S" title="Support" active />
      </div>

      <div className="service-link">
        <span />

        <div>
          <strong />
          <small />
        </div>

        <b>→</b>
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, active = false }) {
  return (
    <div className={`service-ui-card ${active ? "active" : ""}`}>
      <div className="service-ui-icon">{icon}</div>

      <strong>{title}</strong>

      <span />
    </div>
  );
}

export default OnboardingScreen;
