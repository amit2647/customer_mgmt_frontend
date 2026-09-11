function ServiceTable({ services, onEdit, onDelete }) {
  return (
    <section className="card">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {services.map((service) => (
            <tr key={service.id}>
              <td>
                <b>{service.name}</b>
              </td>

              <td>
                {service.category ? (
                  <span className="pill">{service.category}</span>
                ) : (
                  "—"
                )}
              </td>

              <td>
                <span className="service-description">
                  {service.description || "—"}
                </span>
              </td>

              <td>
                <span
                  className={`status ${
                    service.status?.toLowerCase() === "active"
                      ? "active"
                      : "inactive"
                  }`}
                >
                  {service.status || "Active"}
                </span>
              </td>

              <td>
                <div className="table-actions">
                  <button className="link" onClick={() => onEdit(service)}>
                    Edit
                  </button>

                  <button
                    className="link delete-link"
                    onClick={() => onDelete(service.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default ServiceTable;
