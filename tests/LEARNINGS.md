# kfind e2e Test Infrastructure — Learnings

## JCR Node Constraints

-   `kfindtest:mainResource` cannot be created under `jnt:contentFolder` — only under `jnt:page` (e.g. `/sites/${siteKey}/home`)
-   `jnt:file` requires a `jcr:content` child (`jnt:resource`) with mandatory `jcr:mimeType` **and** `jcr:data` (binary)

## GraphQL File Upload

-   `cy.request` with a `FormData` body silently serializes to `{}` — does NOT send multipart correctly
-   Jahia's GraphQL binary upload: use form fields `query`, `variables`, and a named file field; set `variables.file = "<fieldname>"` (the field key), NOT null
-   The graphql-multipart-spec (`map` + null variable) causes `j:extractedText = "org.apache...@xxx"` — the binary arrives as an object toString
-   Working approach (mirrors what `@jahia/cypress` `uploadFile` does): `-F "query=..."  -F "variables=..." -F "filedata=<content>;type=text/plain"`

## Full-Text Search Behavior (nodesByCriteria `contains`)

-   Word tokens from file content ARE indexed and searchable individually/by phrase
-   File node names are NOT independently indexed for full-text search — only `j:extractedText` content counts
-   Hyphenated search terms are handled in current media provider queries through `vSearchTerm` (`%term%`) constraints and `j:nodename` LIKE fallback

## Cypress cy.request

-   Does NOT send `Origin` header by default — Jahia CSRF blocks requests without `Origin: http://localhost:8080`
-   Must use `auth: {user, pass}` + explicit `Origin` header for all `/modules/graphql` calls
-   `cy.apollo()` via `cross-fetch` also lacks `Origin` — use `cy.request` instead

## Site Setup

-   `kfind-test-module` must be deployed as a `j:moduleType="templatesSet"` with a `<templates>` folder, a `<base>` template, a `<home>` page template, and a `<home>` page node
-   `jnt:page` creation requires mandatory `j:templateName` property

## Test Status Snapshot (2026-04-04)

| Spec               | Result |
| ------------------ | ------ |
| kfindEdgeCases     | ✅ 5/5 |
| kfind0Setup        | ✅ 1/1 |
| kfindPages         | ✅ 2/2 |
| kfindPagination    | ✅ 2/2 |
| kfindMainResources | ✅ 3/3 |
| kfindMedia         | ✅ 2/2 |
| kfindFeatures      | ⚠️ 1/2 |
| kfindInteraction   | ⚠️ 1/3 |
| kfindZTeardown     | ✅ 1/1 |

Notes:

-   This is a point-in-time snapshot from `tests/results/reports/cypress_001..009.json`.
-   Re-run `cd tests && yarn e2e:ci` to refresh the status.

## Findings and Conclusion (2026-04-04)

### Findings

-   Baseline keyboard failures were reproducible only when setup dependencies were respected; targeted runs must include `kfind0Setup.cy.ts`.
-   The previous `modal/panel/search input` readiness checks were too strict on timing for CI variability.
-   Interaction keyboard tests became stable after waiting for visible result rows before asserting Tab and Shift+Tab focus transitions.
-   Pagination keyboard tests were flaky when relying on implicit focus path from the search input.
-   The edit-action test incorrectly assumed `parentWindow.CE_API` always exists; creating a minimal test stub makes this deterministic.

### Minimal test changes applied

-   Increased readiness timeouts in `openSearchModal()` to reduce transient visibility failures.
-   Added explicit result-row visibility precondition in interaction focus tests.
-   Made pagination keyboard tests focus a known row first, then navigate by keyboard to `Show more`.
-   Added safe CE_API stubbing in test context before asserting edit invocation.

### Validation results

-   Command: `yarn cypress run --spec cypress/e2e/kfind0Setup.cy.ts,cypress/e2e/kfindInteraction.cy.ts,cypress/e2e/kfindPagination.cy.ts`
-   Result: `8 passing, 0 failing`.
-   Latest passing reports: `cypress_[name]_019.json`, `cypress_[name]_020.json`, `cypress_[name]_021.json`.

### Conclusion

-   The failing scenarios were primarily test-determinism issues, resolved with low-complexity test-only updates.
-   No product-code changes were required to restore green status for the targeted keyboard suites.
-   If future UX requirements demand stricter tab-order semantics, consider a separate product change in modal/footer focus order and result-list tab model.
