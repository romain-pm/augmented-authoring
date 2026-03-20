export type SearchHit = {
  id: string;
  path: string;
  displayableName: string;
  excerpt: string | null;
  nodeType: string;
};

export type FeatureHit = {
  key: string;
  label: string;
  path: string;
};

/** Common interface returned by both augmented and JCR search hooks. */
export type ContentSearchDriver = {
  hits: SearchHit[];
  totalHits: number;
  loading: boolean;
  hasMore: boolean;
  search: (query: string, page: number) => void;
  reset: () => void;
};
