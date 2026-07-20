# @common-grants/cg-omb

A [CommonGrants](https://commongrants.org) TypeScript SDK plugin for the **OMB
grants data standards**, centered on the **Notice of Funding Opportunity (NOFO)
Information Collection (IC)**.

> **Status: early scaffolding.** The published schema, custom fields, and
> transforms are under active development. See
> [`OMB-implementation-plan.md`](./OMB-implementation-plan.md) for the roadmap.

## What this package provides (planned)

- A **NOFO IC JSON Schema** composed from OMB's Standard Data Elements (SDEs),
  preserving `$ref`s into the upstream SDE definitions.
- Hand-written **Zod schemas + TypeScript types** kept in lock-step with the
  JSON Schema by a property-based equivalence test suite.
- **`toCommon` / `fromCommon`** transforms mapping the NOFO IC ↔ CommonGrants
  core, driven by the OMB ↔ CommonGrants data-mapping crosswalk.

## Layers

| Layer                               | Ownership    | Location                            |
| ----------------------------------- | ------------ | ----------------------------------- |
| SDE JSON (upstream truth)           | OMB          | `schemas/sde/*.schema.json`         |
| NOFO IC JSON Schema (published)     | This package | `schemas/ic/`                       |
| Zod + types                         | This package | `src/schemas/`                      |
| Plugin (transforms + custom fields) | This package | `src/index.ts`, `src/transforms.ts` |

## Development

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for setup, scripts, and the ingestion
pipeline. In short:

```bash
pnpm install
pnpm run ci      # lint + format + typecheck + build + test + audit
```

## License

[CC0-1.0](./LICENSE)
