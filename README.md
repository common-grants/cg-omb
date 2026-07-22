# CommonGrants — Federal Grant Data Standards

Tooling for the **federal grant data standards**, centered on the **Notice of
Funding Opportunity (NOFO) Information Collection (IC)**, published as
[CommonGrants](https://commongrants.org) plugins.

## Repository layout

| Path            | What it is                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `lib/ts-plugin` | The [`@common-grants/cg-federal`](./lib/ts-plugin) TypeScript SDK plugin (schemas + transforms). |
| `website`       | The [documentation site](./website) for the NOFO IC and its Standard Data Elements.            |
| `schemas`       | The published JSON Schema — SDEs (`sde/`) and the composed NOFO IC (`ic/`). Consumed by both the plugin and the site. |
| `docs`          | Field-mapping crosswalks and discrepancy notes across the systems.                             |

> A Python plugin (`lib/py-plugin`) is planned as a sibling of the TypeScript one.

## Getting started

This is a [pnpm workspace](https://pnpm.io/workspaces): install once at the
root and every package under `lib/` and `website/` is wired up together.

```bash
pnpm install     # installs all workspace packages
pnpm run ci      # runs each package's CI (ci:ts-plugin, ci:website)
```

Target a single package with pnpm's `--filter`:

```bash
pnpm --filter @common-grants/cg-federal run test    # the plugin's tests
pnpm --filter @common-grants/cg-federal-website run dev   # the docs site
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and our
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

[CC0-1.0](./LICENSE)
