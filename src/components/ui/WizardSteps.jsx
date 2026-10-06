/*
 * A wizard's step bar: numbered steps in one row (as many columns as steps),
 * done ones ticked, the current one highlighted. `steps` is
 * [{ id, title, description }]; `className` adds the page's modifier (e.g.
 * "customer-workflow-steps").
 *
 * With `onSelect`, every step is a button. Wizards pass
 * `(target) => goToStep(target, { step, validateStep, setStep })`, so going
 * back is free and going forward checks each step on the way, exactly as
 * Continue would — a click never skips a required field.
 */
function WizardSteps({ steps, current, className = "", onSelect }) {
  return (
    <div className={`workflow-steps${className ? ` ${className}` : ""}`} style={{ "--step-count": steps.length }}>
      {steps.map((item) => {
        const state = current === item.id ? "active" : current > item.id ? "completed" : "";
        const body = (
          <>
            <div className="workflow-step-number">{current > item.id ? "✓" : item.id}</div>
            <div className="workflow-step-content">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          </>
        );

        return onSelect ? (
          <button
            key={item.id}
            type="button"
            className={`workflow-step workflow-step-button ${state}`}
            onClick={() => item.id !== current && onSelect(item.id)}
            aria-current={current === item.id ? "step" : undefined}
          >
            {body}
          </button>
        ) : (
          <div key={item.id} className={`workflow-step ${state}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/*
 * Moves a wizard to `target`: back at once; forward one step at a time,
 * stopping on the first step that does not validate (its errors shown).
 */
export function goToStep(target, { step, validateStep, setStep, onBack }) {
  if (target < step) {
    if (onBack) onBack();
    setStep(target);
    return;
  }

  for (let at = step; at < target; at += 1) {
    if (!validateStep(at)) {
      setStep(at);
      return;
    }
  }

  setStep(target);
}

export default WizardSteps;
