declare interface Window {
  contextJsParameters: {
    currentUser: string;
    uilang?: string;
    lang?: string;
    siteKey?: string;
    [key: string]: unknown;
  };
}

declare const __BUILD_TIME__: string;
