# Implementation Plan: `@common-grants/cg-omb` — OMB Data Standards Plugin

A CommonGrants TypeScript SDK plugin for the OMB grants data standards, centered on the
**Notice of Funding Opportunity (NOFO) Information Collection (IC)**. Modeled on
[`ts-grants-gov`](../ts-grants-gov/) for structure, CI/CD, and the transform architecture, and on
[`common-benefits/website`](../common-benefits/website/) for the (deferred) docs site.

---

## 1. Goals

1. Produce a **NOFO IC schema** (JSON Schema + Zod) composed from OMB's Standard Data Elements (SDEs).
2. Provide **`toCommon` / `fromCommon`** transforms mapping the NOFO IC ↔ CommonGrants core, per the
   data-mapping spreadsheet.
3. Set up **CI checks, release-please, and CD publishing** to npm under `@common-grants`.
4. (Deferred, phase 2) A **docs website** mirroring `common-benefits/website` for navigable SDE + NOFO IC docs.

## 2. Inputs and what each provides

| Source                                                                                                                                                | Role                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data-mapping spreadsheet, tab 1** ([link](https://docs.google.com/spreadsheets/d/1DVJ9UyTgfYiun_gAd1XB4ltzzWn18dxwjUOH7OPPogo/edit?gid=1514425555)) | Crosswalk: CommonGrants field (`cg-core` / `cg-custom`) ↔ SGG API field ↔ **NOFO IC Item No.** Drives the transforms + `customFields`.                                                                                      |
| **NOFO IC summary doc** ([link](https://docs.google.com/document/d/1SZSemPS9ts35wLfmOQ2Y0ZJoqHHeJhrY6-h8voRSdU4/edit))                                | Human description of the IC hierarchy: sections 1–6, 35 subsets, ~205 items, requiredness, FO-vs-Project ownership.                                                                                                         |
| **Working-group workbook** (`grants-standard-data-elements_v3-0_2026-6-17.xlsx`)                                                                      | 16 tabs. **`(SDE) Data Element List`** = all SDEs w/ data type, format, length, domain values. **`(IC) NOFO`** = the authoritative crosswalk mapping each IC item → SDE label(s) + requiredness + cardinality instructions. |
| **SDE JSON Schemas** (`SDE JSON Schemas 02-20-2026/`, 457 files)                                                                                      | The atomic field definitions OMB maintains directly (JSON Schema draft 2020-12, with `oneOf`/`const` enums, length/pattern constraints, and `x-*` provenance metadata).                                                     |

### The key structural fact

The `(IC) NOFO` tab is a **crosswalk**: each IC item (`1.01.01`, `2.07.01`, …) names the SDE label(s) it is
built from (column J), each of which corresponds to a JSON schema file. So:

- **SDEs** are atomic leaves — **OMB owns these as JSON Schema** (changes land here first).
- **NOFO IC** is an arrangement of a _subset_ of SDEs into a nested hierarchy — **we own this**.
- **The plugin** maps NOFO IC ↔ CommonGrants — **we own this**.

### NOFO IC hierarchy (from the summary doc + `(IC) NOFO` tab)

Each subset heading is tagged `(Funding Opportunity)` or `(Project)` — this tag defines the object nesting:

```
FundingOpportunity                       # subsets tagged (Funding Opportunity)
├─ 1.01 Key Facts                        # FO identity/title/description (1.01.01–1.01.09)
├─ 1.02 Primary Related Assistance Listing (1-to-1 ref)
├─ 1.03 Other Related Assistance Listing(s)  (repeatable)
├─ 1.04 Related NOFO(s)                   (repeatable)
├─ 1.05 Goals, Objectives, Measures       (repeatable triple — see below)
├─ 1.06 Authorizations                    (Act / EO / PublicLaw / Statute / USC groups; 22 items)
├─ 1.07 Policies and Limitations
├─ 1.08 NOFO Program Funding
├─ 1.09 Funding Details
├─ 3.03 Application Submission
├─ 4.01 Other Submissions                 (incl. paper-submission address block 4.01.12–4.01.23)
├─ 5.01 Selection Process
└─ projects[]                            # subsets tagged (Project) — repeatable
   ├─ 1.10 Key Facts (Project name/type/focus areas/mission)
   ├─ 1.11 Key Dates
   ├─ 1.12 Goals, Objectives, Measures    (same shape as 1.05)
   ├─ 1.13 Award Details
   ├─ 1.14 PARK/TAS Funding lines         (repeatable)
   ├─ 2.01–2.08 Eligibility               (applicants, beneficiaries, CBSAs, cost-share, use)
   ├─ 3.01 Application Components / 3.02 Format
   ├─ 5.02 Review / 5.03 Review Criteria[] / 5.04 Award Notices
   └─ 6.01–6.06 Post-Award                (terms, policy reqs, payments, reports[], contacts[])
```

Reusable nested components to model once and share: **GoalsObjectivesMeasures** (appears at 1.05 and 1.12
with identical shape), **Authorizations** (1.06), **Address block** (4.01.12–23), **Reporting block**
(6.04/6.05), **ContactInfo/POC** (6.06).

Type inference conventions (the doc has no explicit type column; infer from the definition opener):
"A code that indicates…" → enum; "A value that indicates whether…" → boolean; "A numeric value…" → integer;
"dollar amount" → money; "percentage" → number; "The date…" → date (time is a _separate_ `- Time` field);
"URL"/"email" → string formats; "A title/name" → short text; "A description/summary" → long text.
Requiredness column: `Required` / `Optional` / `Conditional` / blank(≈optional).

---

## 3. Architecture decision

**Decision:** Treat OMB's SDE JSON as vendored upstream truth. Compose the NOFO IC **as a JSON Schema that
`$ref`s the SDE files** (the published artifact — L2). **Hand-write the matching Zod** (the `ts-grants-gov`
pattern) and rely on the **property-based test suite to enforce equivalence** between the hand-written Zod and
the JSON Schema. **Auto-generating Zod is an explicit later optimization**, not a day-one dependency. **Defer
TypeSpec.**

> **Two decisions that shaped this (both settled):**
>
> 1. _Direction_ — an even earlier draft made Zod the source and _emitted_ JSON via `zod-to-json-schema`; that
>    produces a self-contained schema that inlines fields and **loses the `$ref`s to the SDE files** + OMB's
>    `x-*` metadata. The published IC schema **must reference the original SDEs**, so JSON Schema (with `$ref`s)
>    is the authored artifact.
> 2. _How Zod is produced_ — we will **not** auto-derive Zod initially. `json-schema-to-zod` (the obvious
>    converter) is **third-party and not actively maintained**; the native `z.fromJSONSchema()` was **added in
>    Zod 4** and is **experimental**, while the SDK currently pins `zod@^3.25.76` (v3 API — the installed
>    `3.25.76` has `z.toJSONSchema` but **no** `z.fromJSONSchema`). Rather than take a maintenance risk or force a
>    Zod-4 override against the SDK's peer range, we **hand-write Zod now** and revisit auto-generation once the
>    SDK moves to Zod 4 (planned) — at which point native `z.fromJSONSchema()` becomes the natural path. See §3.3.

This answers the reservations _and_ the SDE-reference requirement:

- **Sync burden:** SDEs are never re-authored — OMB's JSON is vendored verbatim (keeping `x-*` metadata and their
  exact enum style), and the IC schema points at those files by `$ref`. Updating = drop in new files; refs
  re-resolve. No translation, no round-trip loss.
- **SDE references preserved:** the published IC schema keeps `$ref`s into the SDE definitions (see §3.2), so it
  is a genuine composition of OMB's SDEs, not a copy.
- **Overhead / edge cases:** only the ~100–150 SDEs the IC references are vendored (and only the T1/T2 subset
  first, §3.1), not all 457. No fragile converter in the toolchain. The SDK needs Zod anyway (`customFields`
  values are `z.ZodTypeAny`); hand-written Zod satisfies that with zero version risk.

**Layered model:**

| Layer                                  | Ownership      | Location                                                                                                                                        | How kept current                             |
| -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **L0 SDE JSON**                        | OMB (upstream) | `schemas/sde/*.schema.json` (**prioritized** subset — see §3.1, vendored verbatim)                                                              | Manual drop-in on OMB release                |
| **L2 NOFO IC JSON Schema** (published) | Us             | `src/nofo-ic/` (TS builder emitting `$ref` JSON) → `schemas/nofo-ic/nofo-ic.schema.json` (with `$ref`s to SDEs) + `nofo-ic.bundled.schema.json` | `pnpm gen:jsonschema`                        |
| **L1 Zod + types** (hand-written)      | Us             | `src/schemas/` (SDE-level + component + `NofoIcSchema`), `z.infer` types                                                                        | Hand-written; **property tests assert ≡ L2** |
| **L3 Plugin**                          | Us             | `src/index.ts`, `src/transforms.ts`                                                                                                             | Hand-authored                                |

L2 (JSON Schema) and L1 (Zod) are **two hand-authored artifacts kept in agreement by the property-based suite**
(§3.3). This is the same posture as `ts-grants-gov` (hand-written Zod), plus a `$ref`-preserving JSON Schema and
an equivalence gate.

**Why not the alternatives (now):**

- _SDEs in TypeSpec_ → reintroduces the fork/sync problem (rejected per reservation 1).
- _Zod-first, emit JSON_ → **loses `$ref`s to the SDEs**; rejected.
- _Auto-derive Zod (`json-schema-to-zod` / `z.fromJSONSchema`)_ → unmaintained dep / experimental Zod-4 API vs
  SDK's `zod@^3.25.76` peer. **Deferred**, not rejected — see §3.3.
- _typespec-zod now_ → preview; can't `$ref` external OMB SDE JSON. Keep in reserve.

### 3.2 How SDE references are preserved (L2 pipeline)

```
schemas/sde/*.schema.json                 # L0 vendored, $id: "<Name>.schema.json"
        │  referenced by $ref
        ▼
src/nofo-ic/*.ts  (TS builder)            # emits ↓  — type-safe composition, output is plain JSON Schema
        ▼
schemas/nofo-ic/nofo-ic.schema.json       # PUBLISHED artifact — { "$ref": "../sde/FundingOpportunityIdentifier.schema.json" }
        │  @apidevtools/json-schema-ref-parser
        └── .bundle()  ─────────────────►  nofo-ic.bundled.schema.json   # self-contained; $ref → "#/$defs/<Sde>", SDE content verbatim

src/schemas/*.ts   (HAND-WRITTEN Zod)     # authored to match the JSON Schema above; NOT generated
        ▲
        └── property tests (§3.3) validate this Zod ≡ nofo-ic.bundled.schema.json across fuzzed samples
```

- **Published for interop/docs:** both the `$ref`-preserving `nofo-ic.schema.json` (references SDE files) and the
  self-contained `nofo-ic.bundled.schema.json` (refs internalized to `#/$defs`, SDE bodies preserved verbatim
  incl. `x-*`). Consumers pick per their resolver support.
- **Runtime:** hand-written Zod for the SDK/transforms; TS types via `z.infer`.
- The TS builder gives compile-time-checked composition (typed helpers for `$ref`, arrays, required/optional,
  reusable component sub-objects) while its _output_ stays a `$ref`-preserving JSON Schema — resolving the
  earlier "raw JSON is error-prone" concern without abandoning refs.

### 3.3 Zod: hand-written now, auto-generated later

The JSON Schema (L2) and the Zod (L1) are **two hand-authored representations of the same shapes**. They are kept
in lock-step by the property-based equivalence suite (ported from
[`simpler-grants-protocol`](../simpler-grants-protocol/lib/ts-sdk/__tests__/)): `json-schema-faker` generates N
seeded samples from `nofo-ic.bundled.schema.json`, each is validated by **AJV** (against the JSON Schema) and by
the **hand-written Zod**, and any disagreement fails CI (`expectZodMatchesJsonSchema`). This makes divergence a
loud test failure rather than a silent drift, and is the safety net that makes hand-writing acceptable.

**Deferred optimization — auto-generation.** Once the CommonGrants SDK moves to **Zod 4** (planned by the
maintainers), replace the hand-written Zod with **native `z.fromJSONSchema(bundled)`** (experimental, but a
build-time step guarded by the same equivalence suite). At that point the plugin's `zod` override moves from
`3.25.76` to a Zod-4 line in tandem with the SDK. Until then, do **not** override to Zod 4 unilaterally: the SDK
0.5.0 is built against the v3 API (`import … from "zod"`), so forcing Zod 4 under its `^3.25.76` peer risks
v3/v4 class-identity mismatches on the schemas passed into `definePlugin`.

### 3.1 Scope & prioritization

We do **not** need to implement every SDE the NOFO IC references on day one. The mapping spreadsheet (tab 1)
prioritizes by relevance to CommonGrants / the SGG API via its `Source` column, giving three tiers. We build
outward from the CG-relevant core:

| Tier         | Mapping `Source`             | What it is                                                        | When                                                   |
| ------------ | ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| **T1 (MVP)** | `cg-core` + `cg-custom`      | IC items that map to a CommonGrants core field or a `customField` | Phase 2–3 — required for the transforms; highest value |
| **T2**       | `sgg-only` (with an IC item) | Fields the SGG API carries but CommonGrants doesn't               | Phase 2–3, after T1                                    |
| **T3**       | `ic-only`                    | IC items with no CG/SGG counterpart (full-standard coverage)      | Incremental, post-MVP                                  |

So the L0 SDE subset to vendor and the `$ref`s in the L2 IC schema are **scoped to T1 (+T2)** first; the
FO/Project schema is authored as the full hierarchical skeleton but **populated tier-by-tier**, leaving T3 fields
as documented-but-unimplemented placeholders until needed. Because Zod is derived from the IC schema (§3.2), the
generated-Zod surface and the property-based test matrix automatically track this subset — directly answering
"not every SDE is needed for the NOFO IC (yet)."

---

## 4. Repository structure

```
ts-plugin-omb/
├── schemas/
│   ├── sde/                       # L0: vendored OMB SDE JSON (subset), verbatim
│   │   └── *.schema.json
│   └── nofo-ic/                   # L2 published artifacts
│       ├── nofo-ic.schema.json    #   source: $refs INTO ../sde/*.schema.json
│       └── nofo-ic.bundled.schema.json  # self-contained: $ref → #/$defs/<Sde>, SDE bodies verbatim
├── crosswalk/
│   ├── ic-nofo.json               # extracted (IC) NOFO tab: items → SDE labels, requiredness, cardinality
│   └── cg-mapping.json            # extracted mapping tab 1: CG field ↔ SGG ↔ IC item
├── scripts/
│   ├── extract-workbook.ts        # xlsx → crosswalk/*.json (repeatable ingestion)
│   └── gen-jsonschema.ts          # L2 TS builder → schemas/nofo-ic/*.json (+ bundle via ref-parser)
├── src/
│   ├── nofo-ic/                   # L2 JSON Schema builder (emits $ref JSON, one output)
│   │   ├── components/            #   shared sub-objects (goals-objectives-measures, authorizations, address, reporting, contact)
│   │   ├── funding-opportunity.ts
│   │   ├── project.ts
│   │   └── index.ts               #   builds NofoIc JSON Schema
│   ├── schemas/                   # L1 HAND-WRITTEN Zod (SDE-level + components + NofoIcSchema) + z.infer types
│   │   └── index.ts
│   ├── transforms.ts              # L3: toCommon / fromCommon + lookup tables
│   ├── custom-fields.ts           # L3: customFields value schemas (Zod)
│   └── index.ts                   # L3: definePlugin() wiring + public exports
├── __tests__/
│   ├── schemas/                   # property-based Zod⇔JSON-Schema equivalence specs (per layer)
│   ├── utils/
│   │   ├── fuzz-test.ts           # json-schema-faker + ajv sample-and-compare (ported)
│   │   └── ajv-validator.ts
│   ├── helper.ts                  # expectZodMatchesJsonSchema()
│   └── transforms.spec.ts         # toCommon/fromCommon round-trip tests
├── examples/
│   └── parse-nofo-ic.ts
├── website/                       # phase 2 (deferred)
├── package.json  tsconfig.json  vitest.config.ts  eslint.config.mjs  .prettierrc
├── release-please-config.json  .release-please-manifest.json
├── .github/{workflows,ISSUE_TEMPLATE,pull_request_template.md}
├── README.md  DEVELOPMENT.md  CONTRIBUTING.md  TRANSFORMS.md
└── IMPLEMENTATION_PLAN.md
```

---

## 5. Phased plan

### Phase 0 — Scaffolding (½ day)

Copy the proven skeleton from `ts-grants-gov`, adapting names:

- `package.json` → name `@common-grants/cg-omb`; keep peer dep `@common-grants/sdk@^0.5.0`, `zod` override
  `3.25.76` (**unchanged** — no Zod-4 bump; §3.3), and the script set (`build`, `lint`, `checks`, `test`, `ci`).
  Add `gen:crosswalk`, `gen:jsonschema` scripts. Add dev deps: `@apidevtools/json-schema-ref-parser` (bundle),
  `json-schema-faker` + `ajv` + `ajv-formats` (property-based suite). Note: **no `zod-to-json-schema`** (JSON is
  authored, not emitted from Zod) and **no `json-schema-to-zod`** (Zod is hand-written now; §3.3).
- Copy `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`.
- Copy `.github/` (three workflows: `ci.yml`, `cd-release.yml`, `cd-publish.yml`), `release-please-config.json`
  (release-type `node`, `bump-minor-pre-major: true`), `.release-please-manifest.json` (`{".": "0.0.0"}`),
  issue/PR templates.
- `pnpm install`; confirm `pnpm run ci` is green on an empty `src`.

### Phase 1 — SDE ingestion pipeline (1–2 days)

1. `scripts/extract-workbook.ts` — parse the `.xlsx` (stdlib-style unzip+XML, or a dev-only xlsx lib) into
   `crosswalk/ic-nofo.json` (IC item → `{ subset, level (FO/Project), name, required, cardinality instruction,
sdeLabels[] }`) and `crosswalk/cg-mapping.json` (from Drive tab 1). Commit these JSON artifacts so the build
   doesn't depend on the spreadsheets.
2. Compute the **prioritized SDE subset** (§3.1): join `crosswalk/ic-nofo.json` (item → SDE labels) with
   `crosswalk/cg-mapping.json` (item → `Source` tier). Take **T1 (+T2)** items first; collect their SDE labels;
   copy just those `*.schema.json` files into `schemas/sde/`. Emit a coverage report (items/SDEs per tier,
   implemented vs deferred). **Flag mismatches**: `(IC) NOFO` labels (e.g. `AwardingAgencyCode`,
   `AwardingSubTierAgencyName`) may not match a JSON filename 1:1 — build and review a label→file map, and list
   unresolved labels.
3. Sanity-check the vendored SDE files load under AJV (draft 2020-12) and that their `$id`s are stable, since the
   L2 IC schema will `$ref` them. (No Zod here — it's hand-written in Phase 2; §3.3.)

### Phase 2 — NOFO IC JSON Schema + hand-written Zod (4–6 days)

1. **JSON Schema (L2).** Build the TS composition helpers (`ref(sde)`, `arrayOf`, `required`/`optional`,
   `component(...)`) that emit plain JSON Schema objects with `$ref`s into `schemas/sde/`. Model the shared
   components under `src/nofo-ic/components/`: `GoalsObjectivesMeasures`, `Authorizations`, `AddressBlock`,
   `ReportingBlock`, `ContactInfo` (each a reusable `$defs` entry — referenced, not duplicated).
2. Compose `FundingOpportunity` and `Project` (`projects[]`), following `crosswalk/ic-nofo.json` for field
   membership, requiredness (Required→`required[]`, Optional/blank→omit, Conditional→omit + documented rule),
   and cardinality (plural/`(s)` → `type: array`; subset-level repeats → arrays of component objects). Author the
   **full hierarchical skeleton**, but **populate T1(+T2) fields first** (§3.1); leave T3 `ic-only` fields as
   documented placeholders (`x-tier: 3` + `TODO`) until prioritized.
3. `scripts/gen-jsonschema.ts` — run the builder → write `schemas/nofo-ic/nofo-ic.schema.json` (with SDE `$ref`s),
   then `@apidevtools/json-schema-ref-parser` `.bundle()` → `nofo-ic.bundled.schema.json`. CI drift check.
4. **Zod (L1), hand-written (§3.3).** In `src/schemas/`, author Zod mirroring the JSON Schema: SDE-level leaf
   schemas (with matching constraints / `z.enum` for `oneOf`+`const`), the shared components as reusable Zod
   objects, and the top-level `NofoIcSchema`; export `NofoIc = z.infer<typeof NofoIcSchema>`. Structured the same
   way as the builder so the correspondence is obvious. (Same T1→T2→T3 population order.)
5. Tests: (a) parse a hand-built representative NOFO IC fixture; assert nesting, required fields, enum handling;
   (b) **property-based equivalence** — `expectZodMatchesJsonSchema(NofoIcSchema, "nofo-ic.bundled.schema.json")`
   plus per-component specs, so the hand-written Zod and the published JSON Schema are provably in agreement
   across `json-schema-faker` samples (this is the drift gate that makes hand-writing safe, §3.3 / risk 3);
   (c) assert `nofo-ic.schema.json` still contains `$ref`s resolving to `schemas/sde/*` (guards against
   accidental inlining).

### Phase 3 — Plugin transforms (3–5 days)

Follow `ts-grants-gov`'s `TRANSFORMS.md` contract exactly.

1. `src/custom-fields.ts` — Zod value schemas for the `customFields` the mapping requires (agency,
   assistanceListings, contactInfo, costSharing, eligibilityCriteria, federalFundingInstruments,
   federalOpportunityNumber, plus IC-only fields worth surfacing), reusing L1 Zod pieces from `src/schemas/`.
2. `src/transforms.ts` — `toCommon(nofoIc: NofoIc): TransformResult<...>` and `fromCommon(common): TransformResult<NofoIc>`,
   driven by `crosswalk/cg-mapping.json`:
   - `cg-core` rows → CommonGrants core fields (id, title, description, status, funding, keyDates,
     acceptedApplicantTypes, timestamps).
   - `cg-custom` rows → `customFields`.
   - `ic-only` rows → preserved as `customFields` (for round-trip) or documented as IC-only.
   - Lookup tables for status / applicant-type / funding-instrument enums, with `"custom"` fallbacks.
   - Never throw; accumulate `TransformError`s.
3. `src/index.ts` — `definePlugin({ meta: { name: "omb", sourceSystem: "OMB NOFO IC", capabilities:
["customFields","transforms"] }, schemas: { Opportunity: { customFields, sourceSchema: NofoIcSchema,
toCommon, fromCommon }}})`.
4. `examples/parse-nofo-ic.ts` + `__tests__/transforms.spec.ts` (schema parse, `toCommon`→`fromCommon`
   round-trip preservation, error accumulation on bad input).
5. Author `TRANSFORMS.md` with the full IC→CG mapping table.

### Phase 4 — CI/CD & release (½ day, overlaps)

- Verify `ci.yml` matrix (Node 22 & 24) runs `pnpm run ci` including `gen:jsonschema --check` (JSON Schema drift)
  and the property-based equivalence suite (hand-written Zod ≡ JSON Schema).
- `cd-release.yml` (release-please on `main`) → `cd-publish.yml` (`pnpm publish --provenance --access public`),
  `NPM_TOKEN` scoped to `@common-grants`, `npm` environment approval gate.
- Repo settings: squash-merge with PR-title default; conventional-commit PR-title lint.
- First release cuts `0.1.0`.

### Phase 5 — Docs website (deferred)

Mirror `common-benefits/website`: Starlight-on-Astro on a Cloudflare Worker (`ASSETS` binding). Since the docs
renderer consumes **JSON Schema** (YAML) and only shows TypeSpec in an optional tab, feed it `schemas/sde/` +
`schemas/nofo-ic/nofo-ic.schema.json` directly — no TypeSpec required. Reuse the catalog → `SchemaTable` +
`SchemaFormatTabs` pattern; the SDE `x-*` metadata (definitions, data groups, references) makes rich doc pages.

---

## 6. Risks & open questions

1. **SDE label ↔ filename matching.** `(IC) NOFO` SDE labels may not map 1:1 to the 457 JSON filenames; some IC
   items compose multiple SDEs (Code/Name pairs). _Mitigation:_ build and review an explicit label→file map in
   phase 1; surface unresolved labels for manual decision.
2. **IC-only items with no SDE JSON.** Some IC items may lack a corresponding published SDE schema. _Mitigation:_
   author minimal **inline JSON Schema** for those (in the IC composition), flagged `x-source: ic-only`; hand-write
   the matching Zod like everything else.
3. **Hand-written Zod drifting from the JSON Schema** (esp. draft-2020-12 `oneOf`/`const` enums, patterns,
   lengths). _Mitigation:_ the property-based `expectZodMatchesJsonSchema` fuzz suite (phase 2, ported from
   `simpler-grants-protocol`) is the gate — it fails CI loudly on any Zod⇔JSON divergence, which is what makes
   hand-writing (and later auto-generation) safe. This risk retires when auto-generation lands (§3.3).
4. **`$ref` portability.** File-`$ref`s (`nofo-ic.schema.json`) need the SDE files or a resolver present;
   `$defs`-refs (`nofo-ic.bundled.schema.json`) are self-contained. _Mitigation:_ publish both; document which to
   use. Also confirm downstream (docs site, AJV, faker) resolve the chosen form.
5. **Conditional requiredness** is prose in the doc/tab. _Mitigation:_ model as optional for now; capture the
   rule in a `description` / doc; consider `superRefine` later.
6. **Spreadsheet drift.** The Google spreadsheet is live and may change. _Mitigation:_ commit extracted
   `crosswalk/*.json`; re-run `gen:crosswalk` deliberately, review diffs.
7. **CommonGrants side of ic-only fields.** Decide whether unmapped IC fields ride along as `customFields`
   (enables lossless round-trip) or are IC-schema-only. _Recommendation:_ surface as `customFields` for round-trip.

## 7. Suggested sequencing

Phase 0 → 1 → 2 → 3, with Phase 4 folded in as soon as there's publishable output. Phase 5 after 0.1.0 ships.
Estimated ~2 weeks of focused work to a first published `0.1.0` (schemas + transforms + CI/CD), website following.
