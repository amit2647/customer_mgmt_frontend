/*
 * A labelled record field. Children win over `value` so a field can hold a badge
 * instead of text; an absent value renders a muted placeholder rather than a gap,
 * so the grid stays readable when a record is sparsely filled.
 */
function Field({ label, value, href = null, children = null }) {
  const isEmpty = !children && (value === null || value === undefined || value === "");

  return (
    <div className="record-detail-item">
      <span>{label}</span>

      <div className={`record-detail-value${isEmpty ? " empty" : ""}`} title={!children && value ? String(value) : undefined}>
        {children ?? (isEmpty ? "—" : href ? <a href={href}>{value}</a> : value)}
      </div>
    </div>
  );
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export default Field;
