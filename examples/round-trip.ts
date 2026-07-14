/**
 * Round-trip example: NOFO IC → CommonGrants → NOFO IC.
 *
 * Prints the record at each stage and checks that the round-trip is lossless
 * (ignoring null-vs-absent differences). Run with: pnpm example:roundtrip
 */

import plugin from "../src/index";
import { NofoIcSchema, type NofoIc } from "../src/schemas";

const original: NofoIc = NofoIcSchema.parse({
  id: "1b9d1b1a-0000-4000-8000-000000000001",
  status: "open",
  createdDate: "2026-06-01T00:00:00.000Z",
  lastModifiedDate: "2026-06-17T00:00:00.000Z",
  fundingOpportunity: {
    awardingAgencyCode: "HHS",
    awardingAgencyName: "Department of Health and Human Services",
    awardingSubTierAgencyCode: "NIH",
    awardingSubTierAgencyName: "National Institutes of Health",
    fundingOpportunityNumber: "HHS-2025-001",
    fundingOpportunityTitle: "STEM Education Grant Program",
    fundingOpportunityDescription: "A grant program focused on STEM education.",
    relatedAssistanceListings: [{ identifier: "93.123", title: "STEM Education" }],
    assistanceType: "F001",
    fiscalYear: 2025,
    anticipatedAmount: 1_000_000,
  },
  projects: [
    {
      projectIdentifier: "P1",
      projectName: "Urban STEM",
      anticipatedApplicationPeriodStartDate: "2026-01-01",
      anticipatedApplicationPeriodEndDate: "2026-03-01",
      anticipatedAwardDate: "2026-06-01",
      anticipatedProjectStartDate: "2026-09-01",
      eligibleApplicantTypes: ["A01", "A02"],
      eligibleBeneficiaryTypes: ["B01"],
      otherEligibilityRequirements: "Must serve Title I schools.",
      costSharing: { requirementType: "S", percentage: 25, description: "25% match required." },
      pocRoleType: "Program Officer",
      pocTitle: "Grants Management Specialist",
      pocEmail: "pm@nih.gov",
      pocPhone: "555-0100",
    },
    { projectIdentifier: "P2", projectName: "Rural STEM", eligibleApplicantTypes: ["A03"] },
  ],
});

const opportunity = plugin.schemas.Opportunity;

/** Drop null/undefined and sort keys so "absent" and "null" compare equal. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = canonical((value as Record<string, unknown>)[key]);
      if (v !== null && v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

/** Report every leaf path where two canonicalized values differ. */
function diff(a: unknown, b: unknown, path = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap(k =>
      diff(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k
      )
    );
  }
  return [`${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`];
}

function main() {
  console.log("═══ 1. Original NOFO IC ═══");
  console.log(JSON.stringify(original, null, 2));

  const { result: common, errors: toErrors } = opportunity.toCommon(original);
  console.log("\n═══ 2. → CommonGrants Opportunity ═══");
  console.log(JSON.stringify(common, null, 2));
  if (toErrors.length)
    console.log(
      "toCommon errors:",
      toErrors.map(e => e.message)
    );

  const { result: back, errors: fromErrors } = opportunity.fromCommon(common);
  console.log("\n═══ 3. → back to NOFO IC ═══");
  console.log(JSON.stringify(back, null, 2));
  if (fromErrors.length)
    console.log(
      "fromCommon errors:",
      fromErrors.map(e => e.message)
    );

  console.log("\n═══ 4. Lossless check ═══");
  const diffs = diff(canonical(original), canonical(back));
  if (diffs.length === 0) {
    console.log("LOSSLESS ✅ — round-tripped record matches the original.");
  } else {
    console.log(`LOSSY ⚠️ — ${diffs.length} field(s) differ:`);
    for (const d of diffs) console.log(`  - ${d}`);
    process.exitCode = 1;
  }
}

main();
