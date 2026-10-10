import DataGrid from "../ui/DataGrid";
import Pill, { toneFor } from "../ui/Pill";

function CustomerTable({ customers, onEdit, onDelete, onView, loading = false }) {
  return (
    <DataGrid
      loading={loading}
      id="customers"
      label="Customers"
      rows={customers}
      search={{ placeholder: "Search customers...", label: "Search customers" }}
      columns={[
        { key: "name", header: "Name", render: (customer) => <span className="grid-cell-title">{customer.name}</span> },
        { key: "company", header: "Company", render: (customer) => customer.company || "—" },
        { key: "email", header: "Email", render: (customer) => customer.email || "—" },
        { key: "phone", header: "Phone", render: (customer) => customer.phone || "—" },
        {
          key: "segment",
          header: "Segment",
          value: (customer) => customer.segment || "Standard",
          filter: { tone: toneFor },
          render: (customer) => <Pill tone={toneFor(customer.segment || "Standard")}>{customer.segment || "Standard"}</Pill>,
        },
        {
          key: "services",
          header: "Services",
          sortable: false,
          value: (customer) => (customer.services || []).map((service) => service.name),
          filter: { tone: toneFor },
          render: (customer) =>
            customer.services?.length > 0 ? (
              <div className="grid-pills">
                {customer.services.map((service) => (
                  <Pill key={service.id} tone={toneFor(service.name)} title={service.description || service.name}>{service.name}</Pill>
                ))}
              </div>
            ) : (
              <span className="muted">No services</span>
            ),
        },
        {
          key: "actions",
          header: "",
          sortable: false,
          hideable: false,
          render: (customer) => (
            <div className="table-actions">
              <button type="button" className="link" onClick={() => onView(customer)}>View</button>
              <button type="button" className="link" onClick={() => onEdit(customer)}>Edit</button>
              {onDelete && (
                <button type="button" className="link delete-link" onClick={() => onDelete(customer.id)}>Delete</button>
              )}
            </div>
          ),
        },
      ]}
      empty="No customers found."
    />
  );
}

export default CustomerTable;
