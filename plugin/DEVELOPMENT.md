# Development

## Prerequisites

- Node.js 22 or 24
- [pnpm](https://pnpm.io) 10+

## Setup

```bash
pnpm install
```

## Scripts

| Script                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `pnpm run build`         | Compile TypeScript to `dist/`                             |
| `pnpm run checks`        | Lint, format check, and typecheck                         |
| `pnpm run test`          | Run the test suite (Vitest)                               |
| `pnpm run test:coverage` | Run tests with coverage                                   |
| `pnpm run ci`            | `checks` + `build` + `test` + `pnpm audit` (what CI runs) |
| `pnpm run example:parse` | Run the example NOFO IC parse script                      |

## Repository layout

This package lives in `plugin/` within a small monorepo:

```
plugin/                      # this package
  src/                       # L1 Zod + types, L3 plugin (transforms, custom fields)
  src/__tests__/             # unit + property-based equivalence specs
  examples/                  # runnable usage examples
schemas/                     # published JSON Schema (referenced by consumers and the site)
  sde/                       # L0: OMB SDE JSON (subset), verbatim
  ic/                        # L2: NOFO IC schema (root + split sub-models)
website/                     # documentation site for the SDE and NOFO IC schemas
docs/                        # field mapping and discrepancy notes across the systems
```

> **Note:** the raw upstream SDE JSON Schemas are staged locally under
> `json-schemas/` (gitignored); a prioritized subset is copied into
> `schemas/sde/`.

## Source inputs

The schema and transforms are derived from three OMB sources (see
`OMB-implementation-plan.md` §2):

1. The OMB ↔ CommonGrants **data-mapping spreadsheet**.
2. The **NOFO IC summary doc**.
3. The **working-group workbook** (`grants-standard-data-elements_v3-0_*.xlsx`)
   and its companion **SDE JSON Schemas**.

The schema and transforms are derived from these sources by hand, so the build
does not depend on the live spreadsheets.
