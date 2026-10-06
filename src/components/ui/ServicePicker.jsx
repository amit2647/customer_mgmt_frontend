/*
 * Choosing services in a wizard: a card per service that toggles, then the
 * "n services selected" count. Grouped by category under headings (the
 * bundle wizards), or one flat grid with the category on each card (the core
 * lead and customer workflows). Only the services passed in are offered and
 * counted, so pass the active ones.
 */
function ServicePicker({ services, selected, onChange, grouped = true }) {
  const ids = selected.map(Number);
  const toggle = (serviceId) => onChange(ids.includes(serviceId) ? ids.filter((id) => id !== serviceId) : [...ids, serviceId]);
  const count = services.filter((service) => ids.includes(Number(service.id))).length;

  const card = (service) => {
    const isSelected = ids.includes(Number(service.id));

    return (
      <button
        type="button"
        key={service.id}
        className={`workflow-service-card ${isSelected ? "selected" : ""}`}
        aria-pressed={isSelected}
        onClick={() => toggle(Number(service.id))}
      >
        <div className="workflow-service-check">{isSelected ? "✓" : ""}</div>
        <div>
          <strong>{service.name}</strong>
          {!grouped && service.category && <span>{service.category}</span>}
          {service.description && <p>{service.description}</p>}
        </div>
      </button>
    );
  };

  const groups = services.reduce((all, service) => {
    const group = service.category || "Other";
    (all[group] ||= []).push(service);
    return all;
  }, {});

  return (
    <>
      {grouped ? (
        Object.entries(groups).map(([group, items]) => (
          <div key={group} className="client-service-group">
            <h4>{group}</h4>
            <div className="workflow-service-grid">{items.map(card)}</div>
          </div>
        ))
      ) : (
        <div className="workflow-service-grid">{services.map(card)}</div>
      )}

      <div className="workflow-selection-summary">
        <strong>{count}</strong>
        <span>{count === 1 ? "service selected" : "services selected"}</span>
      </div>
    </>
  );
}

export default ServicePicker;
