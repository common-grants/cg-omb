import { describe, it, expect } from "vitest";
import plugin, { SOURCE_SYSTEM } from "../index";
import { customFields } from "../custom-fields";

describe("plugin scaffolding", () => {
  it("exports the source system identifier", () => {
    expect(SOURCE_SYSTEM).toBe("Federal NOFO IC");
  });

  it("declares the customFields + transforms capabilities", () => {
    expect(plugin.meta?.name).toBe("federal");
    expect(plugin.meta?.capabilities).toEqual(
      expect.arrayContaining(["customFields", "transforms"])
    );
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
        "fiscalYear",
        "legacySerialId",
        "projects",
      ].sort()
    );
  });

  it("wires transforms on the Opportunity schema", () => {
    expect(typeof plugin.schemas.Opportunity.toCommon).toBe("function");
    expect(typeof plugin.schemas.Opportunity.fromCommon).toBe("function");
  });
});
