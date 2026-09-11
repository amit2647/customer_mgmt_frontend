import { useEffect, useState } from "react";
import { getServices } from "../../api/services";

function LeadForm({ lead = null, onSubmit, onClose }) {
  const isEditing = Boolean(lead);

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
    if (lead?.services) {
      setSelectedServiceIds(lead.services.map((service) => Number(service.id)));
    } else {
      setSelectedServiceIds([]);
    }
  }, [lead]);

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
      channel: formData.get("channel"),
      status: formData.get("status"),
      score: Number(formData.get("score")),
      serviceIds: selectedServiceIds,
    };

    await onSubmit(data);
  }

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isEditing ? "Edit Lead" : "Add Lead"}</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label>
          Name
          <input name="name" required defaultValue={lead?.name || ""} />
        </label>

        <label>
          Company
          <input name="company" defaultValue={lead?.company || ""} />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue={lead?.email || ""}
          />
        </label>

        <label>
          Phone
          <input name="phone" defaultValue={lead?.phone || ""} />
        </label>

        <label>
          Channel
          <select name="channel" defaultValue={lead?.channel || "Website"}>
            <option>Website</option>
            <option>Phone</option>
            <option>Email</option>
            <option>WhatsApp</option>
            <option>Social</option>
          </select>
        </label>

        <label>
          Status
          <select name="status" defaultValue={lead?.status || "New"}>
            <option>New</option>
            <option>Contacted</option>
            <option>Qualified</option>
            <option>Lost</option>
            <option>Converted</option>
          </select>
        </label>

        <label>
          Score
          <input
            name="score"
            type="number"
            min="0"
            max="100"
            defaultValue={lead?.score ?? 50}
          />
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
          {isEditing ? "Update Lead" : "Create Lead"}
        </button>
      </form>
    </div>
  );
}

export default LeadForm;
