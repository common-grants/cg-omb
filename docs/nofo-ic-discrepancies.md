# NOFO IC compared with SGG and CommonGrants: major discrepancies

Scope: the Opportunity entity. This document covers only the discrepancies that
a deterministic translator cannot resolve on its own: differences in structure
and cardinality, enum mappings that lose information, and concepts that exist in
one system but not another. The field-by-field correspondences are in
`opportunity-mapping.csv`.

Sources: the current NOFO IC is the `(IC) NOFO` tab of the v3.0 workbook. SGG is
the Simpler Grants API `v0` (`OpportunityV1` and `OpportunitySummaryV1`).
CommonGrants is the SDK's `Opportunity` model plus the custom fields this plugin
defines.

## 1. Structure and cardinality

The NOFO IC describes one funding opportunity that contains a repeatable list of
projects. SGG and CommonGrants both describe a single, flat opportunity with no
project layer. This is the most significant difference between the systems, and
it is the reason several mappings cannot be made deterministic.

- A NOFO with more than one project has no faithful single-opportunity
  representation. When each project has its own dates, eligibility, and funding
  limits, a translator has to choose one project or merge several, and no rule
  makes that choice correct. Going the other direction, an opportunity can only
  ever produce a single project.
- Several concepts are defined at the project level in the NOFO IC but at the
  opportunity level in SGG and CommonGrants: key dates (subset 1.11),
  eligibility (subsets 2.01 through 2.08), cost sharing (2.07), points of
  contact (6.06), and award details (1.13). A translator has to select one
  project to read these from; this plugin reads the first. We suggest the data
  standards team decide whether projects with different eligibility and funding
  belong under a single opportunity or should be modeled as separate
  opportunities, because that decision determines how this mapping should
  behave.
- Award counts and amounts sit at different levels. SGG reports
  `expected_number_of_awards`, `estimated_total_program_funding`, and
  `award_floor` / `award_ceiling` on the opportunity. The NOFO IC keeps an
  opportunity-level anticipated amount (1.09.05) but moved the award count down
  to the project level (1.13). An opportunity-level count and a per-project
  count cannot be reconciled without a rule for aggregating or selecting
  projects.
- The NOFO IC no longer distinguishes a primary assistance listing. It now uses
  a single repeatable "Related Assistance Listing(s)" item (1.02.01). SGG
  (`opportunity_assistance_listings`) and CommonGrants (`assistanceListings`)
  both use a flat list with no primary flag, so there is no way to record or
  recover which listing is predominant.

## 2. Enum mappings that lose information

### Applicant and beneficiary types

This is the largest source of information loss. The NOFO IC defines 73 detailed
codes for eligible applicant types and another 73 for eligible beneficiary
types. SGG offers 17 broad categories in `applicant_types`, and CommonGrants
offers about 15 in `acceptedApplicantTypes`. Translating from the NOFO IC to SGG
or CommonGrants forces many detailed codes into a single broad category, and
some IC codes have no broad equivalent, so they fall back to `other` or
`custom`. Translating in the other direction is ambiguous, because one broad
category corresponds to several IC codes and nothing indicates which one to use.
SGG also has no concept of a beneficiary, so beneficiary types cannot be
represented in SGG at all; CommonGrants can only hold them in a custom field.

### Assistance type and funding instrument

The NOFO IC `AssistanceTypeCode` has 17 values covering grants, cooperative
agreements, direct loans, loan guarantees, insurance, direct payments, sale or
donation of property, and several non-financial forms of assistance. SGG
`funding_instruments` has four: grant, cooperative agreement, procurement
contract, and other. Only grant and cooperative agreement have a clean
equivalent, so the remaining thirteen IC values all reduce to `other`. In the
other direction, `procurement_contract` has no IC equivalent, because the NOFO
IC describes financial assistance rather than procurement.

### Status

The NOFO IC has no opportunity status field, so status exists only in SGG and
CommonGrants. A translator producing a NOFO IC record has to default or omit the
status, because nothing in the IC implies it. Between SGG and CommonGrants,
`posted` and `open` are the same concept under different names, but SGG
`archived` maps to CommonGrants `closed` and loses the distinction, which the
reverse mapping cannot restore.

### Cost sharing

The NOFO IC represents cost sharing with two codes and supporting text: a
requirement code that distinguishes formula, cost sharing, and maintenance of
effort (`AgencyFormulaCostSharingMOERequirementCode`); a cost sharing type that
distinguishes mandatory, voluntary, determined at the NOFO level, and mandatory
with exceptions (`AgencyCostSharingCode`); plus a percentage and a description.
SGG and CommonGrants reduce all of this to a single boolean, `is_cost_sharing`.
Collapsing the codes into a boolean loses both distinctions, and a boolean
cannot reconstruct the codes.

### Opportunity category and funding categories

SGG has a `category` field with five values and a `funding_categories` field
with 28 topical values. The NOFO IC has no equivalent for either, so both are
specific to SGG and cannot populate a NOFO IC record.

## 3. Concepts present in only one system

- Required by CommonGrants but absent from the NOFO IC: `id`, `status`,
  `createdAt`, and `lastModifiedAt`. A translator can derive `id` deterministically
  from the Funding Opportunity Number (as a version 5 UUID), but it cannot derive
  status or the timestamps.
- Present in SGG but absent from the NOFO IC: `legacy_opportunity_id`,
  `version_number`, `is_forecast`, `category`, `funding_categories`, and the
  free-text `agency` field.
- Present in the NOFO IC but absent from SGG and CommonGrants: authorizations
  (subsets 1.05 and 1.06), geographic eligibility (2.05), application components
  and format (section 3), notice of intent and paper submission (section 4),
  selection and review criteria (section 5), the post-award terms, policy,
  payments, and reporting (section 6), and PARK/TAS funding lines (1.14).
  CommonGrants can only hold these as custom fields, with no shared meaning
  across systems.

## 4. Representation differences to check

These are deterministic, but they are easy to get wrong.

- The NOFO IC represents amounts, fiscal year, and the cost sharing percentage
  as strings. SGG uses integers, and CommonGrants represents money as an amount
  string with a currency. The conversions are deterministic, but a free-text
  amount in the NOFO IC will not always parse to an integer.
- Two NOFO IC code lists, `EligibleApplicantEntityTypeCode` and
  `EligibleBeneficiaryEntityTypeCode`, contain an internal inconsistency: the
  declared length and pattern require six characters, but every code is seven.
  We corrected this in our local copies and suggest fixing it at the source. It
  is a data quality problem rather than a mapping difference, but it prevents
  validation until it is resolved.
