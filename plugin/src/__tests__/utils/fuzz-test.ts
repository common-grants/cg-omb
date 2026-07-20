/**
 * Property-based Zod ⇔ JSON-Schema equivalence check.
 *
 * Generates samples from the JSON Schema with json-schema-faker, validates each
 * with AJV and with the Zod schema, and reports any disagreement. Ported from
 * simpler-grants-protocol's ts-sdk test harness.
 *
 * Because the Zod leaves are looser than the SDE `$ref`s (the SDEs are the
 * source of truth for constraints), any SDE-valid sample is also Zod-valid, so
 * this gate verifies structural agreement (property names, nesting, required,
 * nullability) rather than full constraint parity.
 */

import type { ZodSchema } from "zod";
import { generate } from "json-schema-faker";
import { ajv, validate as validateWithAjv } from "./ajv-validator";

export const SAMPLE_SIZE = 25;
export const DEFAULT_SEED = 12345;

export interface FuzzTestResult {
  passed: boolean;
  successCount: number;
  totalTests: number;
  mismatches: Array<{
    sample: unknown;
    jsonSchemaValid: boolean;
    zodValid: boolean;
    jsonSchemaErrors?: string[];
    zodError?: string;
  }>;
}

/**
 * Inline `$ref`s so json-schema-faker (which does not resolve refs) can generate
 * data. Resolves both local `#/$defs/...` refs and AJV-registered external refs.
 */
function resolveRefs(
  schema: unknown,
  visited = new Set<string>(),
  root?: Record<string, unknown>
): unknown {
  if (typeof schema !== "object" || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(item => resolveRefs(item, visited, root));

  const obj = schema as Record<string, unknown>;
  if (!root) root = obj;

  if (typeof obj.$ref === "string") {
    const refId = obj.$ref;
    if (visited.has(refId)) return obj;
    visited.add(refId);

    if (refId.startsWith("#/$defs/")) {
      const defName = refId.replace("#/$defs/", "");
      const defs = root.$defs as Record<string, unknown> | undefined;
      if (defs && defName in defs) {
        const resolved = resolveRefs(defs[defName], visited, root);
        visited.delete(refId);
        return resolved;
      }
    } else {
      const refValidator = ajv.getSchema(refId);
      if (refValidator?.schema) {
        const referenced = refValidator.schema as Record<string, unknown>;
        const resolved = resolveRefs(referenced, visited, referenced);
        visited.delete(refId);
        return resolved;
      }
    }
    visited.delete(refId);
    return obj;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = key === "$defs" && obj === root ? value : resolveRefs(value, visited, root);
  }
  return out;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function checkZodMatchesJsonSchema(
  zodSchema: ZodSchema,
  jsonSchemaId: string,
  seed: number = DEFAULT_SEED
): Promise<FuzzTestResult> {
  const jsonSchemaValidator = ajv.getSchema(jsonSchemaId);
  if (!jsonSchemaValidator) throw new Error(`JSON schema "${jsonSchemaId}" not found`);

  const resolved = resolveRefs(jsonSchemaValidator.schema) as Record<string, unknown>;
  const schemaSeed = seed + hashString(jsonSchemaId);

  const mismatches: FuzzTestResult["mismatches"] = [];
  let successCount = 0;

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    let sample: unknown;
    try {
      sample = await generate(resolved as Parameters<typeof generate>[0], { seed: schemaSeed + i });
    } catch (error) {
      console.warn(`Failed to generate sample for ${jsonSchemaId}:`, error);
      continue;
    }

    const jsonResult = validateWithAjv(ajv, jsonSchemaId, sample);
    const strict =
      "strict" in zodSchema && typeof zodSchema.strict === "function"
        ? zodSchema.strict()
        : zodSchema;
    const zodResult = strict.safeParse(sample);

    if (jsonResult.isValid !== zodResult.success) {
      mismatches.push({
        sample,
        jsonSchemaValid: jsonResult.isValid,
        zodValid: zodResult.success,
        jsonSchemaErrors: jsonResult.errors ?? undefined,
        zodError: zodResult.success ? undefined : zodResult.error.message,
      });
    } else {
      successCount++;
    }
  }

  return {
    passed: mismatches.length === 0,
    successCount,
    totalTests: SAMPLE_SIZE,
    mismatches,
  };
}
