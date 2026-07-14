import { z } from "zod";
import { ProjectSchema } from "./schemas";

/**
 * Custom-field value schemas for the OMB NOFO IC plugin's `Opportunity` schema.
 *
 * These mirror the `cg-custom` rows of the OMB ↔ CommonGrants data-mapping
 * crosswalk (tab 1). Each `*ValueSchema` is the Zod shape stored under a custom
 * field's `value`; the `customFields` spec at the bottom is what the plugin
 * passes to `definePlugin`.
 *
 * NOTE (Phase 2): the `type` fields on funding instruments/sources are typed as
 * strings here. Once the SDE-level enums are authored (e.g. AssistanceTypeCode),
 * these can tighten to the CommonGrants enum + `customValue` fallback, and the
 * transform lookup tables will map IC codes → CG enum values.
 */

// =============================================================================
// Value schemas (cg-custom rows, Opportunity entity)
// =============================================================================

/** `additionalInfo` — supplementary URL + description. */
export const AdditionalInfoValueSchema = z.object({
  url: z.string().nullish(),
  description: z.string().nullish(),
});

/** `agency` — administering agency identity (IC 1.01.01, + parent hierarchy). */
export const AgencyValueSchema = z.object({
  code: z.string().nullish(),
  name: z.string().nullish(),
  parentCode: z.string().nullish(),
  parentName: z.string().nullish(),
});

/** `assistanceListings[]` — primary related assistance listing (IC 1.02.01/02). */
export const AssistanceListingValueSchema = z.object({
  identifier: z.string().nullish(),
  programTitle: z.string().nullish(),
});

/** `attachments[]` — NOFO and supplemental documents. */
export const AttachmentValueSchema = z.object({
  downloadUrl: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  sizeInBytes: z.number().int().nullish(),
  mimeType: z.string().nullish(),
  createdAt: z.string().datetime(),
  lastModifiedAt: z.string().datetime(),
});

/** `contactInfo` — point of contact, mapped from the POC block (IC 6.06.x). */
export const ContactInfoValueSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  description: z.string().nullish(),
});

/**
 * `costSharing` — cost-sharing requirement (IC 2.07.01/02/04).
 *
 * `isRequired` is the CommonGrants-normalized boolean derived from the IC
 * "Cost Sharing Requirement Type" code (2.07.01). Because that code carries more
 * nuance than a boolean (e.g. mandatory vs. voluntary), `requirementType`
 * preserves the raw IC value verbatim so `toCommon` → `fromCommon` is lossless.
 * `details` is the free-text description (2.07.04) — kept separate so the two IC
 * items never collapse into one field.
 */
export const CostSharingValueSchema = z.object({
  isRequired: z.boolean().nullish(),
  requirementType: z.string().nullish(),
  percentage: z.number().nullish(),
  details: z.string().nullish(),
});

/** A single eligible beneficiary type (IC 2.03.01). */
export const BeneficiaryTypeValueSchema = z.object({
  code: z.string().nullish(),
  name: z.string().nullish(),
});

/** `eligibilityCriteria` — beneficiary types + free-text detail (IC 2.03/2.06.04). */
export const EligibilityCriteriaValueSchema = z.object({
  beneficiaryTypes: z.array(BeneficiaryTypeValueSchema).nullish(),
  details: z.string().nullish(),
});

/**
 * A single federal funding instrument (IC 1.09.01, "Funding Opportunity
 * Assistance Type"). Enum-with-custom-fallback: `type` carries the normalized
 * CommonGrants value, `customValue` any out-of-enum value.
 */
export const FederalFundingInstrumentValueSchema = z.object({
  type: z.string().nullish(),
  customValue: z.string().nullish(),
});

/** `federalFundingSources` — funding source/category, enum-with-custom-fallback. */
export const FederalFundingSourceValueSchema = z.object({
  type: z.string().nullish(),
  customValue: z.string().nullish(),
});

// =============================================================================
// Custom field specs
// =============================================================================

/**
 * Custom fields extending the CommonGrants `Opportunity` schema, one per
 * `cg-custom` row in the mapping crosswalk. Passed to `definePlugin` under
 * `schemas.Opportunity.customFields`.
 */
export const customFields = {
  additionalInfo: {
    fieldType: "object",
    value: AdditionalInfoValueSchema,
    description: "Supplementary URL and description for the opportunity",
  },
  agency: {
    fieldType: "object",
    value: AgencyValueSchema,
    description: "The administering agency and its parent in the federal hierarchy (IC 1.01.01)",
  },
  assistanceListings: {
    fieldType: "array",
    value: z.array(AssistanceListingValueSchema),
    description: "Primary related assistance listing number and title (IC 1.02.01/1.02.02)",
  },
  attachments: {
    fieldType: "array",
    value: z.array(AttachmentValueSchema),
    description: "Attachments such as NOFOs and supplemental documents for the opportunity",
  },
  contactInfo: {
    fieldType: "object",
    value: ContactInfoValueSchema,
    description: "Point of contact for the opportunity, from the POC block (IC 6.06)",
  },
  costSharing: {
    fieldType: "object",
    value: CostSharingValueSchema,
    description: "Cost-sharing / matching requirement, percentage, and details (IC 2.07)",
  },
  eligibilityCriteria: {
    fieldType: "object",
    value: EligibilityCriteriaValueSchema,
    description: "Eligible beneficiary types and additional eligibility detail (IC 2.03/2.06.04)",
  },
  federalFundingInstruments: {
    fieldType: "array",
    value: z.array(FederalFundingInstrumentValueSchema),
    description: "Federal funding instrument (assistance) types offered (IC 1.09.01)",
  },
  federalFundingSources: {
    fieldType: "object",
    value: FederalFundingSourceValueSchema,
    description: "Federal funding source / category for the opportunity",
  },
  federalOpportunityNumber: {
    fieldType: "string",
    description: "The federal funding opportunity number (IC 1.01.04)",
  },
  legacySerialId: {
    fieldType: "integer",
    description: "An integer ID for the opportunity, for compatibility with legacy systems",
  },
  fiscalYear: {
    fieldType: "integer",
    description: "The fiscal year associated with the funding opportunity (IC 1.09.04)",
  },
  projects: {
    fieldType: "array",
    value: z.array(ProjectSchema),
    description:
      "All NOFO IC projects, preserved verbatim for lossless round-trip. The " +
      "first project's fields are also surfaced to CommonGrants core/custom fields.",
  },
} as const;
