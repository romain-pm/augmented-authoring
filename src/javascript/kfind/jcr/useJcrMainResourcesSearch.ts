import {
  JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY,
  buildMainResourcesSql2,
} from "./queries/mainResourcesQuery.ts";
import { JCR_NODES_BY_QUERY } from "./queries/jcrQueryUtils.ts";
import type { ContentSearchDriver } from "../shared/searchTypes.ts";
import { useJcrSearchDriver } from "./useJcrSearchDriver.ts";

/** Searches for jmix:mainResource nodes using JCR. */
export const useJcrMainResourcesSearch = (): ContentSearchDriver =>
  useJcrSearchDriver({
    nodesByQueryDoc: JCR_NODES_BY_QUERY,
    nodesByCriteriaDoc: JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY,
    buildSql2: buildMainResourcesSql2,
  });
