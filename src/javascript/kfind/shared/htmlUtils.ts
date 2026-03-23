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
