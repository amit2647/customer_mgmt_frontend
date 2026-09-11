import { useEffect, useState } from "react";

import {
  getServices,
  createService,
  updateService,
  deleteService,
} from "../../api/services";

import ServiceTable from "../../components/services/ServiceTable";
import ServiceForm from "../../components/services/ServiceForm";

function ServicesPage() {
  const [services, setServices] = useState([]);

  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingService, setEditingService] = useState(null);

  const [loading, setLoading] = useState(false);

  async function loadServices() {
    try {
      setLoading(true);

      const data = await getServices(query);

      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [query]);

  /*
   * Create / Update service
   */
  async function handleSubmit(data) {
    try {
      if (editingService) {
        await updateService(editingService.id, data);
      } else {
        await createService(data);
      }

      setShowForm(false);
      setEditingService(null);

      await loadServices();
    } catch (error) {
      console.error("Failed to save service:", error);

      alert(error.message || "Failed to save service.");
    }
  }

  /*
   * Edit service
   */
  function handleEdit(service) {
    setEditingService(service);
    setShowForm(true);
  }

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

  /*
   * Close form
   */
  function handleCloseForm() {
    setShowForm(false);
    setEditingService(null);
  }

  return (
    <>
      <header>
        <div>
          <h1>Services</h1>

          <p>
            Define and manage the services offered to your leads and customers.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => {
            setEditingService(null);
            setShowForm(true);
          }}
        >
          + Add Service
        </button>
      </header>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search services..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <span>
          {services.length} service
          {services.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="empty">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="empty">No services found.</div>
      ) : (
        <ServiceTable
          services={services}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <ServiceForm
          service={editingService}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}
    </>
  );
}

export default ServicesPage;
