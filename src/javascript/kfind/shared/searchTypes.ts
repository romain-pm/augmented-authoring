/**
 * Shared type definitions used across all search drivers and UI components.
 */

/** A single content search result (returned by both augmented search and JCR queries). */
export type SearchHit = {
  /** Unique identifier — typically the JCR node UUID. */
  id: string;
  /** Absolute JCR path (e.g. /sites/mysite/home/about). */
  path: string;
  /** Human-readable name shown in the result list. */
  displayableName: string;
  /** HTML excerpt with search-term highlights, or null if unavailable. */
  excerpt: string | null;
  /** JCR primary node type (e.g. jnt:page, jnt:file). */
  nodeType: string;
};

/** A UI feature result (admin routes / jExperience menu entries from the Jahia registry). */
export type FeatureHit = {
  /** Registry key of the feature. */
  key: string;
  /** Translated display label. */
  label: string;
  /** In-app route path for navigation (e.g. /administration/mysite/settings). */
  path: string;
};

/**
 * Common interface returned by all content search hooks (augmented + JCR).
 *
 * Provides a uniform API so the orchestration layer can treat every
 * search driver identically — trigger searches, read results, paginate,
 * and reset state without knowing the underlying query technology.
 */
export type ContentSearchDriver = {
  hits: SearchHit[];
  totalHits: number;
  loading: boolean;
  hasMore: boolean;
  /** Fire a search for `query` at the given 0-based `page` offset. */
  search: (query: string, page: number) => void;
  /** Clear all accumulated results and reset pagination. */
  reset: () => void;
};
