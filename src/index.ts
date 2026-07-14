/**
 * `@common-grants/cg-omb` — CommonGrants plugin for the OMB grants data
 * standards, centered on the Notice of Funding Opportunity (NOFO) Information
 * Collection (IC).
 *
 * Extends the CommonGrants `Opportunity` schema with OMB-specific custom fields
 * and provides bidirectional transforms between the NOFO IC source shape and the
 * CommonGrants Opportunity schema. See TRANSFORMS.md for the field mapping.
 */

import { definePlugin } from "@common-grants/sdk/extensions";
import { customFields } from "./custom-fields";
import { NofoIcSchema } from "./schemas";
import { toCommon, fromCommon } from "./transforms";

/** Stable identifier for this plugin's source system. */
export const SOURCE_SYSTEM = "OMB NOFO IC";

/**
 * CommonGrants plugin for the OMB NOFO IC.
 *
 * @example
 * ```ts
 * import plugin from "@common-grants/cg-omb";
 *
 * // Transform a NOFO IC record into CommonGrants Opportunity shape
 * const { result, errors } = plugin.schemas.Opportunity.toCommon(nofoIc);
 *
 * // Validate CommonGrants-shaped data with OMB custom fields
 * const opp = plugin.schemas.Opportunity.commonSchema.parse(data);
 * console.log(opp.customFields?.agency?.value.name);
 * ```
 */
const plugin = definePlugin({
  meta: {
    name: "omb",
    sourceSystem: SOURCE_SYSTEM,
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      customFields,
      sourceSchema: NofoIcSchema,
      toCommon,
      fromCommon,
    },
  },
});

export default plugin;
export { customFields } from "./custom-fields";
export { toCommon, fromCommon } from "./transforms";
export {
  NofoIcSchema,
  FundingOpportunitySchema,
  ProjectSchema,
  ProjectCostSharingSchema,
  RelatedAssistanceListingSchema,
} from "./schemas";
export type { NofoIc, NofoIcFundingOpportunity, NofoIcProject } from "./schemas";
export {
  AdditionalInfoValueSchema,
  AgencyValueSchema,
  AssistanceListingValueSchema,
  AttachmentValueSchema,
  ContactInfoValueSchema,
  CostSharingValueSchema,
  BeneficiaryTypeValueSchema,
  EligibilityCriteriaValueSchema,
  FederalFundingInstrumentValueSchema,
  FederalFundingSourceValueSchema,
} from "./custom-fields";
