/*
 * A wizard's step bar: numbered steps, done ones ticked, the current one
 * highlighted. `steps` is [{ id, title, description }]; `className` adds the
 * page's modifier (e.g. "customer-workflow-steps").
 */
function WizardSteps({ steps, current, className = "" }) {
  return (
    <div className={`workflow-steps${className ? ` ${className}` : ""}`}>
      {steps.map((item) => (
        <div key={item.id} className={`workflow-step ${current === item.id ? "active" : ""} ${current > item.id ? "completed" : ""}`}>
          <div className="workflow-step-number">{current > item.id ? "✓" : item.id}</div>
          <div className="workflow-step-content">
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default WizardSteps;
