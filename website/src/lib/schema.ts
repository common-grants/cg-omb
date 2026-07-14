import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SDE_DIR, IC_DIR } from "./catalog";

/** JSON Schema subset we render. */
export interface JsonSchema {
  $id?: string;
  title?: string;
  description?: string;
  type?: string;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  oneOf?: Array<{ const?: unknown; title?: string }>;
  $ref?: string;
  [key: string]: unknown;
}

export function loadSchema(file: string): JsonSchema {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function rawJson(file: string): string {
  return readFileSync(file, "utf8").trimEnd();
}

/** Resolve a `$ref` string to the absolute file it points at. */
function refToFile(ref: string): string {
  const base = ref.replace(/^.*\//, "").replace(/\.schema\.json$/, "");
  return ref.includes("/sde/")
    ? join(SDE_DIR, `${base}.schema.json`)
    : join(IC_DIR, `${base}.schema.json`);
}

/** Build a representative example value from a schema, resolving $refs across files. */
export function generateExample(fileOrSchema: string | JsonSchema): unknown {
  const schema =
    typeof fileOrSchema === "string" ? loadSchema(fileOrSchema) : fileOrSchema;
  return exampleFor(schema, 0);
}

function exampleFor(schema: JsonSchema, depth: number): unknown {
  if (depth > 10) return null;
  if (schema.$ref)
    return exampleFor(loadSchema(refToFile(schema.$ref)), depth + 1);

  if (Array.isArray(schema.oneOf)) {
    const first = schema.oneOf.find((o) => o.const !== undefined);
    if (first) return first.const;
  }

  switch (schema.type) {
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        out[key] = exampleFor(prop, depth + 1);
      }
      return out;
    }
    case "array":
      return schema.items ? [exampleFor(schema.items, depth + 1)] : [];
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    case "string":
    default:
      if (schema.format === "date") return "2026-01-01";
      if (schema.format === "email") return "agency@example.gov";
      if (schema.format === "uri") return "https://example.gov";
      return "string";
  }
}

export interface TypeLink {
  label: string;
  href?: string;
}

/** Resolve a `$ref` to a display label + internal link. */
export function refToLink(ref: string): TypeLink {
  const base = ref.replace(/^.*\//, "").replace(/\.schema\.json$/, "");
  if (ref.includes("/sde/")) return { label: base, href: `/sde/${base}/` };
  // Sibling IC model — an anchored section on the single NOFO page.
  return { label: base, href: `/ic/#${base}` };
}

/** Describe a property's type as a link (for $refs) or a plain label. */
export function propertyType(schema: JsonSchema): TypeLink {
  if (schema.$ref) return refToLink(schema.$ref);
  if (schema.type === "array" && schema.items) {
    const inner = propertyType(schema.items);
    return { label: `array of ${inner.label}`, href: inner.href };
  }
  return { label: schema.type ?? "any" };
}

export interface PropertyRow {
  name: string;
  type: TypeLink;
  required: boolean;
  description: string;
}

export function propertyRows(schema: JsonSchema): PropertyRow[] {
  if (!schema.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: propertyType(prop),
    required: required.has(name),
    description: typeof prop.description === "string" ? prop.description : "",
  }));
}

export interface EnumRow {
  value: string;
  title: string;
}

export function enumRows(schema: JsonSchema): EnumRow[] {
  if (!Array.isArray(schema.oneOf)) return [];
  return schema.oneOf
    .filter((o) => o.const !== undefined)
    .map((o) => ({
      value: String(o.const),
      title: typeof o.title === "string" ? o.title : "",
    }));
}

export interface Constraint {
  label: string;
  value: string;
}

/** Scalar constraints for a leaf (SDE) schema. */
export function constraints(schema: JsonSchema): Constraint[] {
  const out: Constraint[] = [];
  if (schema.type) out.push({ label: "Type", value: String(schema.type) });
  if (schema.format) out.push({ label: "Format", value: schema.format });
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    out.push({
      label: "Length",
      value: `${schema.minLength ?? "0"}–${schema.maxLength ?? "∞"}`,
    });
  }
  if (schema.pattern) out.push({ label: "Pattern", value: schema.pattern });
  return out;
}

export interface Provenance {
  label: string;
  values: string[];
}

const X_LABELS: Record<string, string> = {
  "x-cdmEntity": "CDM entity",
  "x-dataGroups": "Data groups",
  "x-relatedElements": "Related elements",
  "x-grantsActivityReferences": "Grants activity references",
  "x-references": "References",
  "x-descriptionSource": "Description source",
};

/** OMB `x-*` provenance metadata, as label + string values. */
export function provenance(schema: JsonSchema): Provenance[] {
  const out: Provenance[] = [];
  for (const [key, label] of Object.entries(X_LABELS)) {
    const value = schema[key];
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    if (values.length > 0) out.push({ label, values });
  }
  return out;
}
