import { Validator } from "@cfworker/json-schema";
import { createErrorHandler, getDefaultFormState, toErrorSchema, unwrapErrorHandler, validationDataMerge } from "@rjsf/utils";

/*
 * react-jsonschema-form's validator, without generated code.
 *
 * rjsf's own validator (Ajv) compiles each schema into a function with
 * `new Function`, which the app's Content-Security-Policy forbids
 * (script-src without 'unsafe-eval', auth hardening P6: the access token
 * lives in the page). @cfworker/json-schema interprets the schema instead.
 * customer-service still validates every save with bundle-sdk; this is the
 * form's own check, so a mistake shows under its field before the request.
 *
 * Implements rjsf's ValidatorType: validateFormData, isValid, rawValidation.
 * @rjsf/validator-ajv8 stays installed only because @rjsf/core's entry point
 * imports it for its test registry; the app never calls it.
 */

const DRAFT = "7";

// Errors that only say a nested value failed; the nested error says what.
const WRAPPERS = new Set(["properties", "items", "prefixItems", "allOf", "anyOf", "oneOf", "if", "then", "else", "$ref", "dependentSchemas", "contains"]);

const validators = new WeakMap();

function validatorFor(schema, rootSchema) {
  const root = rootSchema || schema;
  let byRoot = validators.get(schema);
  if (!byRoot) {
    byRoot = new WeakMap();
    validators.set(schema, byRoot);
  }

  let validator = byRoot.get(root);
  if (!validator) {
    // A sub-schema may point at the root's definitions; give it them.
    const withDefinitions = root === schema ? schema : { ...schema, definitions: root.definitions, $defs: root.$defs };
    validator = new Validator(withDefinitions, DRAFT, false);
    byRoot.set(root, validator);
  }
  return validator;
}

const toProperty = (instanceLocation) => instanceLocation.replace(/^#/, "").split("/").filter(Boolean).map((part) => `.${part}`).join("");

function friendly(error) {
  switch (error.keyword) {
    case "required":
      return "Required";
    case "format":
      return /"date"/.test(error.error) ? "Enter a date (YYYY-MM-DD)" : "Not in the expected format";
    case "enum":
    case "const":
      return "Choose one of the options";
    default:
      return error.error.replace(/^Instance /, "Value ").replace(/\.$/, "");
  }
}

// rjsf's error shape: { name, property, message, params, stack }.
function toRjsfErrors(errors) {
  return errors
    .filter((error) => !WRAPPERS.has(error.keyword))
    .map((error) => {
      let property = toProperty(error.instanceLocation);
      const params = {};

      if (error.keyword === "required") {
        const missing = /property "([^"]+)"/.exec(error.error)?.[1];
        if (missing) {
          property = `${property}.${missing}`;
          params.missingProperty = missing;
        }
      }

      const message = friendly(error);
      return { name: error.keyword, property, message, params, stack: `${property} ${message}`.trim(), schemaPath: error.keywordLocation };
    });
}

const schemaValidator = {
  rawValidation(schema, formData) {
    try {
      return { errors: toRjsfErrors(validatorFor(schema).validate(formData ?? {}).errors) };
    } catch (validationError) {
      return { errors: [], validationError };
    }
  },

  validateFormData(formData, schema, customValidate, transformErrors, uiSchema) {
    const { errors: raw = [], validationError } = this.rawValidation(schema, formData);

    let errors = validationError ? [...raw, { stack: validationError.message }] : raw;
    if (typeof transformErrors === "function") errors = transformErrors(errors, uiSchema);

    let errorSchema = toErrorSchema(errors);
    if (validationError) errorSchema = { ...errorSchema, $schema: { __errors: [validationError.message] } };
    if (typeof customValidate !== "function") return { errors, errorSchema };

    const filled = getDefaultFormState(this, schema, formData, schema, true);
    const userErrorSchema = unwrapErrorHandler(customValidate(filled, createErrorHandler(filled), uiSchema));
    return validationDataMerge({ errors, errorSchema }, userErrorSchema);
  },

  isValid(schema, formData, rootSchema) {
    try {
      return validatorFor(schema, rootSchema).validate(formData ?? {}).valid;
    } catch {
      return false;
    }
  },

  reset() {},
};

export default schemaValidator;
