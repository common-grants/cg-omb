/**
 * `@common-grants/cg-omb` — CommonGrants plugin for the OMB grants data
 * standards, centered on the Notice of Funding Opportunity (NOFO) Information
 * Collection (IC).
 *
 * This build wires the `Opportunity` custom fields derived from the OMB ↔
 * CommonGrants data-mapping crosswalk. The NOFO IC source schema and the
 * `toCommon` / `fromCommon` transforms land in later phases — see
 * OMB-implementation-plan.md.
 */

import { definePlugin } from "@common-grants/sdk/extensions";
import { customFields } from "./custom-fields";

/** Stable identifier for this plugin's source system. */
export const SOURCE_SYSTEM = "OMB NOFO IC";

/**
 * CommonGrants plugin for the OMB NOFO IC.
 *
 * Currently declares the `customFields` capability: it extends the CommonGrants
 * `Opportunity` schema with OMB-specific custom fields. Transforms are added in
 * a later phase once the NOFO IC source schema is authored.
 *
 * @example
 * ```ts
 * import plugin from "@common-grants/cg-omb";
 *
 * const opp = plugin.schemas.Opportunity.commonSchema.parse(data);
 * console.log(opp.customFields?.agency?.value.name);
 * ```
 */
const plugin = definePlugin({
  meta: {
    name: "omb",
    sourceSystem: SOURCE_SYSTEM,
    capabilities: ["customFields"],
  },
  schemas: {
    Opportunity: {
      customFields,
    },
  },
});

export default plugin;
export { customFields } from "./custom-fields";
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
