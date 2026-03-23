# kFind

A Spotlight-style search modal for [Jahia CMS](https://www.jahia.com/) that lets editors quickly find and navigate to any content, page, media, feature, or URL directly from the authoring interface. Open it with **⌘K** (macOS) or **Ctrl+K** (Windows/Linux) and start typing — results appear instantly across multiple search drivers.

## Stack

React 18 + TypeScript, bundled with Vite 7 and Module Federation (`@jahia/vite-federation-plugin`). GraphQL queries run through Apollo Client 3 against Jahia's backend. The UI is built with [@jahia/moonstone](https://github.com/Jahia/moonstone) and styled with CSS Modules. Internationalization uses react-i18next (English, French, German). The module is packaged as an OSGi bundle via Maven.

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Open / close modal | **⌘K** / **Ctrl+K** |
| Close modal | **Esc** |
| Navigate results | **↑** / **↓** |
| Go to selected result | **Enter** |
| Edit selected result | **E** |

A custom DOM event `kfind:open-search` can also open the modal programmatically (used by the nav search button).

## Search Sections

The modal displays results in up to six sections, each powered by an independent search driver. Sections appear conditionally based on configuration and site capabilities.

**Direct URL Match** — When the query looks like a URL (starts with `http://`, `https://`, `/`, or contains a domain pattern), kFind resolves it against Jahia's vanity URLs and JCR paths via a custom GraphQL endpoint. Returns a single matching node if found.

**Features** — Filters Jahia's UI registry in memory (no network call) to surface admin routes, jContent apps, and jExperience menu items matching the query. Results are instant and appear even before the minimum character threshold.

**Media** — Searches for `jnt:file` nodes (images, videos, documents) via a JCR GraphQL query. Results include a 40×40 thumbnail preview when available. Fires independently of other search drivers.

**Augmented Search** — When the site has a search index (`jmix:augmentedSearchIndexableSite` mixin), queries Jahia's Elasticsearch-backed augmented-search endpoint for pages, main resources, and documents. Supports server-side pagination and returns highlighted HTML excerpts.

**JCR Pages** — Fallback when augmented search is unavailable. Queries for `jnt:page` nodes via JCR GraphQL (`nodesByCriteria` or `nodesByQuery` depending on configuration).

**JCR Main Resources** — Fallback when augmented search is unavailable. Queries for nodes with the `jmix:mainResource` mixin (full-page content items).

## Architecture

```
init.ts → registerRoutes()
  ├─ <KFindModal />           (separate React root)
  │   ├─ ApolloProvider       (bridged from jcontent)
  │   └─ <KFindPanel />
  │       ├─ <KFindHeader />  (input + clear button)
  │       └─ <ScrollContainer>
  │           ├─ <UrlReverseLookupResults />
  │           ├─ <FeatureResults />
  │           ├─ <ContentResultsSection /> × 4  (media, augmented, pages, main resources)
  └─ <NavSearchButton />      (in jcontent's React tree)
      └─ captures Apollo client → bridge
```

The module registers itself via `@jahia/ui-extender` at app startup. Because the modal runs in its own React root (outside jcontent's tree), an Apollo client bridge captures jcontent's client instance and shares it across roots. The `useSearchOrchestration` hook coordinates all drivers: it checks augmented-search availability, debounces input, routes queries to the appropriate drivers, and aggregates results.

## Configuration

All settings are defined in the OSGi configuration file `org.jahia.pm.modules.kfind.cfg` and injected at runtime into `window.contextJsParameters.kfind` via a JSP filter.

| Property | Default | Description |
|----------|---------|-------------|
| `minSearchChars` | 3 | Minimum characters before search fires |
| `defaultDisplayedResults` | 5 | Initial results per section before "Show more" |
| `augmentedFindDelayInTypingToLaunchSearch` | 300 | Debounce delay in ms (augmented search) |
| `jcrFindDelayInTypingToLaunchSearch` | 300 | Debounce delay in ms (JCR fallback) |
| `typeOfJCRGraphQL` | `nodesByCriteria` | JCR query mode (`nodesByCriteria` or `nodesByQuery`) |
| `uiFeaturesEnabled` | true | Show UI Features section |
| `uiFeaturesMaxResults` | 2 | Max features displayed initially |
| `jcrMediaEnabled` | true | Show Media section |
| `jcrMediaMaxResults` | 2 | Max media results initially |
| `jcrPagesEnabled` | true | Show JCR Pages section (when augmented unavailable) |
| `jcrPagesMaxResults` | 4 | Max page results initially |
| `jcrMainResourcesEnabled` | true | Show JCR Main Resources section |
| `jcrMainResourcesMaxResults` | 4 | Max main resource results initially |
| `urlReverseLookupEnabled` | true | Enable URL → node resolution |

## Internationalization

Translations live in `src/main/resources/javascript/locales/` under the `kfind` i18n namespace. All keys are maintained in three locales: English (`en.json`), French (`fr.json`), and German (`de.json`). The active language aligns with Jahia's UI language (`window.contextJsParameters.uilang`) at module initialization. Every `t()` call includes a hardcoded fallback string for resilience.

## Build & Deploy

**Prerequisites**: Java 17, Maven 3, Node LTS, Yarn 4 (tool versions managed via `mise.toml`).

```bash
yarn build              # Vite build → src/main/resources/javascript/apps/
mvn clean install       # Full build (includes Vite) → target/kfind-*.jar
npx tsc --noEmit        # Type-check (1 pre-existing error in vite.config.ts is expected)
./deploy.sh             # Deploy JAR to Jahia
```

The deploy script reads `JAHIA_URL`, `JAHIA_USER`, and `JAHIA_PASS` from a `.env` file, runs `mvn clean install`, then uploads the JAR to Jahia's provisioning API. The previous module version is automatically replaced.

## URL Reverse Lookup

A Java GraphQL extension (`KFindQueryExtensions`) adds a `urlReverseLookup(url, siteKey)` field to Jahia's GraphQL schema. It first checks vanity URLs via `VanityUrlService`, then falls back to direct JCR path resolution. The frontend hook `useUrlReverseLookup` fires this query when the search input looks like a URL and renders the match in a dedicated section above all other results.

## Security

User input in JCR-SQL2 queries is escaped via `escapeJcrSql2()` to prevent injection. HTML excerpts from search results are sanitized with `sanitizeHtml()`, which strips scripts, iframes, event handlers, and dangerous tags. No credentials are stored in source code.
