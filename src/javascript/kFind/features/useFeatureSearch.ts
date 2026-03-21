import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FeatureHit } from "../shared/searchTypes.ts";
import {
  getSiteKey,
  getSearchLanguage,
  getMinSearchChars,
} from "../shared/searchUtils.ts";

export function useFeatureSearch(query: string): FeatureHit[] {
  const { t } = useTranslation();
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < getMinSearchChars()) return [];

    const registry = window.jahia?.uiExtender?.registry?.registry;
    if (!registry) return [];

    const results: FeatureHit[] = [];
    for (const entry of Object.values(registry)) {
      if (entry.type !== "adminRoute" && entry.type !== "jExperienceMenuEntry")
        continue;
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
    return results;
    // t is stable across renders — intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
}
