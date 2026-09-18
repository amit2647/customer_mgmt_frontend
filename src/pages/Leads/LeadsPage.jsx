import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getLeads, deleteLead, convertLead } from "../../api/leads";

import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";
import LeadTable from "../../components/leads/LeadTable";

function LeadsPage() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * =========================================================
   * LOAD LEADS
   * =========================================================
   */

  async function loadLeads() {
    try {
      setLoading(true);

      const data = await getLeads(query);

      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load leads:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, [query]);

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
    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteLead(id);

      await loadLeads();
    } catch (error) {
      console.error("Failed to delete lead:", error);

      alert(error.message || "Failed to delete lead.");
    }
  }

  /*
   * =========================================================
   * CONVERT
   * =========================================================
   */

  async function handleConvert(id) {
    const confirmed = window.confirm("Convert this lead into a customer?");

    if (!confirmed) {
      return;
    }

    try {
      await convertLead(id);

      await loadLeads();
    } catch (error) {
      console.error("Failed to convert lead:", error);

      alert(error.message || "Failed to convert lead.");
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
          SEARCH
          ===================================================== */}

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search leads..."
        count={leads.length}
      />

      {/* =====================================================
          CONTENT
          ===================================================== */}

      {loading ? (
        <div className="empty">Loading leads...</div>
      ) : leads.length === 0 ? (
        <EmptyState message="No leads found." />
      ) : (
        <LeadTable
          leads={leads}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}

export default LeadsPage;
