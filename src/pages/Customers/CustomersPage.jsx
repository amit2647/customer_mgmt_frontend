import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCustomers, deleteCustomer } from "../../api/customers";


import CustomerTable from "../../components/customers/CustomerTable";
import { confirmAction, toast } from "../../components/ui/feedback";

function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const confirmed = await confirmAction({ title: "Delete this customer?", message: "It cannot be recovered.", confirmLabel: "Delete", danger: true });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(id);
      toast.success("Customer deleted.");

      await loadCustomers();
    } catch (error) {
      toast.error(error.message || "Failed to delete customer.");
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

      <CustomerTable
        customers={customers}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default CustomersPage;
