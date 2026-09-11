export default function ServiceSelector({
  services,
  selectedServiceIds,
  onChange,
}) {
  function toggleService(serviceId) {
    const numericId = Number(serviceId);

    if (selectedServiceIds.includes(numericId)) {
      onChange(selectedServiceIds.filter((id) => id !== numericId));
    } else {
      onChange([...selectedServiceIds, numericId]);
    }
  }

  const activeServices = services.filter(
    (service) => service.status === "Active",
  );

  return (
    <div className="service-selector">
      <div className="service-selector-header">
        <label>Services</label>

        <span>{selectedServiceIds.length} selected</span>
      </div>

      {activeServices.length === 0 ? (
        <div className="service-selector-empty">
          No active services available.
        </div>
      ) : (
        <div className="service-options">
          {activeServices.map((service) => {
            const selected = selectedServiceIds.includes(Number(service.id));

            return (
              <label
                key={service.id}
                className={`service-option ${selected ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleService(service.id)}
                />

                <span className="service-option-content">
                  <strong>{service.name}</strong>

                  {service.category && <small>{service.category}</small>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
