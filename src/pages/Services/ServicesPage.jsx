import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getServices, deleteService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { confirmAction, toast } from "../../components/ui/feedback";
import useArrivalToast from "../../components/ui/useArrivalToast";

import ServiceTable from "../../components/services/ServiceTable";

/*
 * The service catalog. Adding and editing open their own page
 * (ServiceFormPage), which comes back here with a `saved` notice.
 */
function ServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const can = (permission) => permissions.includes(permission);

  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);

  // The add/edit page comes back with a `saved` notice.
  useArrivalToast();

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
    const service = services.find((item) => item.id === id);
    const confirmed = await confirmAction({
      title: `Delete ${service?.name || "this service"}?`,
      message: "It cannot be recovered. A service in use by a lead or client cannot be deleted; make it inactive instead.",
      confirmLabel: "Delete service",
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteService(id);
      toast.success("Service deleted.");
      await loadServices();
    } catch (error) {
      toast.error(error.message || "Unable to delete this service. It may already be mapped to a lead or customer.");
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
