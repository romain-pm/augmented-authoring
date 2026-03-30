/**
 * Accessors for kFind's runtime configuration.
 * Values are populated server-side by kFind.jsp into window.contextJsParameters.kfind
 * and fall back to sensible defaults when absent.
 */

export function getMinSearchChars(): number {
    return window.contextJsParameters.kfind?.minSearchChars ?? 3;
}
