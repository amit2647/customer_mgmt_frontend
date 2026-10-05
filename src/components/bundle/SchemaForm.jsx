import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

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
      />
    </div>
  );
});

export default SchemaForm;
