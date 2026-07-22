import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Repo-root schemas dir (shared with the plugin). Resolved from the working
 * directory (always `website/` during dev/build) rather than `import.meta.url`,
 * which points at the bundled chunk after Vite processes this module.
 */
export const SCHEMAS_DIR = join(process.cwd(), "..", "schemas");
export const SDE_DIR = join(SCHEMAS_DIR, "sde");
export const IC_DIR = join(SCHEMAS_DIR, "ic");

export type Section = "sde" | "ic";

export interface CatalogEntry {
  /** Filename base, e.g. "AwardingAgencyCode" or "funding-opportunity". Used as the URL slug. */
  slug: string;
  /** Absolute path to the schema file. */
  file: string;
  /** Display name (schema title, falling back to the slug). */
  title: string;
  description: string;
  section: Section;
}

function loadSection(section: Section, dir: string): CatalogEntry[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".schema.json"))
    .map((f) => {
      const schema = JSON.parse(readFileSync(join(dir, f), "utf8"));
      const slug = f.replace(/\.schema\.json$/, "");
      return {
        slug,
        file: join(dir, f),
        title: typeof schema.title === "string" ? schema.title : slug,
        description:
          typeof schema.description === "string" ? schema.description : "",
        section,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** All Information Collection models (root + sub-models), root first. */
export const icEntries: CatalogEntry[] = loadSection("ic", IC_DIR).sort(
  (a, b) => {
    if (a.slug === "nofo-ic") return -1;
    if (b.slug === "nofo-ic") return 1;
    return a.title.localeCompare(b.title);
  },
);

/** All Standard Data Elements. */
export const sdeEntries: CatalogEntry[] = loadSection("sde", SDE_DIR);

export function findEntry(
  section: Section,
  slug: string,
): CatalogEntry | undefined {
  const entries = section === "ic" ? icEntries : sdeEntries;
  return entries.find((e) => e.slug === slug);
}
