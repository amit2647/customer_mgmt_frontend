/*
 * A whole page that is loading, failed, or has nothing to edit: an icon, a
 * heading, a sentence and at most one way on.
 */
function PageState({ icon = "○", tone, title, children, action }) {
  return (
    <div className="workflow-page-state">
      <div className={`workflow-page-state-icon${tone ? ` ${tone}` : ""}`}>{icon}</div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export default PageState;
