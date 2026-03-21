import { JCR_SEARCH_QUERY } from "./queries/pagesQuery.ts";
import {
  JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY,
  buildJcrMainResourcesSql2,
} from "./queries/mainResourcesQuery.ts";
import type { ContentSearchDriver } from "../shared/searchTypes.ts";
import { useJcrSearchDriver } from "../shared/useJcrSearchDriver.ts";

/**
 * Searches for jmix:mainResource nodes using JCR.
 * Reuses JCR_SEARCH_QUERY (generic nodesByQuery) for the SQL2 approach
 * since the SQL2 string itself filters by jmix:mainResource.
 */
export const useJcrMainResourcesSearch = (): ContentSearchDriver =>
  useJcrSearchDriver({
    nodesByQueryDoc: JCR_SEARCH_QUERY,
    nodesByCriteriaDoc: JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY,
    buildSql2: buildJcrMainResourcesSql2,
  });
