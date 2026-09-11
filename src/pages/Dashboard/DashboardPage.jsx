import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getLeads } from "../../api/leads";
import { getCustomers } from "../../api/customers";
import { getServices } from "../../api/services";

function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      // Load the three existing domain APIs in parallel.
      const [leadData, customerData, serviceData] = await Promise.all([
        getLeads(),
        getCustomers(),
        getServices(),
      ]);

      setLeads(Array.isArray(leadData) ? leadData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
   * Calculate the main dashboard metrics from the
   * actual lead/customer/service data.
   */
  const metrics = useMemo(() => {
    const qualified = leads.filter(
      (lead) => lead.status?.toLowerCase() === "qualified",
    ).length;

    const converted = leads.filter(
      (lead) => lead.status?.toLowerCase() === "converted",
    ).length;

    return {
      leads: leads.length,
      customers: customers.length,
      qualified,
      converted,
    };
  }, [leads, customers]);

  /*
   * Lead pipeline.
   *
   * We explicitly define the order because the database
   * may not return statuses in the order we want.
   */
  const pipeline = useMemo(() => {
    const statuses = ["New", "Contacted", "Qualified", "Converted", "Lost"];

    return statuses.map((status) => ({
      status,
      count: leads.filter(
        (lead) => lead.status?.toLowerCase() === status.toLowerCase(),
      ).length,
    }));
  }, [leads]);

  /*
   * Lead acquisition channels.
   */
  const channels = useMemo(() => {
    const counts = {};

    leads.forEach((lead) => {
      const channel = lead.channel?.trim() || "Unknown";

      counts[channel] = (counts[channel] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([channel, count]) => ({
        channel,
        count,
        percentage:
          leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  /*
   * Find which services are being requested across
   * leads and customers.
   */
  const serviceDemand = useMemo(() => {
    const counts = {};

    leads.forEach((lead) => {
      (lead.services || []).forEach((service) => {
        const key = Number(service.id);

        if (!counts[key]) {
          counts[key] = {
            id: key,
            name: service.name,
            count: 0,
          };
        }

        counts[key].count += 1;
      });
    });

    customers.forEach((customer) => {
      (customer.services || []).forEach((service) => {
        const key = Number(service.id);

        if (!counts[key]) {
          counts[key] = {
            id: key,
            name: service.name,
            count: 0,
          };
        }

        counts[key].count += 1;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [leads, customers]);

  /*
   * Recent leads.
   *
   * The backend normally returns newest records first.
   * We still make a defensive copy before slicing.
   */
  const recentLeads = useMemo(() => {
    return [...leads].slice(0, 5);
  }, [leads]);

  /*
   * Operational items that need attention.
   */
  const attention = useMemo(() => {
    const items = [];

    const qualified = leads.filter(
      (lead) => lead.status?.toLowerCase() === "qualified",
    ).length;

    const leadsWithoutServices = leads.filter(
      (lead) => !lead.services || lead.services.length === 0,
    ).length;

    const customersWithoutServices = customers.filter(
      (customer) => !customer.services || customer.services.length === 0,
    ).length;

    if (qualified > 0) {
      items.push({
        type: "qualified",
        title: `${qualified} qualified lead${
          qualified === 1 ? "" : "s"
        } ready for conversion`,
        description: "Review qualified leads and convert suitable prospects.",
        link: "/leads",
        action: "View leads",
      });
    }

    if (leadsWithoutServices > 0) {
      items.push({
        type: "lead-services",
        title: `${leadsWithoutServices} lead${
          leadsWithoutServices === 1 ? "" : "s"
        } without services`,
        description: "Some leads do not have a service requirement assigned.",
        link: "/leads",
        action: "Review leads",
      });
    }

    if (customersWithoutServices > 0) {
      items.push({
        type: "customer-services",
        title: `${customersWithoutServices} customer${
          customersWithoutServices === 1 ? "" : "s"
        } without services`,
        description: "Consider assigning services to these customers.",
        link: "/customers",
        action: "Review customers",
      });
    }

    return items;
  }, [leads, customers]);

  function getStatusClass(status) {
    return status?.toLowerCase() || "new";
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <h2>Loading dashboard</h2>
        <p>Gathering leads, customers and service information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error-icon">!</div>

        <h2>Dashboard unavailable</h2>

        <p>{error}</p>

        <button className="primary" onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  const maxPipeline = Math.max(...pipeline.map((item) => item.count), 1);

  const maxServiceDemand = Math.max(
    ...serviceDemand.map((item) => item.count),
    1,
  );

  return (
    <div className="dashboard">
      {/* -------------------------------------------------
          PAGE HEADER
      -------------------------------------------------- */}
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">CUSTOMER OPERATIONS</div>

          <h1>Dashboard</h1>

          <p>
            Monitor your leads, customers and service activity from one place.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button className="secondary-button" onClick={loadDashboard}>
            ↻ Refresh
          </button>

          <Link to="/leads" className="primary">
            + Add Lead
          </Link>
        </div>
      </header>

      {/* -------------------------------------------------
          KPI CARDS
      -------------------------------------------------- */}
      <section className="dashboard-metrics">
        <Link to="/leads" className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Total Leads</span>

            <span className="metric-icon">◈</span>
          </div>

          <strong className="metric-value">{metrics.leads}</strong>

          <span className="metric-link">View all leads →</span>
        </Link>

        <Link to="/customers" className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Customers</span>

            <span className="metric-icon">◉</span>
          </div>

          <strong className="metric-value">{metrics.customers}</strong>

          <span className="metric-link">View customers →</span>
        </Link>

        <Link to="/leads" className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Qualified Leads</span>

            <span className="metric-icon">✓</span>
          </div>

          <strong className="metric-value">{metrics.qualified}</strong>

          <span className="metric-link">Review qualified →</span>
        </Link>

        <Link to="/leads" className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Converted Leads</span>

            <span className="metric-icon">↗</span>
          </div>

          <strong className="metric-value">{metrics.converted}</strong>

          <span className="metric-link">View conversions →</span>
        </Link>
      </section>

      {/* -------------------------------------------------
          MAIN ANALYTICS
      -------------------------------------------------- */}
      <section className="dashboard-grid dashboard-grid-main">
        {/* PIPELINE */}
        <div className="dashboard-card pipeline-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Lead Pipeline</h2>
              <p>Current distribution of your prospects.</p>
            </div>

            <Link to="/leads">View leads →</Link>
          </div>

          <div className="pipeline">
            {pipeline.map((item) => (
              <Link key={item.status} to="/leads" className="pipeline-row">
                <div className="pipeline-label">
                  <span
                    className={`pipeline-dot ${getStatusClass(item.status)}`}
                  />

                  <span>{item.status}</span>
                </div>

                <div className="pipeline-track">
                  <div
                    className={`pipeline-bar ${getStatusClass(item.status)}`}
                    style={{
                      width: `${Math.max(
                        (item.count / maxPipeline) * 100,
                        item.count > 0 ? 4 : 0,
                      )}%`,
                    }}
                  />
                </div>

                <strong className="pipeline-count">{item.count}</strong>
              </Link>
            ))}
          </div>
        </div>

        {/* CHANNELS */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Lead Sources</h2>
              <p>Where your prospects are coming from.</p>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="dashboard-empty">
              No lead source data available.
            </div>
          ) : (
            <div className="channel-list">
              {channels.slice(0, 6).map((item) => (
                <div key={item.channel} className="channel-row">
                  <div className="channel-row-top">
                    <span>{item.channel}</span>

                    <strong>{item.percentage}%</strong>
                  </div>

                  <div className="channel-track">
                    <div
                      className="channel-bar"
                      style={{
                        width: `${item.percentage}%`,
                      }}
                    />
                  </div>

                  <small>
                    {item.count} lead
                    {item.count === 1 ? "" : "s"}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------
          RECENT LEADS + QUICK ACTIONS
      -------------------------------------------------- */}
      <section className="dashboard-grid dashboard-grid-secondary">
        {/* RECENT LEADS */}
        <div className="dashboard-card recent-leads-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Recent Leads</h2>
              <p>Your latest prospects and opportunities.</p>
            </div>

            <Link to="/leads">View all →</Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="dashboard-empty">
              <strong>No leads yet</strong>
              <span>
                Create your first lead to start tracking opportunities.
              </span>

              <Link to="/leads" className="primary">
                + Add Lead
              </Link>
            </div>
          ) : (
            <div className="recent-leads">
              {recentLeads.map((lead) => (
                <Link key={lead.id} to="/leads" className="recent-lead-row">
                  <div className="recent-lead-avatar">
                    {lead.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>

                  <div className="recent-lead-info">
                    <strong>{lead.name || "Unnamed lead"}</strong>

                    <span>{lead.company || "No company"}</span>
                  </div>

                  <div className="recent-lead-meta">
                    <span className={`status ${getStatusClass(lead.status)}`}>
                      {lead.status || "New"}
                    </span>

                    <span className="lead-score">{lead.score ?? 0}</span>
                  </div>

                  <span className="row-arrow">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="dashboard-card quick-actions-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Jump directly into common tasks.</p>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/leads" className="quick-action">
              <span className="quick-action-icon">+</span>

              <span>
                <strong>Add Lead</strong>
                <small>Create a new prospect</small>
              </span>

              <span>→</span>
            </Link>

            <Link to="/customers" className="quick-action">
              <span className="quick-action-icon">+</span>

              <span>
                <strong>Add Customer</strong>
                <small>Create a customer record</small>
              </span>

              <span>→</span>
            </Link>

            <Link to="/services" className="quick-action">
              <span className="quick-action-icon">+</span>

              <span>
                <strong>Add Service</strong>
                <small>Add to the service catalog</small>
              </span>

              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------
          SERVICE DEMAND + ATTENTION
      -------------------------------------------------- */}
      <section className="dashboard-grid dashboard-grid-secondary">
        {/* SERVICE DEMAND */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Service Demand</h2>
              <p>Services currently associated with leads and customers.</p>
            </div>

            <Link to="/services">Manage services →</Link>
          </div>

          {serviceDemand.length === 0 ? (
            <div className="dashboard-empty">No service assignments found.</div>
          ) : (
            <div className="service-demand">
              {serviceDemand.map((service) => (
                <Link
                  key={service.id}
                  to="/services"
                  className="service-demand-row"
                >
                  <div className="service-demand-name">
                    <span className="service-demand-icon">⚙</span>

                    <span>{service.name}</span>
                  </div>

                  <div className="service-demand-track">
                    <div
                      className="service-demand-bar"
                      style={{
                        width: `${Math.max(
                          (service.count / maxServiceDemand) * 100,
                          4,
                        )}%`,
                      }}
                    />
                  </div>

                  <strong>{service.count}</strong>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* NEEDS ATTENTION */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Needs Attention</h2>
              <p>Items that may require action.</p>
            </div>
          </div>

          {attention.length === 0 ? (
            <div className="attention-empty">
              <div className="attention-check">✓</div>

              <strong>Everything looks good</strong>

              <span>
                There are currently no outstanding items requiring attention.
              </span>
            </div>
          ) : (
            <div className="attention-list">
              {attention.map((item) => (
                <Link key={item.type} to={item.link} className="attention-item">
                  <div className="attention-icon">!</div>

                  <div className="attention-content">
                    <strong>{item.title}</strong>

                    <span>{item.description}</span>

                    <small>{item.action} →</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------
          SERVICE CATALOG SUMMARY
      -------------------------------------------------- */}
      <section className="dashboard-footer-summary">
        <div>
          <span className="summary-icon">⚙</span>

          <div>
            <strong>
              {services.length} service
              {services.length === 1 ? "" : "s"} in catalog
            </strong>

            <span>
              {services.filter((service) => service.status === "Active").length}{" "}
              active services available for assignment
            </span>
          </div>
        </div>

        <Link to="/services" className="secondary-button">
          Manage Services →
        </Link>
      </section>
    </div>
  );
}

export default DashboardPage;
