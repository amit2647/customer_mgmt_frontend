import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import Form, { getDefaultRegistry } from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

import NumberInput from "../ui/NumberInput";

const DefaultInput = getDefaultRegistry().templates.BaseInputTemplate;

/*
 * Number fields use the product's NumberInput. A bundle's "number" fields are
 * money (audit fee, turnover): ₹, grouped digits, two decimals. "integer"
 * fields are counts (days, months, years): whole numbers. Every other input
 * is rjsf's own.
 */
function BaseInputTemplate(props) {
  const { id, htmlName, value, onChange, onBlur, onFocus, options, schema, disabled, readonly, autofocus, required, placeholder, type } = props;
  const kind = schema?.type === "integer" || type === "integer" ? "integer" : schema?.type === "number" || type === "number" ? "number" : null;

  if (!kind) return <DefaultInput {...props} />;

  const money = kind === "number";

  return (
    <NumberInput
      id={id}
      name={htmlName || id}
      value={value || value === 0 ? String(value) : ""}
      onChange={(next) => onChange(next === "" ? options.emptyValue : next)}
      onBlur={(event) => onBlur(id, event.target.value)}
      onFocus={(event) => onFocus(id, event.target.value)}
      prefix={money ? "₹" : undefined}
      decimals={money ? 2 : 0}
      disabled={disabled}
      readOnly={readonly}
      required={required}
      autoFocus={autofocus}
      placeholder={placeholder}
    />
  );
}

const TEMPLATES = { BaseInputTemplate };

/*
 * A profession bundle's fields as a form (react-jsonschema-form), from the
 * same JSON Schema customer-service validates with — so a field the form
 * accepts is a field the server accepts.
 *
 * Rendered inside the page's own form: no submit button, no error list.
 * `errors` are the server's per-field reasons ({ constitution: "…" }), shown
 * under their fields. The parent calls ref.validate() before moving on.
 */
const SchemaForm = forwardRef(function SchemaForm({ schema, uiSchema, formData, onChange, errors = {}, disabled = false, idPrefix = "bundle" }, ref) {
  const form = useRef(null);

  useImperativeHandle(ref, () => ({
    // True when the fields are valid; shows the problems otherwise.
    validate: () => (form.current ? form.current.validateForm() : true),
  }));

  const ui = useMemo(
    () => ({
      ...(uiSchema || {}),
      "ui:submitButtonOptions": { norender: true },
    }),
    [uiSchema],
  );

  const extraErrors = useMemo(
    () => Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, { __errors: [message] }])),
    [errors],
  );

  if (!schema) {
    return null;
  }

  return (
    <div className="schema-form">
      <Form
        ref={form}
        schema={schema}
        uiSchema={ui}
        formData={formData || {}}
        validator={validator}
        onChange={(event) => onChange?.(event.formData)}
        extraErrors={extraErrors}
        showErrorList={false}
        noHtml5Validate
        disabled={disabled}
        idPrefix={idPrefix}
        tagName="div"
        templates={TEMPLATES}
      />
    </div>
  );
});

export default SchemaForm;
