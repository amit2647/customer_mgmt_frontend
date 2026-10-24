import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getLeads, deleteLead, convertLead } from "../../api/leads";

import LeadTable from "../../components/leads/LeadTable";
import { confirmAction, toast } from "../../components/ui/feedback";

function LeadsPage() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
   * =========================================================
   * LOAD LEADS
   * =========================================================
   */

  async function loadLeads() {
    try {
      setLoading(true);

      // The whole list: the table searches, sorts and filters it.
      const data = await getLeads("");

      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  /*
   * =========================================================
   * CREATE
   * =========================================================
   */

  function handleCreate() {
    navigate("/leads/new");
  }

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  function handleView(lead) {
    navigate(`/leads/${lead.id}`);
  }

  function handleEdit(lead) {
    navigate(`/leads/${lead.id}/edit`);
  }

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  async function handleDelete(id) {
    const confirmed = await confirmAction({ title: "Delete this lead?", message: "It cannot be recovered.", confirmLabel: "Delete", danger: true });

    if (!confirmed) {
      return;
    }

    try {
      await deleteLead(id);
      toast.success("Lead deleted.");

      await loadLeads();
    } catch (error) {
      toast.error(error.message || "Failed to delete lead.");
    }
  }

  /*
   * =========================================================
   * CONVERT
   * =========================================================
   */

  async function handleConvert(id) {
    const confirmed = await confirmAction({ title: "Convert this lead into a customer?", confirmLabel: "Convert" });

    if (!confirmed) {
      return;
    }

    try {
      await convertLead(id);
      toast.success("Lead converted into a customer.");

      await loadLeads();
    } catch (error) {
      toast.error(error.message || "Failed to convert lead.");
    }
  }

  return (
    <div className="leads-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <header className="page-header">
        <div>
          {/* <span className="page-eyebrow">CUSTOMER ACQUISITION</span> */}

          <h1>Leads</h1>

          <p>Manage prospects across every customer touchpoint.</p>
        </div>

        <button type="button" className="primary" onClick={handleCreate}>
          + Add Lead
        </button>
      </header>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <LeadTable
        leads={leads}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConvert={handleConvert}
      />
    </div>
  );
}

export default LeadsPage;
