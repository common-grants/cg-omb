/**
 * End-to-end example: translate an opportunity between Grants.gov and the
 * federal NOFO IC, using CommonGrants as the interchange format.
 *
 *   Grants.gov  --cg-grants-gov.toCommon-->  CommonGrants  --cg-federal.fromCommon-->  Federal NOFO IC
 *
 * and back the other way. Neither plugin knows about the other; CommonGrants is
 * the shared shape they both map to and from.
 *
 * Run with: pnpm example:interop
 */

import cgGrantsGov from "@common-grants/cg-grants-gov";
import cgFederal from "../src/index";

const grantsGovOpportunity = {
  opportunity_id: "573525f2-8e15-4405-83fb-e6523511d893",
  legacy_opportunity_id: 12345,
  opportunity_number: "HHS-2025-001",
  opportunity_title: "STEM Education Grant Program",
  agency_code: "HHS-NIH",
  agency_name: "National Institutes of Health",
  top_level_agency_code: "HHS",
  top_level_agency_name: "Department of Health and Human Services",
  category: "discretionary",
  opportunity_assistance_listings: [
    { assistance_listing_number: "93.123", program_title: "STEM Education" },
  ],
  summary: {
    summary_description: "A grant program focused on STEM education.",
    is_cost_sharing: true,
    is_forecast: false,
    post_date: "2026-01-01",
    close_date: "2026-03-01",
    expected_number_of_awards: 10,
    estimated_total_program_funding: 1000000,
    award_floor: 50000,
    award_ceiling: 200000,
    funding_instruments: ["grant"],
    funding_categories: ["education"],
    applicant_types: ["state_governments"],
    created_at: "2026-01-01T00:00:00.000000+00:00",
    updated_at: "2026-01-15T00:00:00.000000+00:00",
  },
  opportunity_status: "posted" as const,
  attachments: [],
  created_at: "2026-01-01T00:00:00.000000+00:00",
  updated_at: "2026-01-15T00:00:00.000000+00:00",
};

const grantsGov = cgGrantsGov.schemas.Opportunity;
const federal = cgFederal.schemas.Opportunity;

function heading(text: string) {
  console.log(`\n${"═".repeat(72)}\n${text}\n${"═".repeat(72)}`);
}

function main() {
  // ---- Grants.gov → CommonGrants → Federal --------------------------------
  heading("1. Grants.gov opportunity (source)");
  console.log(JSON.stringify(grantsGovOpportunity, null, 2));

  const toCommon = grantsGov.toCommon(grantsGovOpportunity);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = toCommon.result as any;
  heading("2. → CommonGrants Opportunity (interchange)");
  console.log(JSON.stringify(common, null, 2));
  reportErrors("cg-grants-gov.toCommon", toCommon.errors);

  const toFederal = federal.fromCommon(common);
  heading("3. → Federal NOFO IC");
  console.log(JSON.stringify(toFederal.result, null, 2));
  reportErrors("cg-federal.fromCommon", toFederal.errors);

  // ---- Federal → CommonGrants → Grants.gov (the other direction) -----------
  const backToCommon = federal.toCommon(toFederal.result);
  // Each plugin types its own CommonGrants customFields, so the interchange
  // value is cast at the hand-off between plugins (structurally compatible).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backToGrantsGov = grantsGov.fromCommon(backToCommon.result as any);
  heading("4. Round the other way: Federal → CommonGrants → Grants.gov");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gg = backToGrantsGov.result as any;
  console.log(`opportunity_number: ${gg.opportunity_number}`);
  console.log(`opportunity_title:  ${gg.opportunity_title}`);
  console.log(`agency_code:        ${gg.agency_code}`);
  console.log(`total funding:      ${gg.summary?.estimated_total_program_funding}`);
  reportErrors("cg-federal.toCommon", backToCommon.errors);
  reportErrors("cg-grants-gov.fromCommon", backToGrantsGov.errors);

  // ---- What crosses the interchange, and what doesn't ---------------------
  heading("What transfers vs. what is source-specific");
  console.log(
    [
      "Funding-opportunity level (from CommonGrants core + custom fields):",
      "  • title, description, status, funding amount, agency (code + parent),",
      "    federal opportunity number, assistance listings",
      "",
      "Project level (synthesized into the first federal project, since a Grants.gov",
      "opportunity has no projects of its own):",
      "  • application period dates, applicant types, eligibility, cost sharing, POC",
      "",
      "Caveats:",
      '  • Applicant types carry the CommonGrants value (e.g. "government_state"),',
      "    not a federal entity-type code, until the applicant-type crosswalk is added.",
      "  • Grants.gov's is-cost-sharing boolean has no project field, so it does not",
      "    populate the federal cost-sharing block.",
    ].join("\n")
  );
}

function reportErrors(label: string, errors: { message: string; path?: string }[]) {
  if (errors.length === 0) return;
  console.log(`\n[${label}] ${errors.length} warning(s):`);
  for (const e of errors) console.log(`  - ${e.message}${e.path ? ` (${e.path})` : ""}`);
}

main();
