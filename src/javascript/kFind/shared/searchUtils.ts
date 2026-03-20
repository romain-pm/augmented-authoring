/**
 * Utility functions for resolving Jahia context parameters and navigating
 * the parent jContent SPA without a full page reload.
 */

/** Strips scripts, event handlers, and dangerous elements from HTML using the native DOMParser. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,iframe,object,embed,link")
    .forEach((el) => el.remove());
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes)) {
      if (
        attr.name.startsWith("on") ||
        attr.value.trim().toLowerCase().startsWith("javascript:")
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}

export function getSiteKey(): string {
  if (window.contextJsParameters.siteKey) {
    return window.contextJsParameters.siteKey;
  }
  // Fallback: parse from URL pattern /administration/{siteKey}/settings/...
  const parts = window.location.pathname.split("/");
  const adminIndex = parts.indexOf("administration");
  return adminIndex !== -1 && parts[adminIndex + 1]
    ? parts[adminIndex + 1]
    : "default";
}

export function getUiLanguage(): string {
  return window.contextJsParameters.uilang ?? "en";
}

export function getSearchLanguage(): string {
  return window.contextJsParameters.lang ?? "en";
}

export function getMinSearchChars(): number {
  return window.contextJsParameters.kFind?.minSearchChars ?? 3;
}

export function getDefaultDisplayedResults(): number {
  return window.contextJsParameters.kFind?.defaultDisplayedResults ?? 5;
}

export function getAugmentedFindDelay(): number {
  return (
    window.contextJsParameters.kFind
      ?.augmentedFindDelayInTypingToLaunchSearch ?? 300
  );
}

export function getJcrFindDelay(): number {
  return (
    window.contextJsParameters.kFind?.jcrFindDelayInTypingToLaunchSearch ?? 300
  );
}

/**
 * Navigates the parent jContent SPA to the given node path by pushing a new
 * URL into its history and firing a synthetic popstate so React Router picks
 * it up — without a full page reload.
 */
export function locateInJContent(nodePath: string): void {
  const site = getSiteKey();
  const language = getUiLanguage();
  const siteBase = `/sites/${site}`;

  let parentPath = nodePath;
  if (!parentPath || !parentPath.startsWith(siteBase)) {
    parentPath = siteBase;
  }

  let mode: string;
  let urlPath: string;
  if (parentPath.startsWith(`${siteBase}/files`)) {
    mode = "media";
    urlPath = parentPath.replace(siteBase, "");
  } else if (parentPath.startsWith(`${siteBase}/contents`)) {
    mode = "content-folders";
    urlPath = parentPath.replace(siteBase, "");
  } else {
    mode = "pages";
    urlPath = parentPath.replace(siteBase, "") || "/";
  }

  const encodedPath = urlPath
    .split("/")
    .map((s) => (s ? encodeURIComponent(s) : ""))
    .join("/");

  const newUrl = `/jahia/jcontent/${site}/${language}/${mode}${encodedPath}`;
  const navKey = String(Date.now());
  // Push and fire a synthetic popstate so React Router re-renders without a
  // full page reload.
  window.parent.history.pushState({ key: navKey }, "", newUrl);
  window.parent.dispatchEvent(
    new PopStateEvent("popstate", { state: { key: navKey } }),
  );
}
