import type { ZodSchema } from "zod";
import { expect } from "vitest";
import { checkZodMatchesJsonSchema } from "./utils/fuzz-test";

/**
 * Assert that a Zod schema and a JSON Schema agree across fuzzed samples.
 * Throws with a detailed diff on any mismatch.
 */
export async function expectZodMatchesJsonSchema(
  zodSchema: ZodSchema,
  jsonSchemaId: string
): Promise<void> {
  const result = await checkZodMatchesJsonSchema(zodSchema, jsonSchemaId);

  if (!result.passed) {
    const details = result.mismatches
      .map(
        (m, i) => `
Mismatch ${i + 1}:
  sample: ${JSON.stringify(m.sample)}
  JSON Schema valid: ${m.jsonSchemaValid}${m.jsonSchemaErrors ? ` (${m.jsonSchemaErrors.join("; ")})` : ""}
  Zod valid: ${m.zodValid}${m.zodError ? ` (${m.zodError})` : ""}`
      )
      .join("\n");
    throw new Error(
      `Zod schema does not match JSON schema "${jsonSchemaId}": ` +
        `${result.mismatches.length}/${result.totalTests} mismatch(es).\n${details}`
    );
  }

  expect(result.passed).toBe(true);
}
