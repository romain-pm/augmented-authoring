# kFind — Workspace Instructions

## Project Overview

Jahia OSGi module (frontend-only, no Java backend) providing a Spotlight-style search modal (⌘K / Ctrl+K) for Jahia CMS. Searches content via augmented search with a JCR fallback.

## Stack

- **React 18** + **TypeScript 5.9**, bundled with **Vite 7** (Module Federation via `@jahia/vite-federation-plugin`)
- **Apollo Client 3** for GraphQL queries
- **@jahia/moonstone** design system (custom local build, non-singleton)
- **react-i18next** for i18n (namespace `kFind`, locales: en/fr/de)
- **CSS Modules** for styling (`.module.css`)
- Java 17, Maven 3, Node LTS, Yarn 4 (managed via `mise.toml`)

## Build & Deploy

```bash
yarn build          # Vite build → src/main/resources/javascript/apps/
mvn clean install   # Full build → target/augmented-authoring-*.jar
./deploy.sh         # Deploy JAR to Jahia (requires .env with JAHIA_URL, JAHIA_USER, JAHIA_PASS)
node/node node_modules/typescript/bin/tsc --noEmit    # Type-check
```

E2E tests are available under `tests/` (Cypress setup).

## Architecture

```
src/javascript/
  init.ts                      → Entry: registers i18n + routes via @jahia/ui-extender
  globals.d.ts                 → Window augmentation (contextJsParameters, jahia, CE_API)
  kfind/
    KFindModal.tsx             → Modal wrapper, shortcuts, ApolloProvider from window.jahia.apolloClient
    KFindPanel/                → Search input + section rendering
    routes.tsx                 → Jahia registry entry, mounts modal/header integration
    shared/                    → Navigation/config/orchestration helpers
  kfind-drivers/
    registerAll.ts             → Registers all search drivers
    augmented/                 → Augmented search provider and queries
    jcr/                       → JCR fallback drivers (pages/media/main resources)
    features/                  → UI features search driver
    urlReverseLookup/          → URL reverse lookup driver
```

- `useSearchOrchestration` is registry-driven and runs all enabled `kfindDriver` providers.
- Driver availability uses `checkAvailability(client)` and is evaluated with `window.jahia.apolloClient`.
- Runtime config comes from `window.contextJsParameters.kfind` (populated from OSGi `.cfg`/JSP).
- Navigation to jContent is handled via shared helpers in `kfind/shared/navigationUtils.ts`.

## Conventions

- **Imports**: Always include `.ts`/`.tsx` extensions (e.g., `import { foo } from "./bar.ts"`)
- **CSS**: Use CSS Modules — import as `import s from "./Component.module.css"`
- **Components**: `.tsx` for React components, `.ts` for hooks/utilities/queries
- **GraphQL**: Keep queries in dedicated files (`*Query.ts`/`*.ts`); driver providers typically use `client.query(...)`
- **i18n**: Nested keys (e.g., `search.placeholder`), always provide fallback string in `t()` calls, keep en/fr/de in sync
- **Types**: Prefer inline types + `searchTypes.ts` for shared types; augment `Window` in `globals.d.ts`
- **No `index.ts` barrel files** — import from specific files directly
- **Hooks**: Keep orchestration in shared hooks (for example `useSearchOrchestration`) and keep drivers framework-agnostic

## Code Quality

- ESLint with `@jahia` preset; boolean props use `is*`/`has*` naming
- No credentials in source code
- Escape user input when constructing JCR criteria/queries
