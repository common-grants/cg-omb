import { TransformError, type TransformResult } from "@common-grants/sdk/extensions";
import type { NofoIc, NofoIcProject } from "./schemas";
import { uuidv5 } from "./util/uuid";

/**
 * NOFO IC ↔ CommonGrants Opportunity transforms.
 *
 * Direction of truth for round-trip: the funding-opportunity fields flow through
 * CommonGrants core + custom fields, and the full `projects[]` array is preserved
 * verbatim in the `projects` custom field. The first project's fields are *also*
 * surfaced to CommonGrants core/custom (key dates, applicant types, cost sharing,
 * eligibility, contact) as a convenience — those surfaced values are one-way and
 * are rebuilt from `projects` on `fromCommon`, so multi-project NOFOs round-trip
 * losslessly.
 *
 * REVIEWER NOTE (for the data-standards team): in the NOFO IC, key dates,
 * eligibility, cost sharing, and contact are *Project*-scoped, while a
 * CommonGrants Opportunity is flat. This transform surfaces the first project.
 * Open question to raise: why would projects with different funding limits,
 * award counts, and eligibility criteria live under one opportunity rather than
 * be separate opportunities? The answer may change this mapping.
 *
 * Transforms never throw; recoverable issues are accumulated as `TransformError`s
 * and returned alongside a best-effort `result`.
 */

// =============================================================================
// Status mappings (the IC has no status; a source system may supply one)
// =============================================================================

const CG_STATUSES = new Set(["forecasted", "open", "closed"]);

// =============================================================================
// Applicant-type mappings (OMB EligibleApplicantEntityTypeCode → CG value)
// =============================================================================

/**
 * OMB applicant-type code → CommonGrants `acceptedApplicantTypes` value.
 * Empty until the OMB entity-type domain values are crosswalked; until then all
 * codes pass through as `customValue`, preserving them for round-trip.
 */
const APPLICANT_TYPE_TO_COMMON: Record<string, string> = {};

// =============================================================================
// Helpers
// =============================================================================

/** CommonGrants money object from a dollar amount (the SDE amount is a string). */
function money(amount: string): { amount: string; currency: string } {
  return { amount, currency: "USD" };
}

/** A CommonGrants single-date key-date event. */
function singleDate(name: string, date: string | null | undefined) {
  return date ? { name, eventType: "singleDate" as const, date } : undefined;
}

/** Build a CommonGrants custom-field entry. */
function field(name: string, fieldType: string, value: unknown) {
  return { name, fieldType, value };
}

// =============================================================================
// toCommon — NOFO IC → CommonGrants Opportunity
// =============================================================================

export function toCommon(source: NofoIc): TransformResult<unknown> {
  const errors: TransformError[] = [];
  const fo = source.fundingOpportunity;
  const primary: NofoIcProject | undefined = source.projects?.[0];

  // --- id (derived deterministically from the FON when not supplied) ---
  let id = source.id ?? undefined;
  if (!id) {
    if (fo.fundingOpportunityNumber) {
      id = uuidv5(fo.fundingOpportunityNumber);
    } else {
      id = "";
      errors.push(
        new TransformError("Cannot derive opportunity id: no id or Funding Opportunity Number", {
          path: "fundingOpportunity.fundingOpportunityNumber",
        })
      );
    }
  }

  // --- status (IC has none; default to custom) ---
  const status =
    source.status && CG_STATUSES.has(source.status)
      ? { value: source.status }
      : { value: "custom", ...(source.status ? { customValue: source.status } : {}) };

  // --- timestamps (IC has none; use supplied record dates) ---
  const lastModifiedAt = source.lastModifiedDate ?? source.createdDate ?? undefined;
  const createdAt = source.createdDate ?? source.lastModifiedDate ?? undefined;
  if (!lastModifiedAt) {
    errors.push(
      new TransformError("No lastModifiedDate/createdDate on source; timestamps omitted", {
        path: "lastModifiedDate",
      })
    );
  }

  // --- funding (FO 1.09) ---
  const funding =
    fo.anticipatedAmount != null
      ? { totalAmountAvailable: money(fo.anticipatedAmount) }
      : undefined;

  // --- key dates (first project, 1.11) — include only dates that are present ---
  let keyDates: Record<string, unknown> | undefined;
  if (primary) {
    const kd: Record<string, unknown> = {};
    const post = singleDate(
      "Application Period Start",
      primary.anticipatedApplicationPeriodStartDate
    );
    if (post) kd.postDate = post;
    const close = singleDate("Application Period End", primary.anticipatedApplicationPeriodEndDate);
    if (close) kd.closeDate = close;
    const other: Record<string, unknown> = {};
    const award = singleDate("Anticipated Award Date", primary.anticipatedAwardDate);
    if (award) other.forecastedAwardDate = award;
    const projectStart = singleDate(
      "Anticipated Project Start Date",
      primary.anticipatedProjectStartDate
    );
    if (projectStart) other.forecastedProjectStartDate = projectStart;
    if (Object.keys(other).length > 0) kd.otherDates = other;
    if (Object.keys(kd).length > 0) keyDates = kd;
  }

  // --- accepted applicant types (first project, 2.01) ---
  const acceptedApplicantTypes = primary?.eligibleApplicantTypes?.map(code => {
    const mapped = APPLICANT_TYPE_TO_COMMON[code];
    return mapped ? { value: mapped } : { value: "custom", customValue: code };
  });

  // --- custom fields ---
  const cf: Record<string, unknown> = {};

  if (fo.fundingOpportunityNumber != null) {
    cf.federalOpportunityNumber = field(
      "federalOpportunityNumber",
      "string",
      fo.fundingOpportunityNumber
    );
  }
  cf.agency = field("agency", "object", {
    code: fo.awardingSubTierAgencyCode ?? null,
    name: fo.awardingSubTierAgencyName ?? null,
    parentCode: fo.awardingAgencyCode ?? null,
    parentName: fo.awardingAgencyName ?? null,
  });
  if (fo.relatedAssistanceListings && fo.relatedAssistanceListings.length > 0) {
    cf.assistanceListings = field(
      "assistanceListings",
      "array",
      fo.relatedAssistanceListings.map(al => ({
        identifier: al.identifier,
        programTitle: al.title,
      }))
    );
  }
  if (fo.assistanceType != null) {
    cf.federalFundingInstruments = field("federalFundingInstruments", "array", [
      { type: null, customValue: fo.assistanceType },
    ]);
  }
  if (fo.fiscalYear != null) {
    cf.fiscalYear = field("fiscalYear", "integer", fo.fiscalYear);
  }

  if (primary) {
    if (
      primary.pocRoleType != null ||
      primary.pocTitle != null ||
      primary.pocEmail != null ||
      primary.pocPhone != null
    ) {
      cf.contactInfo = field("contactInfo", "object", {
        name: primary.pocTitle ?? null,
        email: primary.pocEmail ?? null,
        phone: primary.pocPhone ?? null,
        description: primary.pocRoleType ?? null,
      });
    }
    if (primary.costSharing) {
      const cs = primary.costSharing;
      cf.costSharing = field("costSharing", "object", {
        isRequired: cs.requirementType != null ? true : undefined,
        requirementType: cs.requirementType ?? null,
        // The IC percentage is a string; the CG custom field value is numeric.
        percentage: cs.percentage != null ? Number(cs.percentage) : null,
        details: cs.description ?? null,
      });
    }
    if (
      (primary.eligibleBeneficiaryTypes && primary.eligibleBeneficiaryTypes.length > 0) ||
      primary.otherEligibilityRequirements != null
    ) {
      cf.eligibilityCriteria = field("eligibilityCriteria", "object", {
        beneficiaryTypes: (primary.eligibleBeneficiaryTypes ?? []).map(code => ({
          code,
          name: null,
        })),
        details: primary.otherEligibilityRequirements ?? null,
      });
    }
  }

  // Preserve every project verbatim for lossless round-trip.
  if (source.projects && source.projects.length > 0) {
    cf.projects = field("projects", "array", source.projects);
  }

  return {
    result: {
      id,
      title: fo.fundingOpportunityTitle ?? "",
      description: fo.fundingOpportunityDescription ?? "",
      status,
      funding,
      keyDates,
      acceptedApplicantTypes,
      customFields: Object.keys(cf).length > 0 ? cf : undefined,
      ...(createdAt ? { createdAt } : {}),
      ...(lastModifiedAt ? { lastModifiedAt } : {}),
    },
    errors,
  };
}

// =============================================================================
// fromCommon — CommonGrants Opportunity → NOFO IC
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromCommon(common: any): TransformResult<NofoIc> {
  const errors: TransformError[] = [];
  const cf = common.customFields ?? {};

  const agency = cf.agency?.value ?? {};
  const instruments = cf.federalFundingInstruments?.value as
    Array<{ type?: string | null; customValue?: string | null }> | undefined;
  const assistanceType = instruments?.[0]?.customValue ?? instruments?.[0]?.type ?? null;

  // The SDE amount is a string; CommonGrants money.amount is also a string.
  const amount = common.funding?.totalAmountAvailable?.amount;
  const anticipatedAmount = amount != null ? String(amount) : null;

  const statusValue = common.status?.customValue ?? common.status?.value;
  const status = statusValue && statusValue !== "custom" ? statusValue : null;

  const preservedProjects = (cf.projects?.value as NofoIcProject[] | undefined) ?? [];

  const result: NofoIc = {
    id: common.id ?? null,
    status,
    createdDate: dateString(common.createdAt),
    lastModifiedDate: dateString(common.lastModifiedAt),
    fundingOpportunity: {
      awardingAgencyCode: agency.parentCode ?? null,
      awardingAgencyName: agency.parentName ?? null,
      awardingSubTierAgencyCode: agency.code ?? null,
      awardingSubTierAgencyName: agency.name ?? null,
      fundingOpportunityNumber: cf.federalOpportunityNumber?.value ?? null,
      fundingOpportunityTitle: common.title ?? null,
      fundingOpportunityDescription: common.description ?? null,
      relatedAssistanceListings: (cf.assistanceListings?.value ?? []).map(
        (al: { identifier?: string | null; programTitle?: string | null }) => ({
          identifier: al.identifier ?? null,
          title: al.programTitle ?? null,
        })
      ),
      assistanceType,
      fiscalYear: cf.fiscalYear?.value ?? null,
      anticipatedAmount,
    },
    // Projects preserved verbatim on the way out are lossless; otherwise (e.g.
    // the data came from another source system with no OMB projects) synthesize
    // a first project from the project-scoped CommonGrants fields so they land
    // somewhere instead of being dropped.
    projects: preservedProjects.length > 0 ? preservedProjects : synthesizeProjects(common),
  };

  return { result, errors };
}

/** Build a NOFO IC project from the project-scoped CommonGrants fields. */
function synthesizeProjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  common: any
): NofoIcProject[] {
  const cf = common.customFields ?? {};
  const kd = common.keyDates ?? {};
  const cs = cf.costSharing?.value;
  const elig = cf.eligibilityCriteria?.value;
  const poc = cf.contactInfo?.value;

  const applicantTypes: string[] = (common.acceptedApplicantTypes ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((at: any) => at.customValue ?? at.value)
    .filter((v: unknown): v is string => typeof v === "string");
  const beneficiaryTypes: string[] = (elig?.beneficiaryTypes ?? [])
    .map((b: { code?: string | null }) => b.code)
    .filter((v: unknown): v is string => typeof v === "string");

  const project: NofoIcProject = {
    anticipatedApplicationPeriodStartDate: eventDate(kd.postDate),
    anticipatedApplicationPeriodEndDate: eventDate(kd.closeDate),
    anticipatedAwardDate: eventDate(kd.otherDates?.forecastedAwardDate),
    anticipatedProjectStartDate: eventDate(kd.otherDates?.forecastedProjectStartDate),
    eligibleApplicantTypes: applicantTypes.length > 0 ? applicantTypes : null,
    eligibleBeneficiaryTypes: beneficiaryTypes.length > 0 ? beneficiaryTypes : null,
    otherEligibilityRequirements: elig?.details ?? null,
    costSharing:
      cs && (cs.requirementType != null || cs.percentage != null || cs.details != null)
        ? {
            formulaCostSharingMoeRequirement: null,
            requirementType: cs.requirementType ?? null,
            percentage: cs.percentage != null ? String(cs.percentage) : null,
            description: cs.details ?? null,
          }
        : null,
    pocRoleType: poc?.description ?? null,
    pocTitle: poc?.name ?? null,
    pocEmail: poc?.email ?? null,
    pocPhone: poc?.phone ?? null,
  };

  const hasData = Object.values(project).some(
    v => v != null && !(Array.isArray(v) && v.length === 0)
  );
  return hasData ? [project] : [];
}

/** Extract a date string (YYYY-MM-DD) from a CommonGrants key-date event. */
function eventDate(event: { date?: unknown } | undefined): string | null {
  const d = event?.date;
  if (d == null) return null;
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

/** Normalize a Date or string to a date/time string (Date coercion is lossy but safe). */
function dateString(dt: unknown): string | null {
  if (dt == null) return null;
  if (dt instanceof Date) return dt.toISOString();
  return String(dt);
}
