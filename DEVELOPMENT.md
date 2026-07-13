# Development

## Prerequisites

- Node.js 22 or 24
- [pnpm](https://pnpm.io) 10+

## Setup

```bash
pnpm install
```

## Scripts

| Script                    | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `pnpm run build`          | Compile TypeScript to `dist/`                                |
| `pnpm run checks`         | Lint, format check, and typecheck                            |
| `pnpm run test`           | Run the test suite (Vitest)                                  |
| `pnpm run test:coverage`  | Run tests with coverage                                      |
| `pnpm run ci`             | `checks` + `build` + `test` + `pnpm audit` (what CI runs)    |
| `pnpm run gen:crosswalk`  | Extract the OMB workbook → `crosswalk/*.json` (Phase 1)      |
| `pnpm run gen:jsonschema` | Build the NOFO IC JSON Schema → `schemas/nofo-ic/` (Phase 2) |
| `pnpm run example:parse`  | Run the example NOFO IC parse script                         |

## Repository layout

```
schemas/
  sde/                       # L0: vendored OMB SDE JSON (subset), verbatim
  nofo-ic/                   # L2: published NOFO IC JSON Schema (+ bundled)
crosswalk/                   # extracted crosswalk JSON (committed artifacts)
scripts/                     # ingestion + generation scripts
src/                         # L1 Zod + types, L3 plugin (transforms, custom fields)
__tests__/ (src/__tests__)   # unit + property-based equivalence specs
examples/                    # runnable usage examples
```

> **Note:** the raw upstream SDE JSON Schemas are currently staged under
> `json-schemas/sde/`. Phase 1 selects the prioritized subset and vendors it
> into `schemas/sde/`.

## Source inputs

The schema and transforms are derived from three OMB sources (see
`OMB-implementation-plan.md` §2):

1. The OMB ↔ CommonGrants **data-mapping spreadsheet**.
2. The **NOFO IC summary doc**.
3. The **working-group workbook** (`grants-standard-data-elements_v3-0_*.xlsx`)
   and its companion **SDE JSON Schemas**.

Extracted artifacts are committed under `crosswalk/` so the build does not
depend on the live spreadsheets.
