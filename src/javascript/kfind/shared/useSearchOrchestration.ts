/**
 * Central search orchestration hook — registry-driven.
 *
 * Reads all registered `kfindDriver` entries from the Jahia UI registry
 * and manages their lifecycle generically. Has no knowledge of specific
 * drivers (augmented, JCR, features, etc.).
 *
 * Responsibilities:
 * - Reads `getRegisteredDrivers()` on mount, filters by `isEnabled()`,
 *   creates `KFindResultsProvider` instances via `createSearchProvider(client)`.
 * - Runs `checkAvailability()` for drivers that declare it.
 * - Debounces user keystrokes with a single global timer.
 * - Fires `search(query, 0)` on each active driver after debounce.
 * - Manages per-driver state (hits, loading, hasMore, page) via `useReducer`.
 * - Exposes pagination helpers (`loadNextPage`) per driver.
 *
 * @param searchValue — The raw (untrimmed) value from the search input.
 */
import {useCallback, useEffect, useMemo, useReducer, useRef} from 'react';
import {
    getRegisteredDrivers,
    type KFindDriver,
    type KFindResultsProvider,
    type SearchHit
} from '../../kfind-drivers/types.ts';
import {getMinSearchChars} from './configUtils.ts';

// ── Debounce delay ──
// A single global timer gates ALL drivers, so the UI doesn't flash intermediate
// states while the user is still typing. The delay is configurable server-side
// via kfind.jsp → window.contextJsParameters.kfind.jcrFindDelayInTypingToLaunchSearch.
function getDebounceDelay(): number {
    return (
        window.contextJsParameters.kfind?.jcrFindDelayInTypingToLaunchSearch ?? 300
    );
}

// ── Per-driver state ──
// Each driver gets its own independent state slice, keyed by the driver's
// registry key (e.g. "kfind-jcr-media"). This allows each section to load,
// paginate, and error independently.
type DriverState = {
  allHits: SearchHit[];
  loading: boolean;
  hasMore: boolean;
  page: number;
};

const INITIAL_DRIVER_STATE: DriverState = {
    allHits: [],
    loading: false,
    hasMore: false,
    page: 0
};

// ── Reducer ──
// All state mutations flow through this reducer so that batched dispatches
// (e.g. multiple drivers completing around the same time) are handled atomically.
type State = {
  driverStates: Record<string, DriverState>;
  currentQuery: string;
  availabilityResolved: boolean;
  driverAvailability: Record<string, boolean>;
};

type Action =
  | { type: 'SEARCH_START'; key: string }
  | {
      type: 'SEARCH_SUCCESS';
      key: string;
      hits: SearchHit[];
      hasMore: boolean;
      page: number;
    }
  | { type: 'SEARCH_ERROR'; key: string }
  | { type: 'SET_CURRENT_QUERY'; query: string }
  | { type: 'RESET_ALL'; keys: string[] }
  | { type: 'SET_AVAILABILITY'; key: string; available: boolean }
  | { type: 'AVAILABILITY_COMPLETE' };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SEARCH_START':
            return {
                ...state,
                driverStates: {
                    ...state.driverStates,
                    [action.key]: {
                        ...(state.driverStates[action.key] ?? INITIAL_DRIVER_STATE),
                        loading: true
                    }
                }
            };
        case 'SEARCH_SUCCESS': {
            // On page 0: replace all hits (new search).
            // On page N > 0: append to existing hits (pagination).
            const prev = state.driverStates[action.key] ?? INITIAL_DRIVER_STATE;
            const allHits =
        action.page === 0 ?
            action.hits :
            [...prev.allHits, ...action.hits];
            return {
                ...state,
                driverStates: {
                    ...state.driverStates,
                    [action.key]: {
                        allHits,
                        loading: false,
                        hasMore: action.hasMore,
                        page: action.page
                    }
                }
            };
        }

        case 'SEARCH_ERROR':
            return {
                ...state,
                driverStates: {
                    ...state.driverStates,
                    [action.key]: {
                        ...(state.driverStates[action.key] ?? INITIAL_DRIVER_STATE),
                        loading: false
                    }
                }
            };
        case 'SET_CURRENT_QUERY':
            return {...state, currentQuery: action.query};
        case 'RESET_ALL': {
            const driverStates: Record<string, DriverState> = {};
            for (const key of action.keys) {
                driverStates[key] = INITIAL_DRIVER_STATE;
            }

            return {...state, driverStates, currentQuery: ''};
        }

        case 'SET_AVAILABILITY':
            return {
                ...state,
                driverAvailability: {
                    ...state.driverAvailability,
                    [action.key]: action.available
                }
            };
        case 'AVAILABILITY_COMPLETE':
            return {...state, availabilityResolved: true};
        default:
            return state;
    }
}

// ── Public types ──
export type SearchOrchestrationResult = {
  drivers: {
    key: string;
    registration: KFindDriver;
    state: DriverState;
    loadNextPage: () => void;
  }[];
  currentQuery: string;
  triggerSearch: (value: string) => void;
};

// ── Hook ──
export const useSearchOrchestration = (
    searchValue: string
): SearchOrchestrationResult => {
    // ── 1. Discover and initialize drivers (once on mount) ──
    // We use a ref (not state) because the driver list is stable for the
    // component's lifetime — drivers are discovered from the registry once
    // and never change. This avoids unnecessary re-renders.
    const driversRef = useRef<
    | {
        key: string;
        registration: KFindDriver;
        provider: KFindResultsProvider;
      }[]
    | null
  >(null);

    if (driversRef.current === null) {
        const client = window.jahia?.apolloClient ?? null;
        const all = getRegisteredDrivers().filter(d => d.isEnabled());
        driversRef.current = all.map(reg => ({
            key: (reg as unknown as { key: string }).key,
            registration: reg,
            provider: client ? reg.createSearchProvider(client) : {search: () => Promise.resolve({hits: [], hasMore: false}), reset: () => {}}
        }));
    }

    const drivers = driversRef.current;
    const driverKeys = useMemo(() => drivers.map(d => d.key), [drivers]);

    // ── 2. State ──
    const initialState: State = useMemo(() => {
        const driverStates: Record<string, DriverState> = {};
        for (const key of driverKeys) {
            driverStates[key] = INITIAL_DRIVER_STATE;
        }

        // Optimistically mark as resolved if no driver has checkAvailability.
        const needsCheck = drivers.some(d => d.registration.checkAvailability);
        return {
            driverStates,
            currentQuery: '',
            availabilityResolved: !needsCheck,
            driverAvailability: {}
        };
    }, [driverKeys, drivers]);

    const [state, dispatch] = useReducer(reducer, initialState);

    // ── Mutable refs for callbacks ──
    const stateRef = useRef(state);
    stateRef.current = state;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── 3. Availability checks ──
    // Some drivers need an async check (e.g. "is augmented search enabled
    // on this site?") before they can be shown. We defer these checks until
    // the user first types enough characters — no wasted network requests
    // if the modal is opened and closed without searching.
    const availabilityTriggeredRef = useRef(false);

    const triggerAvailabilityChecks = useCallback(() => {
        if (availabilityTriggeredRef.current) {
            return;
        }

        availabilityTriggeredRef.current = true;

        const client = window.jahia?.apolloClient ?? null;
        if (!client) {
            dispatch({type: 'AVAILABILITY_COMPLETE'});
            return;
        }

        const checks = drivers
            .filter(d => d.registration.checkAvailability)
            .map(d =>
        d.registration.checkAvailability!(client).then(available => {
            dispatch({type: 'SET_AVAILABILITY', key: d.key, available});
        })
            );

        if (checks.length === 0) {
            dispatch({type: 'AVAILABILITY_COMPLETE'});
        } else {
            Promise.all(checks).then(() => {
                dispatch({type: 'AVAILABILITY_COMPLETE'});
            });
        }
    }, [drivers]);

    // ── 4. Search execution ──
    const executeSearch = useCallback(
        (query: string) => {
            const trimmed = query.trim();
            if (trimmed.length < getMinSearchChars()) {
                return;
            }

            if (!stateRef.current.availabilityResolved) {
                return;
            }

            dispatch({type: 'SET_CURRENT_QUERY', query: trimmed});

            for (const d of drivers) {
                // Skip drivers that failed availability check.
                if (d.registration.checkAvailability) {
                    const available = stateRef.current.driverAvailability[d.key];
                    if (available === false) {
                        continue;
                    }

                    // If availability hasn't been resolved yet for this specific driver, skip.
                    if (available === undefined) {
                        continue;
                    }
                }

                // Skip drivers that can't handle this query.
                if (d.registration.canHandle && !d.registration.canHandle(trimmed)) {
                    continue;
                }

                dispatch({type: 'SEARCH_START', key: d.key});
                d.provider
                    .search(trimmed, 0)
                    .then(result => {
                        dispatch({
                            type: 'SEARCH_SUCCESS',
                            key: d.key,
                            hits: result.hits,
                            hasMore: result.hasMore,
                            page: 0
                        });
                    })
                    .catch(() => {
                        dispatch({type: 'SEARCH_ERROR', key: d.key});
                    });
            }
        },
        [drivers]
    );

    // Stable ref for triggerSearch so effects don't re-fire.
    const executeSearchRef = useRef(executeSearch);
    executeSearchRef.current = executeSearch;

    // Public imperative trigger (e.g. pressing Enter).
    const triggerSearch = useCallback(
        (value: string) => executeSearchRef.current(value),
        []
    );

    // ── 5. Reset all drivers ──
    const resetAll = useCallback(() => {
        for (const d of drivers) {
            d.provider.reset();
        }

        dispatch({type: 'RESET_ALL', keys: driverKeys});
    }, [drivers, driverKeys]);

    // ── 6. Effect: debounce keystrokes ──
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchValue.trim().length < getMinSearchChars()) {
            resetAll();
            return;
        }

        // Kick off availability checks the first time minChars is reached.
        triggerAvailabilityChecks();

        debounceRef.current = setTimeout(() => {
            executeSearchRef.current(searchValue);
        }, getDebounceDelay());

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchValue]);

    // ── 7. Effect: re-fire search when availability resolves ──
    // Availability checks are async — they may resolve AFTER the debounce
    // already fired. When that happens, we re-fire the search so that
    // newly-available drivers get their results too.
    useEffect(() => {
        if (!state.availabilityResolved) {
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        if (searchValue.trim().length >= getMinSearchChars()) {
            executeSearchRef.current(searchValue);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.availabilityResolved]);

    // ── 8. Build active drivers for the consumer ──
    // Filters out drivers that are disabled or failed their availability
    // check, then wraps each surviving driver with its current state and
    // a `loadNextPage` callback for client-driven pagination.
    const activeDrivers: SearchOrchestrationResult['drivers'] = useMemo(() => {
        return drivers
            .filter(d => {
                // Must be enabled (already filtered on mount, but defensive).
                if (!d.registration.isEnabled()) {
                    return false;
                }

                // If has availability check, must be resolved and true.
                if (d.registration.checkAvailability) {
                    const available = state.driverAvailability[d.key];
                    if (available !== true) {
                        return false;
                    }
                }

                return true;
            })
            .map(d => ({
                key: d.key,
                registration: d.registration,
                state: state.driverStates[d.key] ?? INITIAL_DRIVER_STATE,
                loadNextPage: () => {
                    const ds = stateRef.current.driverStates[d.key];
                    if (!ds || ds.loading || !ds.hasMore) {
                        return;
                    }

                    const nextPage = ds.page + 1;
                    const query = stateRef.current.currentQuery;
                    if (!query) {
                        return;
                    }

                    dispatch({type: 'SEARCH_START', key: d.key});
                    d.provider
                        .search(query, nextPage)
                        .then(result => {
                            dispatch({
                                type: 'SEARCH_SUCCESS',
                                key: d.key,
                                hits: result.hits,
                                hasMore: result.hasMore,
                                page: nextPage
                            });
                        })
                        .catch(() => {
                            dispatch({type: 'SEARCH_ERROR', key: d.key});
                        });
                }
            }));
    }, [drivers, state.driverStates, state.driverAvailability]);

    return {
        drivers: activeDrivers,
        currentQuery: state.currentQuery,
        triggerSearch
    };
};
