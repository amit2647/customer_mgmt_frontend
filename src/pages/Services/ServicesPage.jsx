import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getServices, deleteService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";

import ServiceTable from "../../components/services/ServiceTable";

/*
 * The service catalog. Adding and editing open their own page
 * (ServiceFormPage), which comes back here with a `saved` notice.
 */
function ServicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);

  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);

  const notice = location.state?.saved;

  async function loadServices() {
    try {
      setLoading(true);

      // The whole catalog: the table searches, sorts and filters it.
      const data = await getServices("");

      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  /*
   * Delete service
   */
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service?",
    );

    if (!confirmed) return;

    try {
      await deleteService(id);

      await loadServices();
    } catch (error) {
      console.error("Failed to delete service:", error);

      alert(
        error.message ||
          "Unable to delete this service. It may already be mapped to a lead or customer.",
      );
    }
  }

  return (
    <div className="services-page">
      <header>
        <div>
          <h1>Services</h1>

          <p>
            Define and manage the services offered to your leads and customers.
          </p>
        </div>

        {can("services.create") && (
          <button className="primary" onClick={() => navigate("/services/new")}>
            + Add Service
          </button>
        )}
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}

      <ServiceTable
        services={services}
        loading={loading}
        onView={(service) => navigate(`/services/${service.id}`)}
        onEdit={can("services.update") ? (service) => navigate(`/services/${service.id}/edit`) : null}
        onDelete={can("services.delete") ? handleDelete : null}
      />
    </div>
  );
}

export default ServicesPage;
