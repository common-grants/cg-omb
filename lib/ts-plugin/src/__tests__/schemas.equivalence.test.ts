import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { ZodSchema } from "zod";
import {
  NofoIcSchema,
  FundingOpportunitySchema,
  ProjectSchema,
  ProjectCostSharingSchema,
} from "../schemas";
import { expectZodMatchesJsonSchema } from "./helper";
import {
  NOFO_IC_ID,
  FUNDING_OPPORTUNITY_ID,
  PROJECT_ID,
  COST_SHARING_ID,
} from "./utils/ajv-validator";

/** Each hand-written Zod model must agree with its published JSON Schema. */
const MODELS: Array<{ name: string; zod: ZodSchema; schemaId: string }> = [
  { name: "NofoIc", zod: NofoIcSchema, schemaId: NOFO_IC_ID },
  { name: "FundingOpportunity", zod: FundingOpportunitySchema, schemaId: FUNDING_OPPORTUNITY_ID },
  { name: "Project", zod: ProjectSchema, schemaId: PROJECT_ID },
  { name: "CostSharing", zod: ProjectCostSharingSchema, schemaId: COST_SHARING_ID },
];

describe("Zod ⇔ published JSON Schema equivalence", () => {
  for (const { name, zod, schemaId } of MODELS) {
    it(`${name} agrees with ${schemaId} across fuzzed samples`, async () => {
      await expectZodMatchesJsonSchema(zod, schemaId);
    });
  }
});

describe("published schema composition", () => {
  it("the root $refs the split sub-model files", () => {
    const root = JSON.parse(readFileSync("../../schemas/ic/nofo-ic.schema.json", "utf8"));
    expect(root.properties.fundingOpportunity.$ref).toBe("./funding-opportunity.schema.json");
    expect(root.properties.projects.items.$ref).toBe("./project.schema.json");
  });

  it("sub-models $ref the SDE files (guards against inlining)", () => {
    const fo = readFileSync("../../schemas/ic/funding-opportunity.schema.json", "utf8");
    expect(fo).toContain("../sde/FundingOpportunityTitle.schema.json");
    const project = JSON.parse(readFileSync("../../schemas/ic/project.schema.json", "utf8"));
    expect(project.properties.costSharing.$ref).toBe("./cost-sharing.schema.json");
    expect(project.properties.eligibleApplicantTypes.items.$ref).toBe(
      "../sde/EligibleApplicantEntityTypeCode.schema.json"
    );
  });
});
