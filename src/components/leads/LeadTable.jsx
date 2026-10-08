import DataGrid from "../ui/DataGrid";
import Pill, { toneFor } from "../ui/Pill";

// Each lead status's pill colour.
const STATUS_TONE = { New: "info", Contacted: "violet", Qualified: "success", Converted: "success", Lost: "danger" };

function LeadTable({ leads, onConvert, onEdit, onDelete, onView }) {
  return (
    <DataGrid
      id="leads"
      label="Leads"
      rows={leads}
      search={{ placeholder: "Search leads...", label: "Search leads" }}
      columns={[
        { key: "name", header: "Name", render: (lead) => <span className="grid-cell-title">{lead.name}</span> },
        { key: "company", header: "Company", render: (lead) => lead.company || "—" },
        { key: "channel", header: "Channel", filter: { tone: toneFor }, render: (lead) => lead.channel && <Pill tone={toneFor(lead.channel)}>{lead.channel}</Pill> },
        { key: "status", header: "Status", filter: { tone: (value) => STATUS_TONE[value] || "neutral" }, render: (lead) => <Pill dot tone={STATUS_TONE[lead.status] || "neutral"}>{lead.status}</Pill> },
        { key: "score", header: "Score", align: "right", value: (lead) => Number(lead.score ?? 0) },
        {
          key: "services",
          header: "Services",
          sortable: false,
          value: (lead) => (lead.services || []).map((service) => service.name),
          filter: { tone: toneFor },
          render: (lead) =>
            lead.services?.length > 0 ? (
              <div className="grid-pills">
                {lead.services.map((service) => (
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
          render: (lead) => (
            <div className="table-actions">
              <button type="button" className="link" onClick={() => onView(lead)}>View</button>
              <button type="button" className="link" onClick={() => onEdit(lead)}>Edit</button>
              {lead.status === "Qualified" && (
                <button type="button" className="link convert-link" onClick={() => onConvert(lead.id)}>Convert</button>
              )}
              {onDelete && (
                <button type="button" className="link delete-link" onClick={() => onDelete(lead.id)}>Delete</button>
              )}
            </div>
          ),
        },
      ]}
      empty="No leads found."
    />
  );
}

export default LeadTable;
