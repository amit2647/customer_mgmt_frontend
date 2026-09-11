import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createLead,
  getLead,
  updateLead,
  updateLeadServices,
} from "../../api/leads";

import LeadWorkflow from "../../components/leads/LeadWorkflow";

function LeadWorkflowPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState("");

  /*
   * =========================================================
   * LOAD LEAD FOR EDITING
   * =========================================================
   */

  useEffect(() => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }

    async function loadLead() {
      try {
        setLoading(true);
        setError("");

        const data = await getLead(id);

        setLead(data);
      } catch (err) {
        console.error("Failed to load lead:", err);

        setError(err.message || "Failed to load lead.");
      } finally {
        setLoading(false);
      }
    }

    loadLead();
  }, [id]);

  /*
   * =========================================================
   * SAVE LEAD
   * =========================================================
   */

  async function handleSubmit(data) {
    if (!isEditing) {
      await createLead(data);

      navigate("/leads");

      return;
    }

    const { serviceIds = [], ...leadData } = data;

    await updateLead(id, leadData);

    await updateLeadServices(id, serviceIds);

    navigate("/leads");
  }

  /*
   * =========================================================
   * CANCEL / BACK
   * =========================================================
   */

  function handleClose() {
    navigate("/leads");
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="workflow-page-state">
        <div className="workflow-page-state-icon">○</div>

        <h2>Loading lead</h2>

        <p>Preparing the lead workflow...</p>
      </div>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error) {
    return (
      <div className="workflow-page-state">
        <div className="workflow-page-state-icon error">!</div>

        <h2>Unable to load lead</h2>

        <p>{error}</p>

        <button
          type="button"
          className="primary"
          onClick={() => navigate("/leads")}
        >
          Back to Leads
        </button>
      </div>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="lead-workflow-page">
      <div className="lead-workflow-page-topbar">
        <button
          type="button"
          className="workflow-back-button"
          onClick={handleClose}
        >
          ← Back to Leads
        </button>

        <div className="workflow-page-context">
          <span>LEAD MANAGEMENT</span>

          <strong>{isEditing ? "Edit Lead" : "Create Lead"}</strong>
        </div>
      </div>

      <LeadWorkflow lead={lead} onSubmit={handleSubmit} onClose={handleClose} />
    </div>
  );
}

export default LeadWorkflowPage;
