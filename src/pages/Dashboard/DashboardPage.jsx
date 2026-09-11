import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getLeads } from "../../api/leads";
import { getCustomers } from "../../api/customers";
import { getServices } from "../../api/services";
import LoadingScreen from "../../components/common/LoadingScreen";

import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";

function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ================================================================
     LOAD DASHBOARD
     ================================================================ */

  const loadDashboard = async ({ initial = false } = {}) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [leadData, customerData, serviceData] = await Promise.all([
        getLeads(),
        getCustomers(),
        getServices(),
      ]);

      setLeads(Array.isArray(leadData) ? leadData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
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
  };

  useEffect(() => {
    loadDashboard({ initial: true });
  }, []);

  /* ================================================================
     HELPERS
     ================================================================ */

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const getDisplayName = (item) => {
    if (!item) return "Unknown";

    if (item.name) return item.name;

    const fullName = [item.firstName, item.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) return fullName;

    return item.company || item.email || `Record #${item.id}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";

    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getServiceNames = (item) => {
    if (!item) return [];

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
        .map((serviceId) => {
          const service = services.find(
            (candidate) => String(candidate.id) === String(serviceId),
          );

          return service?.name;
        })
        .filter(Boolean);
    }

    return [];
  };

  const getDateValue = (item) => {
    return (
      item?.createdAt ||
      item?.created_at ||
      item?.updatedAt ||
      item?.updated_at ||
      null
    );
  };

  /* ================================================================
     KPI METRICS
     ================================================================ */

  const metrics = useMemo(() => {
    const qualifiedLeads = leads.filter(
      (lead) => normalizeStatus(lead.status) === "qualified",
    ).length;

    const convertedLeads = leads.filter(
      (lead) => normalizeStatus(lead.status) === "converted",
    ).length;

    const conversionRate =
      leads.length > 0
        ? Math.round((convertedLeads / leads.length) * 1000) / 10
        : 0;

    return {
      totalLeads: leads.length,
      totalCustomers: customers.length,
      qualifiedLeads,
      convertedLeads,
      conversionRate,
    };
  }, [leads, customers]);

  /* ================================================================
     PIPELINE
     ================================================================ */

  const pipeline = useMemo(() => {
    const stages = [
      {
        key: "new",
        label: "New",
      },
      {
        key: "contacted",
        label: "Contacted",
      },
      {
        key: "qualified",
        label: "Qualified",
      },
      {
        key: "converted",
        label: "Converted",
      },
      {
        key: "lost",
        label: "Lost",
      },
    ];

    return stages.map((stage) => {
      const count = leads.filter(
        (lead) => normalizeStatus(lead.status) === stage.key,
      ).length;

      const percentage =
        leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;

      return {
        ...stage,
        count,
        percentage,
      };
    });
  }, [leads]);

  /* ================================================================
     LEAD SOURCES
     ================================================================ */

  const leadSources = useMemo(() => {
    const sourceMap = {};

    leads.forEach((lead) => {
      const source =
        lead.channel || lead.source || lead.leadSource || "Unknown";

      const normalized = String(source).trim();

      if (!normalized) return;

      sourceMap[normalized] = (sourceMap[normalized] || 0) + 1;
    });

    return Object.entries(sourceMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  /* ================================================================
     SERVICE DEMAND
     ================================================================ */

  const serviceDemand = useMemo(() => {
    const demandMap = {};

    const addServices = (records) => {
      records.forEach((record) => {
        const recordServices = getServiceNames(record);

        recordServices.forEach((serviceName) => {
          demandMap[serviceName] = (demandMap[serviceName] || 0) + 1;
        });
      });
    };

    addServices(leads);
    addServices(customers);

    return Object.entries(demandMap)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [leads, customers, services]);

  /* ================================================================
     RECENT LEADS
     ================================================================ */

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => {
        const dateA = new Date(getDateValue(a) || 0).getTime();
        const dateB = new Date(getDateValue(b) || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [leads]);

  /* ================================================================
     ATTENTION ITEMS
     ================================================================ */

  const attentionItems = useMemo(() => {
    const items = [];

    const qualifiedWithoutServices = leads.filter(
      (lead) =>
        normalizeStatus(lead.status) === "qualified" &&
        getServiceNames(lead).length === 0,
    );

    if (qualifiedWithoutServices.length > 0) {
      items.push({
        type: "warning",
        title: "Qualified leads need services",
        description: `${qualifiedWithoutServices.length} qualified lead${
          qualifiedWithoutServices.length === 1 ? "" : "s"
        } have no services assigned.`,
        count: qualifiedWithoutServices.length,
        link: "/leads",
        action: "Review leads",
      });
    }

    const leadsWithoutServices = leads.filter(
      (lead) => getServiceNames(lead).length === 0,
    );

    if (leadsWithoutServices.length > 0) {
      items.push({
        type: "info",
        title: "Leads without services",
        description: `${leadsWithoutServices.length} lead${
          leadsWithoutServices.length === 1 ? "" : "s"
        } currently have no service mapping.`,
        count: leadsWithoutServices.length,
        link: "/leads",
        action: "Assign services",
      });
    }

    const customersWithoutServices = customers.filter(
      (customer) => getServiceNames(customer).length === 0,
    );

    if (customersWithoutServices.length > 0) {
      items.push({
        type: "neutral",
        title: "Customers without services",
        description: `${customersWithoutServices.length} customer${
          customersWithoutServices.length === 1 ? "" : "s"
        } have no services assigned.`,
        count: customersWithoutServices.length,
        link: "/customers",
        action: "Review customers",
      });
    }

    return items.slice(0, 4);
  }, [leads, customers, services]);

  /* ================================================================
     SERVICE CATALOG
     ================================================================ */

  const activeServices = useMemo(() => {
    return services.filter((service) => {
      const status = normalizeStatus(service.status);

      return !status || status === "active" || status === "enabled";
    }).length;
  }, [services]);

  /* ================================================================
     LOADING STATE
     ================================================================ */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* ================================================================
     ERROR STATE
     ================================================================ */

  if (error && leads.length === 0 && customers.length === 0) {
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
              onClick={() => loadDashboard({ initial: true })}
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
              Make sure Kong/API Gateway and the Lead, Customer and Service
              services are running.
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
      {/* ================================================================
          HEADER
          ================================================================ */}

      <header className="page-header dashboard-header">
        <div>
          <span className="eyebrow">CUSTOMER OPERATIONS</span>

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

          {/* <Link to="/leads" className="btn btn-primary">
            <span>+</span>
            Add Lead
          </Link> */}
        </div>
      </header>

      {/* ================================================================
          INLINE ERROR
          ================================================================ */}

      {error && (
        <div className="dashboard-inline-error">
          <span className="dashboard-inline-error-icon">!</span>

          <span>{error}</span>

          <button type="button" onClick={() => loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      {/* ================================================================
          KPI CARDS
          ================================================================ */}

      <section className="dashboard-stats">
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

      {/* ================================================================
          PIPELINE + SOURCES
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        {/* PIPELINE */}

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
        </div>

        {/* LEAD SOURCES */}

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

      {/* ================================================================
          RECENT LEADS + QUICK ACTIONS
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-secondary">
        {/* RECENT LEADS */}

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

        {/* QUICK ACTIONS */}

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

      {/* ================================================================
          SERVICE DEMAND + NEEDS ATTENTION
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        {/* SERVICE DEMAND */}

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

        {/* NEEDS ATTENTION */}

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

      {/* ================================================================
          SERVICE CATALOG SUMMARY
          ================================================================ */}

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
          <div className="service-summary-item">
            <span className="service-summary-icon">⚙</span>

            <div>
              <strong>{services.length}</strong>

              <span>Total services</span>
            </div>
          </div>

          <div className="service-summary-item">
            <span className="service-summary-icon">✓</span>

            <div>
              <strong>{activeServices}</strong>

              <span>Active services</span>
            </div>
          </div>

          <div className="service-summary-item">
            <span className="service-summary-icon">◈</span>

            <div>
              <strong>{serviceDemand.length}</strong>

              <span>Services in demand</span>
            </div>
          </div>

          <div className="service-summary-item">
            <span className="service-summary-icon">◉</span>

            <div>
              <strong>{customers.length + leads.length}</strong>

              <span>Managed records</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SYSTEM STATUS
          ================================================================ */}

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
