import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getLead } from "../../api/leads";

import ChannelBadge from "../../components/common/ChannelBadge";
import StatusBadge from "../../components/common/StatusBadge";
import CommunicationPanel from "../../components/communications/CommunicationPanel";
import Field, { formatDate } from "../../components/common/Field";

function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getLead(id);

      setLead(data?.lead || data);
    } catch (requestError) {
      console.error("Failed to load lead:", requestError);

      setError(requestError.message || "Failed to load the lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="page record-detail-page">
        <div className="communication-empty">Loading lead...</div>
      </main>
    );
  }

  if (error || !lead) {
    return (
      <main className="page record-detail-page">
        <div className="alert alert-error" role="alert">
          <span>{error || "Lead not found."}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="page record-detail-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/leads")}>
          ← Back to Leads
        </button>

        <div className="workflow-context">
          <span>LEADS</span>
          <strong>{lead.name}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <span className="page-eyebrow">LEAD</span>

          <h1>{lead.name}</h1>

          <p>{lead.company || "No company"}</p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
          >
            Edit Lead
          </button>
        </div>
      </div>

      <section className="record-details">
        <Field label="Status">
          <StatusBadge status={lead.status} />
        </Field>

        <Field label="Channel">
          <ChannelBadge channel={lead.channel} />
        </Field>

        <Field label="Score" value={lead.score ?? 0} />

        <Field label="Company" value={lead.company} />

        <Field label="Email" value={lead.email} href={lead.email && `mailto:${lead.email}`} />

        <Field label="Phone" value={lead.phone} href={lead.phone && `tel:${lead.phone}`} />

        <Field label="Created" value={formatDate(lead.created_at)} />

        <Field label="Last updated" value={formatDate(lead.updated_at)} />
      </section>

      <CommunicationPanel
        record={{ type: "lead", id: lead.id, email: lead.email }}
      />
    </main>
  );
}

export default LeadDetailPage;
