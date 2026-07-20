/**
 * Example: transform a NOFO IC record into CommonGrants Opportunity shape and
 * validate it against the plugin's extended `commonSchema`.
 *
 * Run with: pnpm example:parse
 */

import plugin from "../src/index";
import { NofoIcSchema } from "../src/schemas";

const nofoIc = NofoIcSchema.parse({
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
    fiscalYear: "2025",
    anticipatedAmount: "1000000",
  },
  projects: [
    {
      projectName: "Urban STEM",
      anticipatedApplicationPeriodStartDate: "2026-01-01",
      anticipatedApplicationPeriodEndDate: "2026-03-01",
      eligibleApplicantTypes: ["A01"],
      costSharing: { requirementType: "S", percentage: "25" },
      pocTitle: "Grants Management Specialist",
      pocEmail: "pm@nih.gov",
    },
  ],
});

const opportunitySchema = plugin.schemas.Opportunity;

function main() {
  console.log("=== NOFO IC → CommonGrants Opportunity ===\n");

  const { result, errors } = opportunitySchema.toCommon(nofoIc);
  if (errors.length > 0) {
    console.log("Transform warnings:");
    for (const e of errors) console.log(`  - ${e.message}${e.path ? ` (${e.path})` : ""}`);
    console.log();
  }

  // Validate the transformed record against the extended CommonGrants schema.
  const opportunity = opportunitySchema.commonSchema.parse(result);

  console.log(`Title:  ${opportunity.title}`);
  console.log(`Id:     ${opportunity.id}`);
  console.log(`Status: ${opportunity.status.value}`);
  const cf = opportunity.customFields;
  console.log(`Agency: ${cf?.agency?.value.name} (parent ${cf?.agency?.value.parentCode})`);
  console.log(`FON:    ${cf?.federalOpportunityNumber?.value}`);
  console.log(`Projects preserved: ${cf?.projects?.value?.length ?? 0}`);

  console.log("\n=== Round-trip back to NOFO IC ===\n");
  const { result: nofoBack } = opportunitySchema.fromCommon(opportunity);
  console.log(`FON:            ${nofoBack.fundingOpportunity.fundingOpportunityNumber}`);
  console.log(`Anticipated $:  ${nofoBack.fundingOpportunity.anticipatedAmount}`);
  console.log(`Projects:       ${nofoBack.projects.length}`);

  console.log("\n=== Example complete ===");
}

main();
