import {
  JCR_MEDIA_SEARCH_QUERY,
  JCR_MEDIA_BY_CRITERIA_QUERY,
  buildMediaSql2,
} from "./queries/mediaQuery.ts";
import type { ContentSearchDriver } from "../shared/searchTypes.ts";
import { useJcrSearchDriver } from "./useJcrSearchDriver.ts";

/** Searches for jnt:file nodes (media) using JCR. */
export const useJcrMediaSearch = (): ContentSearchDriver =>
  useJcrSearchDriver({
    nodesByQueryDoc: JCR_MEDIA_SEARCH_QUERY,
    nodesByCriteriaDoc: JCR_MEDIA_BY_CRITERIA_QUERY,
    buildSql2: buildMediaSql2,
  });
