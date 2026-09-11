function DashboardSkeleton() {
  return (
    <div className="dashboard-page dashboard-skeleton-page">
      {/* ================================================================
          HEADER
          ================================================================ */}

      <header className="page-header dashboard-header">
        <div className="dashboard-skeleton-header-copy">
          <div className="skeleton skeleton-eyebrow" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-description" />
        </div>

        <div className="dashboard-skeleton-header-actions">
          <div className="skeleton skeleton-button" />
        </div>
      </header>

      {/* ================================================================
          KPI CARDS
          ================================================================ */}

      <section className="dashboard-stats">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </section>

      {/* ================================================================
          PIPELINE + SOURCES
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        <div className="dashboard-card pipeline-card">
          <SkeletonCardHeader />

          <div className="skeleton-pipeline-list">
            <SkeletonPipelineRow />
            <SkeletonPipelineRow />
            <SkeletonPipelineRow />
            <SkeletonPipelineRow />
            <SkeletonPipelineRow />
          </div>
        </div>

        <div className="dashboard-card source-card">
          <SkeletonCardHeader />

          <div className="skeleton-source-list">
            <SkeletonSourceRow />
            <SkeletonSourceRow />
            <SkeletonSourceRow />
            <SkeletonSourceRow />
            <SkeletonSourceRow />
          </div>
        </div>
      </section>

      {/* ================================================================
          RECENT LEADS + QUICK ACTIONS
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-secondary">
        <div className="dashboard-card recent-leads-card">
          <SkeletonCardHeader />

          <div className="skeleton-recent-leads-list">
            <SkeletonRecentLead />
            <SkeletonRecentLead />
            <SkeletonRecentLead />
            <SkeletonRecentLead />
            <SkeletonRecentLead />
          </div>
        </div>

        <div className="dashboard-card quick-actions-card">
          <SkeletonCardHeader />

          <div className="skeleton-quick-actions">
            <SkeletonQuickAction />
            <SkeletonQuickAction />
            <SkeletonQuickAction />
            <SkeletonQuickAction />
          </div>
        </div>
      </section>

      {/* ================================================================
          SERVICE DEMAND + ATTENTION
          ================================================================ */}

      <section className="dashboard-grid dashboard-grid-main">
        <div className="dashboard-card service-demand-card">
          <SkeletonCardHeader />

          <div className="skeleton-service-list">
            <SkeletonServiceRow />
            <SkeletonServiceRow />
            <SkeletonServiceRow />
            <SkeletonServiceRow />
            <SkeletonServiceRow />
          </div>
        </div>

        <div className="dashboard-card attention-card">
          <SkeletonCardHeader />

          <div className="skeleton-attention-list">
            <SkeletonAttentionItem />
            <SkeletonAttentionItem />
            <SkeletonAttentionItem />
          </div>
        </div>
      </section>

      {/* ================================================================
          SERVICE CATALOG SUMMARY
          ================================================================ */}

      <section className="dashboard-card service-summary-card">
        <SkeletonCardHeader />

        <div className="skeleton-service-summary">
          <SkeletonSummaryItem />
          <SkeletonSummaryItem />
          <SkeletonSummaryItem />
          <SkeletonSummaryItem />
        </div>
      </section>

      {/* ================================================================
          SYSTEM STATUS
          ================================================================ */}

      <section className="dashboard-system-status dashboard-skeleton-system">
        <div className="skeleton skeleton-system-dot" />

        <div className="skeleton-system-copy">
          <div className="skeleton skeleton-system-title" />
          <div className="skeleton skeleton-system-description" />
        </div>

        <div className="skeleton-system-services">
          <div className="skeleton skeleton-system-service" />
          <div className="skeleton skeleton-system-service" />
          <div className="skeleton skeleton-system-service" />
        </div>
      </section>
    </div>
  );
}

/* ================================================================
   REUSABLE SKELETON PARTS
   ================================================================ */

function SkeletonStatCard() {
  return (
    <div className="dashboard-stat-card dashboard-skeleton-stat">
      <div className="dashboard-stat-top">
        <div className="skeleton skeleton-stat-label" />
        <div className="skeleton skeleton-stat-icon" />
      </div>

      <div className="skeleton skeleton-stat-value" />

      <div className="dashboard-stat-footer">
        <div className="skeleton skeleton-stat-footer-text" />
        <div className="skeleton skeleton-stat-footer-link" />
      </div>
    </div>
  );
}

function SkeletonCardHeader() {
  return (
    <div className="dashboard-card-header">
      <div className="dashboard-skeleton-card-copy">
        <div className="skeleton skeleton-card-eyebrow" />
        <div className="skeleton skeleton-card-title" />
        <div className="skeleton skeleton-card-description" />
      </div>

      <div className="skeleton skeleton-card-action" />
    </div>
  );
}

function SkeletonPipelineRow() {
  return (
    <div className="skeleton-pipeline-row">
      <div className="skeleton-pipeline-header">
        <div className="skeleton-pipeline-stage">
          <div className="skeleton skeleton-pipeline-dot" />
          <div className="skeleton skeleton-pipeline-label" />
        </div>

        <div className="skeleton skeleton-pipeline-count" />
      </div>

      <div className="skeleton skeleton-pipeline-bar" />
    </div>
  );
}

function SkeletonSourceRow() {
  return (
    <div className="skeleton-source-row">
      <div className="skeleton skeleton-source-rank" />

      <div className="skeleton skeleton-source-name" />

      <div className="skeleton skeleton-source-value" />
    </div>
  );
}

function SkeletonRecentLead() {
  return (
    <div className="skeleton-recent-lead">
      <div className="skeleton skeleton-recent-avatar" />

      <div className="skeleton-recent-main">
        <div className="skeleton skeleton-recent-name" />
        <div className="skeleton skeleton-recent-meta" />
      </div>

      <div className="skeleton skeleton-recent-services" />

      <div className="skeleton skeleton-recent-status" />

      <div className="skeleton skeleton-recent-arrow" />
    </div>
  );
}

function SkeletonQuickAction() {
  return (
    <div className="skeleton-quick-action">
      <div className="skeleton skeleton-quick-icon" />

      <div className="skeleton-quick-copy">
        <div className="skeleton skeleton-quick-title" />
        <div className="skeleton skeleton-quick-description" />
      </div>

      <div className="skeleton skeleton-quick-arrow" />
    </div>
  );
}

function SkeletonServiceRow() {
  return (
    <div className="skeleton-service-row">
      <div className="skeleton-service-row-header">
        <div className="skeleton-service-name">
          <div className="skeleton skeleton-service-rank" />
          <div className="skeleton skeleton-service-label" />
        </div>

        <div className="skeleton skeleton-service-count" />
      </div>

      <div className="skeleton skeleton-service-bar" />
    </div>
  );
}

function SkeletonAttentionItem() {
  return (
    <div className="skeleton-attention-item">
      <div className="skeleton skeleton-attention-icon" />

      <div className="skeleton-attention-copy">
        <div className="skeleton skeleton-attention-title" />
        <div className="skeleton skeleton-attention-description" />
        <div className="skeleton skeleton-attention-action" />
      </div>

      <div className="skeleton skeleton-attention-count" />
    </div>
  );
}

function SkeletonSummaryItem() {
  return (
    <div className="service-summary-item skeleton-summary-item">
      <div className="skeleton skeleton-summary-icon" />

      <div className="skeleton-summary-copy">
        <div className="skeleton skeleton-summary-value" />
        <div className="skeleton skeleton-summary-label" />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
