/**
 * Jahia context resolution and jContent SPA navigation helpers.
 */

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

/**
 * Navigates the parent jContent SPA to the given node path by pushing a new
 * URL into its history and firing a synthetic popstate so React Router picks
 * it up — without a full page reload.
 *
 * For pages and content-folders modes we force Page Builder view by both
 * setting localStorage (read by extractParamsFromUrl on URL change) and
 * dispatching SET_TABLE_VIEW_MODE to Redux so jContent's store listener
 * does not overwrite localStorage with the stale viewMode after navigation.
 */
export function locateInJContent(nodePath: string, nodeType?: string): void {
  const site = getSiteKey();
  const language = getUiLanguage();
  const siteBase = `/sites/${site}`;

  let parentPath = nodePath;
  if (!parentPath || !parentPath.startsWith(siteBase)) {
    parentPath = siteBase;
  }

  let mode: string;
  let urlPath: string;
  let mediaPreviewPath: string | null = null;
  if (parentPath.startsWith(`${siteBase}/files`)) {
    mode = "media";
    // Navigate to the parent folder so the file is visible in the listing.
    const filesRoot = `${siteBase}/files`;
    const lastSlash = parentPath.lastIndexOf("/");
    const folderPath =
      lastSlash > filesRoot.length
        ? parentPath.substring(0, lastSlash)
        : parentPath;
    urlPath = folderPath.replace(siteBase, "");
    mediaPreviewPath = nodePath;
  } else if (parentPath.startsWith(`${siteBase}/contents`)) {
    mode = "content-folders";
    urlPath = parentPath.replace(siteBase, "");
  } else {
    mode = "pages";
    urlPath = parentPath.replace(siteBase, "") || "/";
  }
  // Force Page Builder view for pages and content folders.
  // We must both set localStorage (read by extractParamsFromUrl on URL change)
  // and dispatch SET_TABLE_VIEW_MODE to Redux so jContent's store listener
  // does not overwrite localStorage with the stale viewMode after navigation.
  if (mode === "pages" || mode === "content-folders") {
    try {
      window.parent.localStorage.setItem(
        `jcontent-previous-tableView-viewMode-${site}-${mode}`,
        "pageBuilder",
      );
    } catch {
      // localStorage may be blocked (privacy settings) — continue anyway
    }
    try {
      window.parent.jahia?.reduxStore?.dispatch({
        type: "SET_TABLE_VIEW_MODE",
        payload: "pageBuilder",
      });
    } catch {
      // reduxStore may not be accessible in all contexts
    }
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

  // For media files: open jContent's preview drawer for the located file.
  // CM_DRAWER_STATES.SHOW = 2 (from jcontent redux/JContent.redux.js)
  if (mediaPreviewPath) {
    try {
      window.parent.jahia?.reduxStore?.dispatch({
        type: "CM_SET_PREVIEW_SELECTION",
        payload: mediaPreviewPath,
      });
      window.parent.jahia?.reduxStore?.dispatch({
        type: "CM_SET_PREVIEW_STATE",
        payload: 2,
      });
    } catch {
      // reduxStore may not be accessible in all contexts
    }
  }
}
