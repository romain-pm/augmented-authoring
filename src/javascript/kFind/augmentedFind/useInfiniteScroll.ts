import { useEffect, useRef } from "react";

type UseInfiniteScrollReturn = {
  /** Attach to the scrollable list container — used as the IntersectionObserver root. */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** Attach to an invisible 1px div at the end of the list — triggers onLoadMore when visible. */
  sentinelRef: React.RefObject<HTMLDivElement>;
};

/**
 * Fires `onLoadMore` whenever the sentinel element scrolls into the viewport
 * of the scroll container. The observer is set up once; a stable ref pattern
 * ensures it always calls the latest version of `onLoadMore` without needing
 * to be torn down and re-created on every render.
 */
export const useInfiniteScroll = (
  onLoadMore: () => void,
): UseInfiniteScrollReturn => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Stable ref so the observer always invokes the latest onLoadMore closure.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current();
      },
      { root: container, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { scrollContainerRef, sentinelRef };
};
