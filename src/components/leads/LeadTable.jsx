import ChannelBadge from "../common/ChannelBadge";
import StatusBadge from "../common/StatusBadge";

function LeadTable({ leads, onConvert, onEdit, onDelete }) {
  return (
    <section className="card">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Score</th>
            <th>Services</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              {/* Name */}
              <td>
                <b>{lead.name}</b>
              </td>

              {/* Company */}
              <td>{lead.company || "—"}</td>

              {/* Acquisition channel */}
              <td>
                <ChannelBadge channel={lead.channel} />
              </td>

              {/* Lead status */}
              <td>
                <StatusBadge status={lead.status} />
              </td>

              {/* Lead score */}
              <td>{lead.score ?? 0}</td>

              {/* Assigned services */}
              <td>
                {lead.services?.length > 0 ? (
                  <div className="service-badges">
                    {lead.services.map((service) => (
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
                  {/* Edit */}
                  <button className="link" onClick={() => onEdit(lead)}>
                    Edit
                  </button>

                  {/* Convert */}
                  {lead.status === "Qualified" && (
                    <button
                      className="link convert-link"
                      onClick={() => onConvert(lead.id)}
                    >
                      Convert
                    </button>
                  )}

                  {/* Delete */}
                  {onDelete && (
                    <button
                      className="link delete-link"
                      onClick={() => onDelete(lead.id)}
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

export default LeadTable;
