import { describe, it, expect } from "vitest";
import { NofoIcSchema, type NofoIc } from "../schemas";
import { toCommon, fromCommon } from "../transforms";
import { uuidv5 } from "../util/uuid";

/** A representative NOFO IC record with two projects. */
const FIXTURE: NofoIc = NofoIcSchema.parse({
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
    {
      projectIdentifier: "P2",
      projectName: "Rural STEM",
      eligibleApplicantTypes: ["A03"],
    },
  ],
});

describe("toCommon", () => {
  const { result, errors } = toCommon(FIXTURE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any;

  it("maps funding-opportunity core fields", () => {
    expect(errors).toEqual([]);
    expect(r.title).toBe("STEM Education Grant Program");
    expect(r.description).toBe("A grant program focused on STEM education.");
    expect(r.funding.totalAmountAvailable).toEqual({ amount: "1000000", currency: "USD" });
  });

  it("derives a deterministic id from the Funding Opportunity Number", () => {
    expect(r.id).toBe(uuidv5("HHS-2025-001"));
    expect(r.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("defaults status to custom when the IC supplies none", () => {
    expect(r.status).toEqual({ value: "custom" });
  });

  it("surfaces the first project's key dates and applicant types", () => {
    expect(r.keyDates.postDate.date).toBe("2026-01-01");
    expect(r.keyDates.closeDate.date).toBe("2026-03-01");
    expect(r.acceptedApplicantTypes).toEqual([
      { value: "custom", customValue: "A01" },
      { value: "custom", customValue: "A02" },
    ]);
  });

  it("maps agency with sub-tier as the agency and department as the parent", () => {
    expect(r.customFields.agency.value).toEqual({
      code: "NIH",
      name: "National Institutes of Health",
      parentCode: "HHS",
      parentName: "Department of Health and Human Services",
    });
  });

  it("preserves every project verbatim in the projects custom field", () => {
    expect(r.customFields.projects.value).toHaveLength(2);
    expect(r.customFields.projects.value[1].projectName).toBe("Rural STEM");
  });

  it("accumulates an error (not a throw) when no id or FON is available", () => {
    const { result: res, errors: errs } = toCommon(
      NofoIcSchema.parse({ fundingOpportunity: {}, projects: [] })
    );
    // Two recoverable issues: no FON to derive an id from, and no timestamps.
    expect(errs).toHaveLength(2);
    expect(errs.some(e => e.path?.includes("fundingOpportunityNumber"))).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((res as any).id).toBe("");
  });
});

describe("fromCommon(toCommon(x)) round-trip", () => {
  const common = toCommon(FIXTURE).result;
  const { result: back, errors } = fromCommon(common);

  it("round-trips funding-opportunity fields", () => {
    expect(errors).toEqual([]);
    expect(back.fundingOpportunity.fundingOpportunityNumber).toBe("HHS-2025-001");
    expect(back.fundingOpportunity.awardingAgencyCode).toBe("HHS");
    expect(back.fundingOpportunity.awardingSubTierAgencyCode).toBe("NIH");
    expect(back.fundingOpportunity.fundingOpportunityTitle).toBe("STEM Education Grant Program");
    expect(back.fundingOpportunity.fiscalYear).toBe(2025);
    expect(back.fundingOpportunity.anticipatedAmount).toBe(1_000_000);
    expect(back.fundingOpportunity.assistanceType).toBe("F001");
    expect(back.fundingOpportunity.relatedAssistanceListings).toEqual([
      { identifier: "93.123", title: "STEM Education" },
    ]);
  });

  it("round-trips all projects verbatim (multi-project safe)", () => {
    expect(back.projects).toEqual(FIXTURE.projects);
  });
});

describe("uuidv5", () => {
  it("is deterministic and RFC-4122 version 5", () => {
    expect(uuidv5("HHS-2025-001")).toBe(uuidv5("HHS-2025-001"));
    expect(uuidv5("a")).not.toBe(uuidv5("b"));
    expect(uuidv5("x")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
