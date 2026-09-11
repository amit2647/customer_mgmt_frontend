import { useEffect, useState } from "react";

import {
  createCustomer,
  getCustomers,
  updateCustomer,
  updateCustomerServices,
  deleteCustomer,
} from "../../api/customers";

import SearchBar from "../../components/common/SearchBar";
import EmptyState from "../../components/common/EmptyState";

import CustomerTable from "../../components/customers/CustomerTable";
import CustomerForm from "../../components/customers/CustomerForm";

function CustomersPage() {
  const [customers, setCustomers] = useState([]);

  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);

  const [loading, setLoading] = useState(false);

  /*
   * Load customers from the API.
   *
   * The customer service now returns the assigned
   * services along with each customer.
   */
  async function loadCustomers() {
    try {
      setLoading(true);

      const data = await getCustomers(query);

      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load customers:", error);

      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Reload whenever the search query changes.
   */
  useEffect(() => {
    loadCustomers();
  }, [query]);

  /*
   * Create / Update customer
   *
   * Customer information and service mappings are
   * handled separately.
   */
  async function handleSubmit(data) {
    try {
      /*
       * Extract serviceIds from the form.
       *
       * serviceIds belong to customer_services,
       * not the customers table.
       */
      const { serviceIds = [], ...customerData } = data;

      if (editingCustomer) {
        /*
         * 1. Update normal customer information.
         */
        await updateCustomer(editingCustomer.id, customerData);

        /*
         * 2. Replace the customer's service mappings.
         */
        await updateCustomerServices(editingCustomer.id, serviceIds);
      } else {
        /*
         * During creation the backend supports creating
         * the customer and its initial service mappings
         * in one transaction.
         */
        await createCustomer({
          ...customerData,
          serviceIds,
        });
      }

      /*
       * Close modal.
       */
      setShowForm(false);
      setEditingCustomer(null);

      /*
       * Refresh customer list.
       */
      await loadCustomers();
    } catch (error) {
      console.error("Failed to save customer:", error);

      alert(error.message || "Failed to save customer.");
    }
  }

  /*
   * Open customer in edit mode.
   */
  function handleEdit(customer) {
    setEditingCustomer(customer);
    setShowForm(true);
  }

  /*
   * Delete customer.
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

  /*
   * Close customer form.
   */
  function handleCloseForm() {
    setShowForm(false);
    setEditingCustomer(null);
  }

  return (
    <>
      <header>
        <div>
          <h1>Customers</h1>

          <p>Manage your customers across every customer touchpoint.</p>
        </div>

        <button
          className="primary"
          onClick={() => {
            setEditingCustomer(null);
            setShowForm(true);
          }}
        >
          + Add Customer
        </button>
      </header>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search customers..."
        count={customers.length}
      />

      {loading ? (
        <div className="empty">Loading customers...</div>
      ) : customers.length === 0 ? (
        <EmptyState message="No customers found." />
      ) : (
        <CustomerTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}
    </>
  );
}

export default CustomersPage;
