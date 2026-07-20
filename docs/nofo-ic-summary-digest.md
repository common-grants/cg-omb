# NOFO IC summary doc — structured digest

Source: "Grants Standard Data Elements — Information Collection Specifications
Summary," Draft v3.0, December 18, 2025.
https://docs.google.com/document/d/1SZSemPS9ts35wLfmOQ2Y0ZJoqHHeJhrY6-h8voRSdU4/edit

This digest covers **Part 1: NOFO IC** only (the doc also contains Part 2, the
separate Assistance Listing IC, which is out of scope). Committed as a reference
snapshot to drive schema (Phase 2) and transform (Phase 3) design.

## Headline counts (NOFO IC)

| Metric               | Count |
| -------------------- | ----- |
| Total fields         | 205   |
| Required             | 90    |
| Optional             | 48    |
| Conditional          | 43    |
| Subsets              | 35    |
| (blank requiredness) | ~24   |

Six top-level sections (first digit of every item number = its section):

1. **Basic Information** (`1.xx`)
2. **Eligibility** (`2.xx`)
3. **Application Contents and Format** (`3.xx`)
4. **Submissions and Deadlines** (`4.xx`)
5. **Application Review** (`5.xx`)
6. **Post-Award Requirements and Administration** (`6.xx`)

Numbering hierarchy: Section → Subset → Item (e.g. `1.05.03`).

## Subset hierarchy (35 subsets), FO vs Project

**Section 1 — Basic Information:**

- **1.01 Key Facts (Funding Opportunity)** — ⚠️ this one table holds BOTH
  `1.01.01–1.01.09` (FO key facts) AND `1.10.01–1.10.07` (project basics: Name,
  Identifier, Description, Type, Focus Areas, Mission Subcategory). There is no
  standalone `1.10` subset heading. This is why the subset count is 35, not 36.
- **1.02 Primary Related Assistance Listing (FO)**
- **1.03 Other Related Assistance Listing(s) (FO)** — repeatable
- **1.04 Related NOFO(s) (FO)** — repeatable
- **1.05 NOFO Goals, Objectives, and Measures (FO)**
- **1.06 Authorizations (FO)**
- **1.07 Policies and Limitations (FO)**
- **1.08 NOFO Program Funding (FO)**
- **1.09 Funding Details (FO)**
- **1.11 Key Dates (Project)**
- **1.12 Project Goals, Objectives, and Measures (Project)**
- **1.13 Award Details (Project)**
- **1.14 PARK and TAS Funding Details (Project)** — repeatable

**Section 2 — Eligibility (all Project):** 2.01 Eligible Award Applicants ·
2.02 Applicants Description · 2.03 Eligible Beneficiaries · 2.04 Beneficiaries
Description · 2.05 Core-Based Statistical Areas (CBSAs) · 2.06 Other Eligibility
Criteria · 2.07 Cost Sharing and Maintenance of Effort (MOE) · 2.08 Use of
Assistance and Use Restrictions.

**Section 3:** 3.01 Application Components (Project) · 3.02 Application Format
(Project) · 3.03 Application Submission (FO).

**Section 4:** 4.01 Other Submissions (FO) — largest subset (23 items,
`4.01.01–4.01.23`), includes the paper-submission address block.

**Section 5:** 5.01 Selection Process (FO) · 5.02 Review Information (Project) ·
5.03 Review Criteria (Project, repeatable) · 5.04 Award Notices (Project).

**Section 6 — Post-Award (all Project):** 6.01 Award Terms and Conditions ·
6.02 Administrative and National Policy Requirements · 6.03 Payments ·
6.04 Financial and Performance Reporting · 6.05 Other Reports ·
6.06 Contact Information.

## Requiredness conventions

- **Required** (90), **Optional** (48), **Conditional** (43), **(blank)** (~24,
  "unspecified" — distinct from Optional).
- Blank clusters: Program-level Authorizations (`1.06.01–08`, `1.06.13–21`),
  assistance-listing "Title" companions (`1.02.02`, `1.03.02`, `1.08.02`),
  `1.09.08`, `1.10.02 Project Identifier`.
- Long-form conditional in 6.05, verbatim: **"Conditonal: Required if Other
  Report is identified"** (note source misspelling "Conditonal") on `6.05.04`,
  `6.05.06`. Transform/extract code should normalize the misspelling.

## Cardinality / repeatability

No explicit cardinality column — infer from ownership tag, plural/`(s)` naming,
and semantics. Repeating: 1.03, 1.04, 1.05/1.12 (GOM), 1.06 (authorizations),
1.14 (PARK/TAS lines), 2.01/2.03 type+attribute code lists, 2.08 use codes,
3.01/3.02 components, 5.03 criteria, 6.01/6.02/6.04/6.05/6.06 entries.
**Project-scoped subsets plausibly repeat per project** in a multi-project NOFO
— inferred, not stated; confirm with the data owner before modeling.

## Reusable component shapes (model once, share)

- **Goals-Objectives-Measures (GOM)** — identical 8-field shape at 1.05 (FO) and
  1.12 (Project): Goal Name/Desc, Objective Name/Desc, Measure Name/Desc, Measure
  Value–Prior FY (Optional), Measure Target Value (Required).
- **Authorizations (1.06)** — Act / Executive Order (both program-level 1.06.05–08
  and FO-level 1.06.09–12) / Public Law / Statute at Large / USC groups + 1.06.22
  Authorization URL.
- **Assistance-listing reference pair** — `{Identifier, Title}` at 1.02, 1.03,
  1.08.01/02, 1.14.01.
- **Agency address block** — `4.01.12–4.01.23`.
- **Reporting block** — 6.04 + 6.05 share `{Frequency, Description/Name,
Submission Method, Submission URL, Submission Instructions}`.
- **Submission-channel pattern** — `{Method, Email, URL, Instructions}` at 3.03
  and 4.01.02–05 (Notice of Intent).
- **Contact / POC block (6.06)** — Role Type (code), Title, Email, Domestic Phone.

## Type inference from prose

- **Coded/enum** ("A code that indicates…"): 1.09.01 Assistance Type, 2.01.01/02,
  2.03.01/02, 2.05.02 CBSA Type, 2.07.01/03, 2.08.01/03, 3.01.01, 3.02.01,
  3.03.02, 4.01.02, 5.02.01, 5.04.03, 6.01.01, 6.03.01/02, 6.04/6.05 report codes,
  6.06.01 POC Role Type, 1.10.06 Mission Subcategory.
- **Boolean/indicator** ("A value that indicates whether…"): 2.05.01/05 CBSA
  Indicators, 4.01.06 Intergovernmental Review (E.O. 12372), 4.01.08/09 paper.
- **Small explicit enum**: 4.01.01 Notice of Intent Requirement = required /
  optional / not applicable.
- **Numeric**: 1.09.04/1.13.04 #applications, 1.09.07/1.13.05 #awards, 5.03.03 max
  points. **Percentage**: 2.07.02, 5.03.04. **Currency**: 1.08.03, 1.09.06,
  1.09.08, 1.14.05. **Date/time**: 1.11 block (separate time fields 1.11.07,
  1.11.14). **Email/URL**: 3.03.03/04, 5.04.04, 6.04.04/09, 6.06.03.

## Custom-field-relevant definitions (verbatim highlights)

- **1.01.01 Administering Agency** (Required): "The code associated with the
  department or independent agency of the federal government as used in the
  Treasury Account Fund Symbol (TAFS)." (`1.01.02` Sub-Tier Required, `1.01.03`
  Primary Office Optional — both codes.)
- **1.02.01 Primary Assistance Listing Identifier** (Required): the CFDA-successor
  number for the predominant listing. **1.02.02 Title** (blank).
- **1.09.01 Funding Opportunity Assistance Type** (Required): "A code that
  indicates the form/legal instrument in which assistance is transmitted…"
  (Project mirror 1.13.01, same wording.) → maps to CG
  `federalFundingInstruments[].type`.
- **2.07.01 Cost Sharing Requirement Type** (Optional): "A code that indicates
  whether matching program funds is mandatory or voluntary…" → mapping normalizes
  to CG `costSharing.isRequired` (boolean). **2.07.02 Percentage** (Conditional).
  **2.07.04 Description** (Conditional).
- **2.01.01 Eligible Award Applicant Type** (Required, code) → CG core
  `acceptedApplicantTypes[].value`. **2.01.02 Attributes** (Optional).
- **2.03.01 Eligible Beneficiary Type** (Required, code) → CG custom
  `eligibilityCriteria.beneficiaryTypes[].code`. **2.03.02 Attribute** (Optional).
- **2.06.04 Other Eligibility Requirements** (Optional) → CG custom
  `eligibilityCriteria.details`.
- **POC (6.06, all under "Contact Information (Project)"):** 6.06.01 Role Type
  (Required, code) → `contactInfo.description`; 6.06.02 Title (Required) →
  `contactInfo.name`; 6.06.03 Email (Required) → `contactInfo.email`; 6.06.04
  Domestic Phone (Optional) → `contactInfo.phone`.

## Data-quality flags (for extract/transform)

- Several prose definitions are truncated mid-word in the source (clipped text,
  not clipped fields): 1.01.07, 1.09.01, 2.06.04.
- Misspellings to normalize: "Conditonal" (6.05), "exepmtion" (4.01.09/10),
  "descritpion" (2.07.05), "opporunity" (GOM), "assoicated"/"fuds" (1.14).
- Numbering gap: no standalone `1.10` subset heading (items live in the 1.01 Key
  Facts table).
