import { describe, it, expect } from "vitest";
import plugin, { SOURCE_SYSTEM } from "../index";
import { customFields } from "../custom-fields";

describe("plugin scaffolding", () => {
  it("exports the source system identifier", () => {
    expect(SOURCE_SYSTEM).toBe("OMB NOFO IC");
  });

  it("declares the customFields capability", () => {
    expect(plugin.meta?.name).toBe("omb");
    expect(plugin.meta?.capabilities).toContain("customFields");
  });

  it("defines the expected Opportunity custom fields", () => {
    expect(Object.keys(customFields).sort()).toEqual(
      [
        "additionalInfo",
        "agency",
        "assistanceListings",
        "attachments",
        "contactInfo",
        "costSharing",
        "eligibilityCriteria",
        "federalFundingInstruments",
        "federalFundingSources",
        "federalOpportunityNumber",
        "legacySerialId",
      ].sort()
    );
  });
});
