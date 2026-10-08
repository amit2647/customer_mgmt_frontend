import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCustomers, deleteCustomer } from "../../api/customers";


import CustomerTable from "../../components/customers/CustomerTable";

function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  /*
   * =========================================================
   * LOAD CUSTOMERS
   * =========================================================
   */

  async function loadCustomers() {
    try {
      setLoading(true);

      // The whole list: the table searches, sorts and filters it.
      const data = await getCustomers("");

      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers:", error);

      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  /*
   * =========================================================
   * CREATE
   * =========================================================
   */

  function handleCreate() {
    navigate("/customers/new");
  }

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  function handleView(customer) {
    navigate(`/customers/${customer.id}`);
  }

  function handleEdit(customer) {
    navigate(`/customers/${customer.id}/edit`);
  }

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(id);

      await loadCustomers();
    } catch (error) {
      console.error("Failed to delete customer:", error);

      alert(error.message || "Failed to delete customer.");
    }
  }

  return (
    <div className="customers-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <header className="page-header">
        <div>
          {/* <span className="page-eyebrow">CUSTOMER MANAGEMENT</span> */}

          <h1>Customers</h1>

          <p>Manage your customers across every customer touchpoint.</p>
        </div>

        <button type="button" className="primary" onClick={handleCreate}>
          + Add Customer
        </button>
      </header>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      {loading ? (
        <div className="empty">Loading customers...</div>
      ) : (
        <CustomerTable
          customers={customers}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default CustomersPage;
