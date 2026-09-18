import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getCustomer } from "../../api/customers";

import CommunicationPanel from "../../components/communications/CommunicationPanel";
import Field, { formatDate } from "../../components/common/Field";

function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCustomer(id);

      setCustomer(data?.customer || data);
    } catch (requestError) {
      console.error("Failed to load customer:", requestError);

      setError(requestError.message || "Failed to load the customer.");
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
        <div className="communication-empty">Loading customer...</div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="page record-detail-page">
        <div className="alert alert-error" role="alert">
          <span>{error || "Customer not found."}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="page record-detail-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/customers")}>
          ← Back to Customers
        </button>

        <div className="workflow-context">
          <span>CUSTOMERS</span>
          <strong>{customer.name}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          {/* <span className="page-eyebrow">CUSTOMER</span> */}

          <h1>{customer.name}</h1>

          <p>{customer.company || "No company"}</p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
          >
            Edit Customer
          </button>
        </div>
      </div>

      <section className="record-details">
        <Field label="Segment" value={customer.segment || "Standard"} />

        <Field label="Company" value={customer.company} />

        <Field
          label="Email"
          value={customer.email}
          href={customer.email && `mailto:${customer.email}`}
        />

        <Field
          label="Phone"
          value={customer.phone}
          href={customer.phone && `tel:${customer.phone}`}
        />

        <Field label="Created" value={formatDate(customer.created_at)} />

        <Field label="Last updated" value={formatDate(customer.updated_at)} />
      </section>

      <CommunicationPanel
        record={{ type: "customer", id: customer.id, email: customer.email }}
      />
    </main>
  );
}

export default CustomerDetailPage;
