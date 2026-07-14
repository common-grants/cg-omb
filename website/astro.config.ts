// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sdeEntries } from "./src/lib/catalog";

// https://astro.build/config
export default defineConfig({
  site: "https://cg-omb.example",
  integrations: [
    starlight({
      title: "OMB NOFO IC",
      description:
        "The OMB Notice of Funding Opportunity Information Collection and its Standard Data Elements.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/common-grants/ts-plugin-omb",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        {
          label: "Information Collections",
          items: [{ label: "NOFO", link: "/ic/" }],
        },
        {
          label: "Standard Data Elements",
          collapsed: true,
          items: [
            { label: "All SDEs", link: "/sde/" },
            ...sdeEntries.map((e) => ({
              label: e.title,
              link: `/sde/${e.slug}/`,
            })),
          ],
        },
      ],
    }),
  ],
});
