# Contributing to kFind

This guide covers the workflow and standards for contributing to kFind. For deep technical guidance on Jahia-specific patterns, see the [AI skills](#ai-coding-skills) section below.

## Workflow

1. Create a branch from `main` for your change.
2. Make your changes, keeping commits focused and readable.
3. Run the full build and linting locally before opening a PR:
   ```bash
   mvn clean install        # full build
   yarn lint                # ESLint
   npx tsc --noEmit        # type-check
   ```
4. Update `CHANGES.md` if your change is user-visible.
5. Ensure CI passes (build + Cypress E2E tests run automatically on PR).
6. Open a Pull Request with a clear description of what changed and why.

## Code Quality

- **No credentials or sensitive information** in source code or configuration.
- Escape user input before using it in JCR criteria or GraphQL variables.
- ESLint with the `@jahia` preset is the enforced style — run `yarn lint:fix` to auto-fix.
- Boolean React props must use `is*` / `has*` naming (enforced by ESLint).
- Error handling must surface failures visibly (`console.warn` at minimum); avoid silent failures.

## Testing

kFind currently has Cypress E2E tests under `tests/`. New features should be covered by E2E tests where practical. There are no unit tests today — do not assume a unit test framework is configured.

To run tests locally:
```bash
cd tests && yarn install
./deploy.sh dev          # build and deploy to a local Jahia instance
# then run Cypress from tests/
```

## Backend (Java/OSGi)

- Java 17, OSGi bundle packaging via Maven.
- **Spring Framework is not used** — do not add `org.springframework` dependencies.
- The Java backend is intentionally minimal: only the `graphql/` package for the GraphQL extension. Keep it that way.
- OSGi service registration uses `@Component` annotations (Felix SCR). See [`@Jahia/OSGi-modules-samples`](https://github.com/Jahia/OSGi-modules-samples) for patterns.

## AI Coding Skills

This project includes on-demand AI skills (GitHub Copilot SKILL.md files) with deep guidance on Jahia-specific patterns. Load them when working in their respective domains:

| Skill | When to load |
|---|---|
| [`moonstone-ui`](.github/skills/moonstone-ui/SKILL.md) | Building React UI components with `@jahia/moonstone` |
| [`jahia-frontend`](.github/skills/jahia-frontend/SKILL.md) | Apollo client, registry pattern, CSS modules, `globals.d.ts` |
| [`jahia-config`](.github/skills/jahia-config/SKILL.md) | Surfacing OSGi config to JavaScript via JSP + `contextJsParameters` |
| [`jahia-graphql-frontend`](.github/skills/jahia-graphql-frontend/SKILL.md) | Writing GraphQL queries in TypeScript (JCR, augmented search) |
| [`jahia-graphql-extension`](.github/skills/jahia-graphql-extension/SKILL.md) | Adding a new Java GraphQL field via `@GraphQLTypeExtension` |
