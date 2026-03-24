/**
 * Accessors for kFind's runtime configuration.
 * Values are populated server-side by kFind.jsp into window.contextJsParameters.kfind
 * and fall back to sensible defaults when absent.
 */

export function getMinSearchChars(): number {
  return window.contextJsParameters.kfind?.minSearchChars ?? 3;
}

export function getDefaultDisplayedResults(): number {
  return window.contextJsParameters.kfind?.defaultDisplayedResults ?? 5;
}

export function getAugmentedFindDelay(): number {
  return (
    window.contextJsParameters.kfind
      ?.augmentedFindDelayInTypingToLaunchSearch ?? 300
  );
}

export function getJcrFindDelay(): number {
  return (
    window.contextJsParameters.kfind?.jcrFindDelayInTypingToLaunchSearch ?? 300
  );
}

export function isUiFeaturesEnabled(): boolean {
  return window.contextJsParameters.kfind?.uiFeaturesEnabled !== false;
}

export function getUiFeaturesMaxResults(): number {
  return window.contextJsParameters.kfind?.uiFeaturesMaxResults ?? 2;
}

export function isJcrMediaEnabled(): boolean {
  return window.contextJsParameters.kfind?.jcrMediaEnabled !== false;
}

export function getJcrMediaMaxResults(): number {
  return window.contextJsParameters.kfind?.jcrMediaMaxResults ?? 2;
}

export function isJcrPagesEnabled(): boolean {
  return window.contextJsParameters.kfind?.jcrPagesEnabled !== false;
}

export function getJcrPagesMaxResults(): number {
  return window.contextJsParameters.kfind?.jcrPagesMaxResults ?? 4;
}

export function isJcrMainResourcesEnabled(): boolean {
  return window.contextJsParameters.kfind?.jcrMainResourcesEnabled !== false;
}

export function getJcrMainResourcesMaxResults(): number {
  return window.contextJsParameters.kfind?.jcrMainResourcesMaxResults ?? 4;
}

export function isUrlReverseLookupEnabled(): boolean {
  return window.contextJsParameters.kfind?.urlReverseLookupEnabled !== false;
}
