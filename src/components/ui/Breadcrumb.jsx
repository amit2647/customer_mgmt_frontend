/*
 * The bar above a page: "← Back to …" on the left, and where you are on the
 * right (SECTION / Title). Styled per page (.record-detail-page,
 * .settings-sub-page, …), so it renders only the classes those pages expect.
 */
function Breadcrumb({ onBack, backLabel, section, title }) {
  return (
    <div className="workflow-breadcrumb">
      <button type="button" onClick={onBack}>← Back to {backLabel}</button>

      {(section || title) && (
        <div className="workflow-context">
          {section && <span>{section}</span>}
          {title && <strong>{title}</strong>}
        </div>
      )}
    </div>
  );
}

export default Breadcrumb;
