# Transforms: NOFO IC ↔ CommonGrants Opportunity

`@common-grants/cg-omb` maps the OMB **NOFO Information Collection** to the
CommonGrants **Opportunity** schema via `toCommon` / `fromCommon`
(`src/transforms.ts`). Transforms never throw; recoverable issues are
accumulated as `TransformError`s and returned alongside a best-effort `result`.

Scope: the **T1** subset — the IC items that map to a CommonGrants core field or
a declared custom field. Item numbers are the current workbook numbers (see
`crosswalk/reconciliation.json`).

## Structural model

A NOFO IC is a single **funding opportunity** with a repeatable **`projects[]`**
array. A CommonGrants Opportunity is flat. So:

- Funding-opportunity fields → CommonGrants core + custom fields.
- The **first project** is _surfaced_ to CommonGrants core/custom (key dates,
  applicant types, cost sharing, eligibility, contact).
- The **full `projects[]`** array is preserved verbatim in the `projects`
  custom field, so `fromCommon` rebuilds every project — multi-project NOFOs
  round-trip losslessly. The surfaced first-project values are one-way.

> **Reviewer note (data-standards team):** key dates, eligibility, cost sharing,
> and contact are _Project_-scoped in the IC. Open question: why would projects
> with different funding limits, award counts, and eligibility live under one
> opportunity rather than be separate opportunities? The answer may change this
> mapping (and whether "first project" is the right surfacing rule).

## System fields not present in the IC

The IC has no opportunity id, status, or record timestamps. The transform:

| CommonGrants field             | Source                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                           | `source.id` if supplied, else **deterministic UUIDv5** of the Funding Opportunity Number (stable across runs); error accumulated if neither is available            |
| `status`                       | `source.status` when it is a CommonGrants status (`forecasted`/`open`/`closed`), else `{ value: "custom", customValue: source.status }`, else `{ value: "custom" }` |
| `createdAt` / `lastModifiedAt` | `source.createdDate` / `source.lastModifiedDate` (a source system supplies these); error accumulated if absent                                                      |

## Funding-opportunity fields (FO-level)

| IC item    | NofoIc field                                 | CommonGrants target                                                                      |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1.01.01/02 | `awardingAgency*` / `awardingSubTierAgency*` | `customFields.agency` (`code`/`name` = sub-tier, `parentCode`/`parentName` = department) |
| 1.01.04    | `fundingOpportunityNumber`                   | `customFields.federalOpportunityNumber` (and the derived `id`)                           |
| 1.01.05    | `fundingOpportunityTitle`                    | `title`                                                                                  |
| 1.01.08    | `fundingOpportunityDescription`              | `description`                                                                            |
| 1.02       | `relatedAssistanceListings[]`                | `customFields.assistanceListings[]` (`{identifier, programTitle}`)                       |
| 1.09.01    | `assistanceType`                             | `customFields.federalFundingInstruments[].customValue`                                   |
| 1.09.04    | `fiscalYear`                                 | `customFields.fiscalYear`                                                                |
| 1.09.05    | `anticipatedAmount`                          | `funding.totalAmountAvailable` (`{amount, currency: "USD"}`)                             |

## Project fields (first project surfaced)

| IC item       | NofoIc field                                             | CommonGrants target                                                                      |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1.11.05       | `anticipatedApplicationPeriodStartDate`                  | `keyDates.postDate`                                                                      |
| 1.11.06       | `anticipatedApplicationPeriodEndDate`                    | `keyDates.closeDate`                                                                     |
| 1.11.11       | `anticipatedAwardDate`                                   | `keyDates.otherDates.forecastedAwardDate`                                                |
| 1.11.12       | `anticipatedProjectStartDate`                            | `keyDates.otherDates.forecastedProjectStartDate`                                         |
| 2.01.01       | `eligibleApplicantTypes[]`                               | `acceptedApplicantTypes[]` (see lookup below)                                            |
| 2.03.01       | `eligibleBeneficiaryTypes[]`                             | `customFields.eligibilityCriteria.beneficiaryTypes[]`                                    |
| 2.06.04       | `otherEligibilityRequirements`                           | `customFields.eligibilityCriteria.details`                                               |
| 2.07.03/04/06 | `costSharing.{requirementType, percentage, description}` | `customFields.costSharing.{requirementType, percentage, details}` (`isRequired` derived) |
| 6.06.01–04    | `poc{RoleType, Title, Email, Phone}`                     | `customFields.contactInfo.{description, name, email, phone}`                             |
| all           | entire `projects[]`                                      | `customFields.projects[]` (verbatim, lossless)                                           |

## Enum handling

- **Applicant types (2.01.01):** `APPLICANT_TYPE_TO_COMMON` maps OMB
  `EligibleApplicantEntityTypeCode` values to CommonGrants applicant-type values.
  It is currently **empty** — every code passes through as
  `{ value: "custom", customValue: <code> }`, which preserves it for round-trip.
  Populate the table once the OMB entity-type domain values are crosswalked.

## Known follow-ups

- **Applicant-type lookup** is a stub (see above).
- **`src/custom-fields.ts` still cites stale mapping-sheet IC numbers** for
  `costSharing` / `assistanceListings` (see `crosswalk/README.md`); update to the
  reconciled numbers, and revisit the eligibility/geographic modeling per the six
  conceptual changes.
- The **L2 published JSON Schema** (`schemas/ic/`, `$ref`-preserving, split
  sub-models) and the property-based Zod⇔JSON-Schema equivalence suite now exist.
  Coverage tracks the T1 fields; expand as T2/T3 fields are modeled.
- **Cost-sharing `isRequired`** is a heuristic (`true` when a requirement type is
  present); the IC's `Formula/CostSharing/MOE` umbrella code (2.07.01) is not yet
  interpreted.
