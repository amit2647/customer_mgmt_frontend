import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard } from "../../api/dashboard";

import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ================================================================
     LOAD DASHBOARD
     ================================================================ */

  async function loadDashboard({ initial = false } = {}) {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const data = await getDashboard();

      setDashboard(data);
    } catch (err) {
      console.error("Dashboard loading failed:", err);

      setError(
        err?.message ||
          "Unable to load dashboard data. Please check that the API Gateway is running.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard({ initial: true });
  }, []);

  /* ================================================================
     DERIVED DASHBOARD DATA
     ================================================================ */

  const metrics = dashboard?.metrics || {
    totalLeads: 0,
    totalCustomers: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
  };

  const pipeline = Array.isArray(dashboard?.pipeline) ? dashboard.pipeline : [];

  const leadSources = Array.isArray(dashboard?.leadSources)
    ? dashboard.leadSources
    : [];

  const recentLeads = Array.isArray(dashboard?.recentLeads)
    ? dashboard.recentLeads
    : [];

  const serviceDemand = Array.isArray(dashboard?.serviceDemand)
    ? dashboard.serviceDemand
    : [];

  const attentionItems = Array.isArray(dashboard?.attentionItems)
    ? dashboard.attentionItems
    : [];

  const serviceCatalog = dashboard?.serviceCatalog || {
    totalServices: 0,
    activeServices: 0,
    servicesInDemand: 0,
  };

  const managedRecords =
    dashboard?.managedRecords ?? metrics.totalLeads + metrics.totalCustomers;

  /* ================================================================
     HELPERS
     ================================================================ */

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const getDisplayName = (item) => {
    if (!item) {
      return "Unknown";
    }

    if (item.name) {
      return item.name;
    }

    const fullName = [item.firstName, item.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return fullName;
    }

    return item.company || item.email || `Record #${item.id}`;
  };

  const getInitials = (name) => {
    if (!name) {
      return "?";
    }

    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getServiceNames = (item) => {
    if (!item) {
      return [];
    }

    if (Array.isArray(item.services)) {
      return item.services
        .map((service) => {
          if (typeof service === "string") {
            return service;
          }

          return service?.name || service?.serviceName;
        })
        .filter(Boolean);
    }

    if (Array.isArray(item.serviceIds)) {
      return item.serviceIds
        .map((serviceId) => String(serviceId))
        .filter(Boolean);
    }

    return [];
  };

  /* ================================================================
     LOADING STATE
     ================================================================ */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* ================================================================
     ERROR STATE
     ================================================================ */

  if (error && !dashboard) {
    return (
      <div className="dashboard-page">
        <header className="page-header dashboard-header">
          <div>
            <span className="eyebrow">CUSTOMER OPERATIONS</span>

            <h1>Dashboard</h1>

            <p>
              Monitor leads, customers, conversion activity and service demand.
            </p>
          </div>

          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                loadDashboard({
                  initial: true,
                })
              }
            >
              Retry
            </button>
          </div>
        </header>

        <div className="dashboard-error">
          <div className="dashboard-error-icon">!</div>

          <div>
            <h3>Dashboard unavailable</h3>

            <p>{error}</p>

            <p className="dashboard-error-help">
              Make sure Kong/API Gateway and the Dashboard, Lead, Customer and
              Service services are running.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     DASHBOARD
     ================================================================ */

  return (
    <div className="dashboard-page">
      {/* ============================================================
          HEADER
          ============================================================ */}

      <header className="page-header dashboard-header">
        <div>
          {/* <span className="eyebrow">CUSTOMER OPERATIONS</span> */}

          <h1>Dashboard</h1>

          <p>
            An overview of leads, customers, conversion activity and service
            demand.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadDashboard()}
            disabled={refreshing}
          >
            <span className={refreshing ? "spin" : ""}>↻</span>

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* ============================================================
          INLINE ERROR
          ============================================================ */}

      {error && (
        <div className="dashboard-inline-error">
          <span className="dashboard-inline-error-icon">!</span>

          <span>{error}</span>

          <button type="button" onClick={() => loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      {/* ============================================================
          KPI CARDS
          ============================================================ */}

      <section className="dashboard-stats">
        {/* TOTAL LEADS */}

        <Link to="/leads" className="dashboard-stat-card dashboard-stat-leads">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">Total Leads</span>

            <span className="dashboard-stat-icon">◈</span>
          </div>

          <div className="dashboard-stat-value">{metrics.totalLeads}</div>

          <div className="dashboard-stat-footer">
            <span>All lead records</span>

            <span className="dashboard-stat-link">View leads →</span>
          </div>
        </Link>

        {/* CUSTOMERS */}

        <Link
          to="/customers"
          className="dashboard-stat-card dashboard-stat-customers"
        >
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">Customers</span>

            <span className="dashboard-stat-icon">◉</span>
          </div>

          <div className="dashboard-stat-value">{metrics.totalCustomers}</div>

          <div className="dashboard-stat-footer">
            <span>Customer records</span>

            <span className="dashboard-stat-link">View customers →</span>
          </div>
        </Link>

        {/* QUALIFIED LEADS */}

        <Link
          to="/leads"
          className="dashboard-stat-card dashboard-stat-qualified"
        >
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">Qualified Leads</span>

            <span className="dashboard-stat-icon">✓</span>
          </div>

          <div className="dashboard-stat-value">{metrics.qualifiedLeads}</div>

          <div className="dashboard-stat-footer">
            <span>Ready for conversion</span>

            <span className="dashboard-stat-link">Review →</span>
          </div>
        </Link>

        {/* CONVERSION RATE */}

        <div className="dashboard-stat-card dashboard-stat-conversion">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">Conversion Rate</span>

            <span className="dashboard-stat-icon">↗</span>
          </div>

          <div className="dashboard-stat-value">{metrics.conversionRate}%</div>

          <div className="dashboard-stat-footer">
            <span>
              {metrics.convertedLeads} converted lead
              {metrics.convertedLeads === 1 ? "" : "s"}
            </span>

            <span className="dashboard-stat-link">Conversion →</span>
          </div>
        </div>
      </section>

      {/* ============================================================
          PIPELINE + SOURCES
          ============================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        {/* ==========================================================
            PIPELINE
            ========================================================== */}

        <div className="dashboard-card pipeline-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">SALES PIPELINE</span>

              <h2>Lead Pipeline</h2>

              <p>
                Distribution of leads across their current lifecycle stages.
              </p>
            </div>

            <Link to="/leads" className="dashboard-card-action">
              Manage →
            </Link>
          </div>

          {pipeline.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">◈</div>

              <h3>No pipeline data</h3>

              <p>
                Lead lifecycle information will appear here when leads are
                available.
              </p>
            </div>
          ) : (
            <div className="pipeline-list">
              {pipeline.map((stage) => (
                <div className="pipeline-row" key={stage.key}>
                  <div className="pipeline-row-header">
                    <div className="pipeline-stage">
                      <span
                        className={`pipeline-dot pipeline-dot-${stage.key}`}
                      />

                      <span>{stage.label}</span>
                    </div>

                    <div className="pipeline-count">
                      <strong>{stage.count}</strong>

                      <span>{stage.percentage}%</span>
                    </div>
                  </div>

                  <div className="pipeline-bar">
                    <div
                      className={`pipeline-bar-fill pipeline-bar-${stage.key}`}
                      style={{
                        width: `${stage.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==========================================================
            LEAD SOURCES
            ========================================================== */}

        <div className="dashboard-card source-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">ACQUISITION</span>

              <h2>Lead Sources</h2>

              <p>Where your current leads are coming from.</p>
            </div>
          </div>

          {leadSources.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">◌</div>

              <h3>No source data</h3>

              <p>
                Lead channel information will appear here once leads are
                created.
              </p>
            </div>
          ) : (
            <div className="source-list">
              {leadSources.slice(0, 5).map((source, index) => (
                <div className="source-row" key={source.name}>
                  <div className="source-info">
                    <span className="source-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="source-name">{source.name}</span>
                  </div>

                  <div className="source-value">
                    <strong>{source.count}</strong>

                    <span>{source.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          RECENT LEADS + QUICK ACTIONS
          ============================================================ */}

      <section className="dashboard-grid dashboard-grid-secondary">
        {/* ==========================================================
            RECENT LEADS
            ========================================================== */}

        <div className="dashboard-card recent-leads-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">RECENT ACTIVITY</span>

              <h2>Recent Leads</h2>

              <p>Latest leads entering the customer pipeline.</p>
            </div>

            <Link to="/leads" className="dashboard-card-action">
              View all →
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">◈</div>

              <h3>No leads yet</h3>

              <p>Create your first lead to start building the pipeline.</p>

              <Link to="/leads" className="btn btn-primary">
                Add Lead
              </Link>
            </div>
          ) : (
            <div className="recent-leads-list">
              {recentLeads.map((lead) => {
                const name = getDisplayName(lead);

                const status = lead.status || "New";

                const servicesForLead = getServiceNames(lead);

                return (
                  <Link to="/leads" className="recent-lead-row" key={lead.id}>
                    <div className="recent-lead-avatar">
                      {getInitials(name)}
                    </div>

                    <div className="recent-lead-main">
                      <div className="recent-lead-name">{name}</div>

                      <div className="recent-lead-meta">
                        <span>{lead.company || "No company"}</span>

                        {lead.channel && (
                          <>
                            <span className="recent-lead-separator">•</span>

                            <span>{lead.channel}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="recent-lead-services">
                      {servicesForLead.length > 0 ? (
                        <>
                          <span className="service-count">
                            {servicesForLead.length}
                          </span>

                          <span>
                            {servicesForLead.length === 1
                              ? "service"
                              : "services"}
                          </span>
                        </>
                      ) : (
                        <span className="muted">No services</span>
                      )}
                    </div>

                    <div className="recent-lead-status">
                      <span
                        className={`status-pill status-${normalizeStatus(
                          status,
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <span className="recent-lead-arrow">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ==========================================================
            QUICK ACTIONS
            ========================================================== */}

        <div className="dashboard-card quick-actions-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">SHORTCUTS</span>

              <h2>Quick Actions</h2>

              <p>Jump directly into common operations.</p>
            </div>
          </div>

          <div className="quick-actions-grid">
            <Link to="/leads/new" className="quick-action">
              <span className="quick-action-icon">+</span>

              <span className="quick-action-content">
                <strong>Create Lead</strong>

                <small>Add a new prospect</small>
              </span>

              <span className="quick-action-arrow">→</span>
            </Link>

            <Link to="/customers/new" className="quick-action">
              <span className="quick-action-icon">◉</span>

              <span className="quick-action-content">
                <strong>Customers</strong>

                <small>Manage customer records</small>
              </span>

              <span className="quick-action-arrow">→</span>
            </Link>

            <Link to="/services" className="quick-action">
              <span className="quick-action-icon">⚙</span>

              <span className="quick-action-content">
                <strong>Services</strong>

                <small>Manage service catalog</small>
              </span>

              <span className="quick-action-arrow">→</span>
            </Link>

            <Link to="/leads" className="quick-action">
              <span className="quick-action-icon">✓</span>

              <span className="quick-action-content">
                <strong>Review Leads</strong>

                <small>Check pipeline activity</small>
              </span>

              <span className="quick-action-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SERVICE DEMAND + NEEDS ATTENTION
          ============================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        {/* ==========================================================
            SERVICE DEMAND
            ========================================================== */}

        <div className="dashboard-card service-demand-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">SERVICE ANALYTICS</span>

              <h2>Service Demand</h2>

              <p>Most requested services across leads and customers.</p>
            </div>

            <Link to="/services" className="dashboard-card-action">
              Catalog →
            </Link>
          </div>

          {serviceDemand.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">⚙</div>

              <h3>No service demand yet</h3>

              <p>
                Service demand will appear once services are assigned to leads
                or customers.
              </p>
            </div>
          ) : (
            <div className="service-demand-list">
              {serviceDemand.map((service, index) => {
                const maximum = serviceDemand[0]?.count || 1;

                const percentage = Math.round((service.count / maximum) * 100);

                return (
                  <div className="service-demand-row" key={service.name}>
                    <div className="service-demand-header">
                      <div className="service-demand-name">
                        <span className="service-demand-rank">{index + 1}</span>

                        <span>{service.name}</span>
                      </div>

                      <strong>{service.count}</strong>
                    </div>

                    <div className="service-demand-bar">
                      <div
                        className="service-demand-bar-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==========================================================
            NEEDS ATTENTION
            ========================================================== */}

        <div className="dashboard-card attention-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">OPERATIONS</span>

              <h2>Needs Attention</h2>

              <p>Items that may require follow-up.</p>
            </div>
          </div>

          {attentionItems.length === 0 ? (
            <div className="dashboard-empty dashboard-empty-success">
              <div className="dashboard-empty-icon">✓</div>

              <h3>Everything looks good</h3>

              <p>No immediate data-quality or follow-up items were detected.</p>
            </div>
          ) : (
            <div className="attention-list">
              {attentionItems.map((item, index) => (
                <Link
                  to={item.link}
                  className={`attention-item attention-${item.type}`}
                  key={`${item.title}-${index}`}
                >
                  <div className="attention-icon">
                    {item.type === "warning"
                      ? "!"
                      : item.type === "info"
                        ? "i"
                        : "•"}
                  </div>

                  <div className="attention-content">
                    <strong>{item.title}</strong>

                    <p>{item.description}</p>

                    <span>{item.action} →</span>
                  </div>

                  <div className="attention-count">{item.count}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SERVICE CATALOG SUMMARY
          ============================================================ */}

      <section className="dashboard-card service-summary-card">
        <div className="dashboard-card-header">
          <div>
            <span className="dashboard-card-eyebrow">SERVICE CATALOG</span>

            <h2>Service Catalog</h2>

            <p>
              Overview of services currently available to your customer
              operations team.
            </p>
          </div>

          <Link to="/services" className="dashboard-card-action">
            Manage services →
          </Link>
        </div>

        <div className="service-summary-grid">
          {/* TOTAL SERVICES */}

          <div className="service-summary-item">
            <span className="service-summary-icon">⚙</span>

            <div>
              <strong>{serviceCatalog.totalServices}</strong>

              <span>Total services</span>
            </div>
          </div>

          {/* ACTIVE SERVICES */}

          <div className="service-summary-item">
            <span className="service-summary-icon">✓</span>

            <div>
              <strong>{serviceCatalog.activeServices}</strong>

              <span>Active services</span>
            </div>
          </div>

          {/* SERVICES IN DEMAND */}

          <div className="service-summary-item">
            <span className="service-summary-icon">◈</span>

            <div>
              <strong>{serviceCatalog.servicesInDemand}</strong>

              <span>Services in demand</span>
            </div>
          </div>

          {/* MANAGED RECORDS */}

          <div className="service-summary-item">
            <span className="service-summary-icon">◉</span>

            <div>
              <strong>{managedRecords}</strong>

              <span>Managed records</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SYSTEM STATUS
          ============================================================ */}

      <section className="dashboard-system-status">
        <div className="system-status-left">
          <span className="system-status-dot" />

          <div>
            <strong>Customer Management Platform</strong>

            <span>
              Dashboard data is being served by the independent domain services
              through the API Gateway.
            </span>
          </div>
        </div>

        <div className="system-status-right">
          <span>Lead Service</span>

          <span>Customer Service</span>

          <span>Service Catalog</span>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
