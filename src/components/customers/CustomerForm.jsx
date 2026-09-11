import { useEffect, useState } from "react";
import { getServices } from "../../api/services";

function CustomerForm({ customer = null, onSubmit, onClose }) {
  const isEditing = Boolean(customer);

  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await getServices();

        setServices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load services:", error);
      }
    }

    loadServices();
  }, []);

  useEffect(() => {
    if (customer?.services) {
      setSelectedServiceIds(
        customer.services.map((service) => Number(service.id)),
      );
    } else {
      setSelectedServiceIds([]);
    }
  }, [customer]);

  function toggleService(serviceId) {
    const id = Number(serviceId);

    setSelectedServiceIds((current) => {
      if (current.includes(id)) {
        return current.filter((serviceId) => serviceId !== id);
      }

      return [...current, id];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    const data = {
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      segment: formData.get("segment"),
      serviceIds: selectedServiceIds,
    };

    await onSubmit(data);
  }

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isEditing ? "Edit Customer" : "Add Customer"}</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label>
          Name
          <input name="name" required defaultValue={customer?.name || ""} />
        </label>

        <label>
          Company
          <input name="company" defaultValue={customer?.company || ""} />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue={customer?.email || ""}
          />
        </label>

        <label>
          Phone
          <input name="phone" defaultValue={customer?.phone || ""} />
        </label>

        <label>
          Segment
          <select name="segment" defaultValue={customer?.segment || "Standard"}>
            <option>Standard</option>
            <option>Premium</option>
            <option>Enterprise</option>
          </select>
        </label>

        <div className="service-field">
          <div className="service-field-head">
            <label>Services</label>

            <span>{selectedServiceIds.length} selected</span>
          </div>

          {services.length === 0 ? (
            <div className="service-empty">
              No services available. Create a service first.
            </div>
          ) : (
            <div className="service-list">
              {services
                .filter((service) => service.status === "Active")
                .map((service) => {
                  const selected = selectedServiceIds.includes(
                    Number(service.id),
                  );

                  return (
                    <label
                      key={service.id}
                      className={`service-item ${selected ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleService(service.id)}
                      />

                      <div className="service-item-info">
                        <strong>{service.name}</strong>

                        {service.category && <small>{service.category}</small>}

                        {service.description && (
                          <small>{service.description}</small>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>
          )}
        </div>

        <button className="primary" type="submit">
          {isEditing ? "Update Customer" : "Create Customer"}
        </button>
      </form>
    </div>
  );
}

export default CustomerForm;
