import {
  JCR_SEARCH_QUERY,
  JCR_NODES_BY_CRITERIA_QUERY,
  buildJcrSql2,
} from "./queries/pagesQuery.ts";
import type { ContentSearchDriver } from "../shared/searchTypes.ts";
import { useJcrSearchDriver } from "./useJcrSearchDriver.ts";

/** Searches for jnt:page nodes using JCR (fallback when augmented search is unavailable). */
export const useJcrSearch = (): ContentSearchDriver =>
  useJcrSearchDriver({
    nodesByQueryDoc: JCR_SEARCH_QUERY,
    nodesByCriteriaDoc: JCR_NODES_BY_CRITERIA_QUERY,
    buildSql2: buildJcrSql2,
  });
