/**
 * Synchronous hook that searches Jahia's UI extender registry.
 *
 * Scans all `adminRoute` and `jExperienceMenuEntry` items in the global
 * `window.jahia.uiExtender.registry` and returns matches against the
 * search query.
 *
 * Route resolution logic:
 * - jExperience entries → /jexperience/{site}/{path}
 * - jcontent targets → /jcontent/{site}/{lang}/apps/{key}
 * - Server-level targets → /administration/{key}
 * - Site-level targets → /administration/{site}/{key}
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FeatureHit } from "../../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../../shared/navigationUtils.ts";
import { getMinSearchChars } from "../../shared/configUtils.ts";

/** Static shortcuts that are always surfaced when the query matches. */
const STATIC_FEATURES: FeatureHit[] = [
  {
    key: "manageModules",
    label: "Module management UI",
    path: "/cms/adminframe/default/en/settings.manageModules.html",
  },
];

export function useFeatureSearch(query: string): FeatureHit[] {
  const { t } = useTranslation();
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < getMinSearchChars()) return [];

    // Include static shortcuts that match the query before registry hits.
    const staticHits = STATIC_FEATURES.filter(
      (f) =>
        f.label.toLowerCase().includes(trimmed) ||
        f.key.toLowerCase().includes(trimmed),
    );

    const registry = window.jahia?.uiExtender?.registry?.registry;
    if (!registry) return staticHits;

    const results: FeatureHit[] = [];
    for (const entry of Object.values(registry)) {
      if (entry.type !== "adminRoute" && entry.type !== "jExperienceMenuEntry")
        continue;
      // Skip registry entries that duplicate a static shortcut.
      if (staticHits.some((s) => s.key === entry.key)) continue;
      const label = entry.label ? t(entry.label) : entry.key;
      if (
        label.toLowerCase().includes(trimmed) ||
        entry.key.toLowerCase().includes(trimmed)
      ) {
        const targetIds = (entry.targets ?? []).map((tgt) => tgt.id);
        let path: string;
        if (entry.type === "jExperienceMenuEntry") {
          // jExperience has its own app section — use the entry's path property.
          const entryPath = (entry.path ?? entry.key).replace(/^\//, "");
          path = `/jexperience/${getSiteKey()}/${entryPath}`;
        } else if (targetIds.some((id) => id.startsWith("jcontent"))) {
          // jcontent app route: /jcontent/{site}/{lang}/apps/{key}
          path = `/jcontent/${getSiteKey()}/${getSearchLanguage()}/apps/${entry.key}`;
        } else if (targetIds.some((id) => id.includes("server"))) {
          // Server-level admin route: /administration/{key}
          path = `/administration/${entry.key}`;
        } else {
          // Site-level admin route: /administration/{site}/{key}
          path = `/administration/${getSiteKey()}/${entry.key}`;
        }
        results.push({ key: entry.key, label, path });
      }
    }
    return [...staticHits, ...results];
    // t is stable across renders — intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
}
