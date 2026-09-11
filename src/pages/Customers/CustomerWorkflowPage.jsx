import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createCustomer,
  getCustomer,
  updateCustomer,
  updateCustomerServices,
} from "../../api/customers";

import CustomerWorkflow from "../../components/customers/CustomerWorkflow";

function CustomerWorkflowPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState("");

  /*
   * =========================================================
   * LOAD CUSTOMER
   * =========================================================
   */

  useEffect(() => {
    if (!id) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    async function loadCustomer() {
      try {
        setLoading(true);
        setError("");

        const data = await getCustomer(id);

        setCustomer(data);
      } catch (err) {
        console.error("Failed to load customer:", err);

        setError(err.message || "Failed to load customer.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

  /*
   * =========================================================
   * SAVE
   * =========================================================
   */

  async function handleSubmit(data) {
    const { serviceIds = [], ...customerData } = data;

    if (!isEditing) {
      await createCustomer({
        ...customerData,
        serviceIds,
      });

      navigate("/customers");

      return;
    }

    await updateCustomer(id, customerData);

    await updateCustomerServices(id, serviceIds);

    navigate("/customers");
  }

  /*
   * =========================================================
   * CLOSE
   * =========================================================
   */

  function handleClose() {
    navigate("/customers");
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

        <h2>Loading customer</h2>

        <p>Preparing the customer workflow...</p>
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

        <h2>Unable to load customer</h2>

        <p>{error}</p>

        <button
          type="button"
          className="primary"
          onClick={() => navigate("/customers")}
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="customer-workflow-page">
      <div className="lead-workflow-page-topbar">
        <button
          type="button"
          className="workflow-back-button"
          onClick={handleClose}
        >
          ← Back to Customers
        </button>

        <div className="workflow-page-context">
          <span>CUSTOMER MANAGEMENT</span>

          <strong>{isEditing ? "Edit Customer" : "Create Customer"}</strong>
        </div>
      </div>

      <CustomerWorkflow
        customer={customer}
        onSubmit={handleSubmit}
        onClose={handleClose}
      />
    </div>
  );
}

export default CustomerWorkflowPage;
