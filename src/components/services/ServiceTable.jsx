import { Link } from "react-router-dom";

import DataGrid from "../ui/DataGrid";
import Pill, { toneFor } from "../ui/Pill";

const isActive = (service) => (service.status || "Active").toLowerCase() === "active";

function ServiceTable({ services, onEdit, onDelete, loading = false }) {
  return (
    <DataGrid
      loading={loading}
      id="services"
      label="Services"
      rows={services}
      search={{ placeholder: "Search services...", label: "Search services" }}
      columns={[
        { key: "name", header: "Service", render: (service) => <Link className="grid-cell-title service-row-link" to={`/services/${service.id}`}>{service.name}</Link> },
        { key: "category", header: "Category", filter: { tone: toneFor }, render: (service) => (service.category ? <Pill tone={toneFor(service.category)}>{service.category}</Pill> : "—") },
        { key: "description", header: "Description", sortable: false, render: (service) => <span className="service-description">{service.description || "—"}</span> },
        {
          key: "status",
          header: "Status",
          value: (service) => service.status || "Active",
          filter: { tone: (value) => (value.toLowerCase() === "active" ? "success" : "neutral") },
          render: (service) => <Pill dot tone={isActive(service) ? "success" : "neutral"}>{service.status || "Active"}</Pill>,
        },
        {
          key: "actions",
          header: "",
          sortable: false,
          hideable: false,
          render: (service) => (
            <div className="table-actions">
              <button type="button" className="link" onClick={() => onEdit(service)}>Edit</button>
              <button type="button" className="link delete-link" onClick={() => onDelete(service.id)}>Delete</button>
            </div>
          ),
        },
      ]}
      empty="No services found."
    />
  );
}

export default ServiceTable;
