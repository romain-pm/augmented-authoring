declare interface Window {
  contextJsParameters: {
    currentUser: string;
    uilang?: string;
    lang?: string;
    siteKey?: string;
    /** Populated server-side by reading org.jahia.pm.modules.k-find.config.cfg */
    kFind?: {
      typeOfJCRGraphQL?: "nodesByQuery" | "nodesByCriteria";
      /** Minimum characters before a content search query is fired. Default: 3. */
      minSearchChars?: number;
      /** Number of results shown per section before clicking "show more". Default: 5. */
      defaultDisplayedResults?: number;
      /** Debounce delay (ms) before firing a search when augmented search is enabled. Default: 300. */
      augmentedFindDelayInTypingToLaunchSearch?: number;
      /** Debounce delay (ms) before firing a search when augmented search is NOT enabled (JCR fallback). Default: 300. */
      jcrFindDelayInTypingToLaunchSearch?: number;
    };
    [key: string]: unknown;
  };
  jahia?: {
    routerHistory?: { push: (path: string) => void; [k: string]: unknown };
    uiExtender?: {
      registry?: {
        registry?: Record<
          string,
          {
            key: string;
            type: string;
            label?: string;
            path?: string;
            route?: string;
            targets?: { id: string; priority: number }[];
            [k: string]: unknown;
          }
        >;
      };
    };
  };
}

declare const __BUILD_TIME__: string;

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
