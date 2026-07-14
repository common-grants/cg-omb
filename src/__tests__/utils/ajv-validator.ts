/**
 * AJV validator for the property-based equivalence suite.
 *
 * Registers the vendored SDE files and the split NOFO IC schemas so their
 * `$ref`s resolve. Schemas reference each other by relative path — SDEs as
 * `../sde/<Sde>.schema.json`, sibling IC models as `./<model>.schema.json` —
 * while each schema's own `$id` is the flat `<name>.schema.json`. We flatten
 * those relative prefixes so every ref matches a registered `$id`.
 */

import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SDE_DIR = "schemas/sde";
const IC_DIR = "schemas/ic";

/** The `$id`s under which the NOFO IC schemas are registered. */
export const NOFO_IC_ID = "nofo-ic.schema.json";
export const FUNDING_OPPORTUNITY_ID = "funding-opportunity.schema.json";
export const PROJECT_ID = "project.schema.json";
export const COST_SHARING_ID = "cost-sharing.schema.json";

/** Register a schema file, flattening relative `$ref` prefixes to flat `$id`s. */
function addFlattened(ajv: Ajv2020, path: string): void {
  // Rewrite only within $ref values (e.g. "../sde/X" or "./X" → "X").
  const raw = readFileSync(path, "utf8").replace(/("\$ref":\s*")(?:\.\.\/sde\/|\.\/)/g, "$1");
  const schema = JSON.parse(raw);
  if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema);
}

export function createAjvValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);

  for (const file of readdirSync(SDE_DIR)) {
    if (file.endsWith(".schema.json")) addFlattened(ajv, join(SDE_DIR, file));
  }
  for (const file of readdirSync(IC_DIR)) {
    if (file.endsWith(".schema.json")) addFlattened(ajv, join(IC_DIR, file));
  }

  return ajv;
}

export const ajv = createAjvValidator();

/** Validate `data` against a registered schema id; returns validity + messages. */
export function validate(
  instance: Ajv2020,
  schemaId: string,
  data: unknown
): { isValid: boolean; errors: string[] | null } {
  const validator = instance.getSchema(schemaId) as ValidateFunction | undefined;
  if (!validator) throw new Error(`Schema "${schemaId}" not found`);
  const isValid = validator(data) as boolean;
  if (isValid) return { isValid: true, errors: null };
  const errors = (validator.errors ?? []).map(
    e => `${e.instancePath || e.schemaPath}: ${e.message ?? "invalid"}`
  );
  return { isValid: false, errors };
}
