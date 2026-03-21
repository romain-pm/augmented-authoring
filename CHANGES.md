# Changes — March 21, 2026

## Fix: stale JS chunks breaking the Jahia UI (pom.xml)

**Symptom**: After deploying kfind, the Jahia administration UI failed to load.

**Root cause**: `maven-clean-plugin` in `pom.xml` used `<include>*</include>`, which only
matches direct children of `src/main/resources/javascript/apps/`. The `assets/` subdirectory
was never cleaned between builds. Successive `mvn clean install` runs accumulated stale
hashed chunk files alongside newly generated ones. The resulting JAR contained a mix of old
and new chunks — Vite's module federation manifest referenced new filenames while some
imports resolved to mismatched stale files.

**Fix**: Changed `<include>*</include>` → `<include>**</include>` so the clean phase
recursively wipes the entire `assets/` subtree before each build.

---

## Refactors & renames

- Renamed folder `src/javascript/kFind/` → `src/javascript/kfind/` (lowercase, macOS two-step git mv)
- Renamed `src/main/resources/configs/kFind.jsp` → `kfind.jsp`
- Renamed all string identifiers from `kFind` → `kfind`:
  - `window.contextJsParameters.kFind` → `kfind`
  - Registry callback key: `"kFind"` → `"kfind"`
  - Registry nav-item key: `"kFind-search"` → `"kfind-search"`
  - Custom event: `"kFind:open-search"` → `"kfind:open-search"`
  - DOM id: `"kFind-search-modal"` → `"kfind-search-modal"`
  - `package.json` name: `"kFind"` → `"kfind"`
  - Locale labels/titles in `en.json`, `fr.json`, `de.json`
  - Log messages and `.cfg` comment
- PascalCase component names kept as-is (`KFindModal`, `KFindPanel`, `KFindHeader`)

## Dev build support (vite.config.ts / package.json)

- `vite.config.ts`: converted config to `({ mode }) => ({...})` factory; adds inline source
  maps and disables minification when `mode === "development"`
- `package.json`: added `"build:dev": "vite build --mode development"` script

## ResultCard improvements

- Added "Enter" action button (`Subdirectory` icon) visible on all rows, not just rows with
  a secondary action
- Edit button only shown when `onSecondaryAction` is provided

## JCR media query

- Added `$language: String!` variable to `JCRMediaSearch` query and passed it to
  `nodesByQuery` for correct display-name localisation
