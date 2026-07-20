import { z } from "zod";

/**
 * Hand-written Zod for the NOFO IC source shape (L1).
 *
 * This models a NOFO Information Collection *instance* as a source system would
 * present it: a single funding opportunity plus its repeatable projects. Field
 * placement (Funding Opportunity vs. Project) follows the `(IC) NOFO` tab; item
 * numbers below are the current v3.0 workbook numbers.
 *
 * Scope: the T1 subset — the items that map to a CommonGrants core field or a
 * custom field. The full IC hierarchy (authorizations, review criteria,
 * post-award reporting, …) is intentionally not modeled yet.
 *
 * The IC itself has no opportunity id, status, or system timestamps; those are
 * optional here and defaulted/derived by the transforms (see src/transforms.ts).
 */

// =============================================================================
// Funding Opportunity level (subsets 1.01, 1.02, 1.03, 1.09)
// =============================================================================

/** A related assistance listing — Code/Name pairing (1.02, workbook). */
export const RelatedAssistanceListingSchema = z.object({
  identifier: z.string().nullish(),
  title: z.string().nullish(),
});

export const FundingOpportunitySchema = z.object({
  // 1.01 Key Facts — the awarding agency (1.01.01) is the department/top tier;
  // the sub-tier (1.01.02) is the specific awarding agency.
  awardingAgencyCode: z.string().nullish(), // 1.01.01
  awardingAgencyName: z.string().nullish(),
  awardingSubTierAgencyCode: z.string().nullish(), // 1.01.02
  awardingSubTierAgencyName: z.string().nullish(),
  fundingOpportunityNumber: z.string().nullish(), // 1.01.04
  fundingOpportunityTitle: z.string().nullish(), // 1.01.05
  fundingOpportunityDescription: z.string().nullish(), // 1.01.08

  // 1.02 Related Assistance Listing(s)
  relatedAssistanceListings: z.array(RelatedAssistanceListingSchema).nullish(),

  // 1.09 Funding Details. NOTE: OMB models these as strings (SDE is source of
  // truth) — fiscal year and amount included.
  assistanceType: z.string().nullish(), // 1.09.01 (code)
  fiscalYear: z.string().nullish(), // 1.09.04 (SDE: string)
  anticipatedAmount: z.string().nullish(), // 1.09.05 (SDE: string, US dollars)
});

// =============================================================================
// Project level (subsets 1.11, 2.01, 2.03, 2.06, 2.07, 6.06)
// =============================================================================

/** Cost-sharing requirement (subset 2.07, workbook numbering). */
export const ProjectCostSharingSchema = z.object({
  formulaCostSharingMoeRequirement: z.string().nullish(), // 2.07.01 umbrella code
  requirementType: z.string().nullish(), // 2.07.03 cost sharing type code
  percentage: z.string().nullish(), // 2.07.04 (SDE: string)
  description: z.string().nullish(), // 2.07.06
});

export const ProjectSchema = z.object({
  projectIdentifier: z.string().nullish(), // 1.10.02
  projectName: z.string().nullish(), // 1.10.01

  // 1.11 Key Dates
  anticipatedApplicationPeriodStartDate: z.string().nullish(), // 1.11.05
  anticipatedApplicationPeriodEndDate: z.string().nullish(), // 1.11.06
  anticipatedAwardDate: z.string().nullish(), // 1.11.11
  anticipatedProjectStartDate: z.string().nullish(), // 1.11.12

  // 2.01 / 2.03 eligibility (codes)
  eligibleApplicantTypes: z.array(z.string()).nullish(), // 2.01.01
  eligibleBeneficiaryTypes: z.array(z.string()).nullish(), // 2.03.01

  // 2.06.04 other eligibility
  otherEligibilityRequirements: z.string().nullish(),

  // 2.07 cost sharing
  costSharing: ProjectCostSharingSchema.nullish(),

  // 6.06 Contact / POC
  pocRoleType: z.string().nullish(), // 6.06.01
  pocTitle: z.string().nullish(), // 6.06.02
  pocEmail: z.string().nullish(), // 6.06.03
  pocPhone: z.string().nullish(), // 6.06.04
});

// =============================================================================
// NOFO IC root
// =============================================================================

export const NofoIcSchema = z.object({
  /** Opportunity id — not part of the IC; derived (UUIDv5 of the FON) if absent. */
  id: z.string().nullish(),
  /** Opportunity status — not part of the IC; defaults to "custom" if absent. */
  status: z.string().nullish(),
  /** Record timestamps — not part of the IC; supplied by the source if available. */
  createdDate: z.string().nullish(),
  lastModifiedDate: z.string().nullish(),

  fundingOpportunity: FundingOpportunitySchema,
  projects: z.array(ProjectSchema).default([]),
});

export type NofoIc = z.infer<typeof NofoIcSchema>;
export type NofoIcFundingOpportunity = z.infer<typeof FundingOpportunitySchema>;
export type NofoIcProject = z.infer<typeof ProjectSchema>;
