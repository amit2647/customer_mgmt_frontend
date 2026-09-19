function ToggleField({
  checked,
  onChange,
  disabled = false,
  label,
  onDescription,
  offDescription,
}) {
  return (
    <label className={`toggle-field${checked ? " on" : ""}`}>
      <span className="toggle-copy">
        <strong>{label}</strong>

        <span>{checked ? onDescription : offDescription}</span>
      </span>

      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />

      <span className="toggle-switch" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>

      <span className="toggle-state" aria-hidden="true">
        {checked ? "On" : "Off"}
      </span>
    </label>
  );
}

export default ToggleField;
