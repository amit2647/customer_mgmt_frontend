import { useEffect, useState } from "react";

import {
  createLead,
  getLeads,
  updateLead,
  updateLeadServices,
  deleteLead,
  convertLead,
} from "../../api/leads";

import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";

import LeadTable from "../../components/leads/LeadTable";
import LeadForm from "../../components/leads/LeadForm";

function LeadsPage() {
  const [leads, setLeads] = useState([]);

  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingLead, setEditingLead] = useState(null);

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
   * CREATE / UPDATE LEAD
   * =========================================================
   */

  async function handleSubmit(data) {
    try {
      /*
       * CREATE
       *
       * POST /leads accepts serviceIds,
       * so everything can be sent together.
       */
      if (!editingLead) {
        await createLead(data);
      } else {

      /*
       * UPDATE
       *
       * Separate normal lead fields from service mappings.
       */
        const { serviceIds = [], ...leadData } = data;

        /*
         * Update lead information.
         */
        await updateLead(editingLead.id, leadData);

        /*
         * Replace service mappings.
         */
        await updateLeadServices(editingLead.id, serviceIds);
      }

      /*
       * Close modal.
       */
      setShowForm(false);

      setEditingLead(null);

      /*
       * Refresh table.
       */
      await loadLeads();
    } catch (error) {
      console.error("Failed to save lead:", error);

      alert(error.message || "Failed to save lead.");
    }
  }

  /*
   * =========================================================
   * EDIT LEAD
   * =========================================================
   */

  function handleEdit(lead) {
    /*
     * The list endpoint now returns services,
     * so we can pass the lead directly to LeadForm.
     */
    setEditingLead(lead);

    setShowForm(true);
  }

  /*
   * =========================================================
   * DELETE LEAD
   * =========================================================
   */

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?",
    );

    if (!confirmed) return;

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
   * CONVERT LEAD
   * =========================================================
   */

  async function handleConvert(id) {
    const confirmed = window.confirm("Convert this lead?");

    if (!confirmed) return;

    try {
      await convertLead(id);

      await loadLeads();
    } catch (error) {
      console.error("Failed to convert lead:", error);

      alert(error.message || "Failed to convert lead.");
    }
  }

  /*
   * =========================================================
   * CLOSE FORM
   * =========================================================
   */

  function handleCloseForm() {
    setShowForm(false);

    setEditingLead(null);
  }

  return (
    <>
      {/* =========================
          Page Header
          ========================= */}

      <header>
        <div>
          <h1>Leads</h1>

          <p>Manage prospects across every customer touchpoint.</p>
        </div>

        <button
          className="primary"
          onClick={() => {
            setEditingLead(null);

            setShowForm(true);
          }}
        >
          + Add Lead
        </button>
      </header>

      {/* =========================
          Search
          ========================= */}

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search leads..."
        count={leads.length}
      />

      {/* =========================
          Lead Content
          ========================= */}

      {loading ? (
        <div className="empty">Loading leads...</div>
      ) : leads.length === 0 ? (
        <EmptyState message="No leads found." />
      ) : (
        <LeadTable
          leads={leads}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConvert={handleConvert}
        />
      )}

      {/* =========================
          Lead Modal
          ========================= */}

      {showForm && (
        <LeadForm
          lead={editingLead}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}
    </>
  );
}

export default LeadsPage;
