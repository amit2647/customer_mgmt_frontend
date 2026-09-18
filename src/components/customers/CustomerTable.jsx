function CustomerTable({ customers, onEdit, onDelete, onView }) {
  return (
    <section className="card">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Segment</th>
            <th>Services</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              {/* Customer name */}
              <td>
                <b>{customer.name}</b>
              </td>

              {/* Company */}
              <td>{customer.company || "—"}</td>

              {/* Email */}
              <td>{customer.email || "—"}</td>

              {/* Phone */}
              <td>{customer.phone || "—"}</td>

              {/* Segment */}
              <td>
                <span className="pill">{customer.segment || "Standard"}</span>
              </td>

              {/* Assigned services */}
              <td>
                {customer.services?.length > 0 ? (
                  <div className="service-badges">
                    {customer.services.map((service) => (
                      <span
                        key={service.id}
                        className="service-badge"
                        title={service.description || service.name}
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="muted">No services</span>
                )}
              </td>

              {/* Actions */}
              <td>
                <div className="table-actions">
                  <button className="link" onClick={() => onView(customer)}>
                    View
                  </button>

                  <button className="link" onClick={() => onEdit(customer)}>
                    Edit
                  </button>

                  {onDelete && (
                    <button
                      className="link delete-link"
                      onClick={() => onDelete(customer.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default CustomerTable;
