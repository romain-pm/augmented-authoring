---
name: moonstone-ui
description: "Use when building UI for a Jahia module with @jahia/moonstone. Covers Typography for all text rendering (never raw HTML elements), component catalog (Modal, Input, Button, Chip, Tooltip, Typography), icon imports, Vite Module Federation configuration, and ESLint preset integration."
---

# Moonstone UI — Jahia Design System

## When to Use

Load this skill when writing React components for a Jahia module that uses `@jahia/moonstone`.

---

## Typography — always use it for text

**Never** render text with raw `<p>`, `<span>`, `<h1>`–`<h6>`, or `<div>` elements. Always use `<Typography>` from `@jahia/moonstone`.

```tsx
import { Typography } from '@jahia/moonstone';

// ✅ correct
<Typography variant="title">Search results</Typography>
<Typography variant="body">No results found for your query.</Typography>
<Typography variant="caption">Press Esc to close</Typography>

// ❌ wrong — never do this
<p>Search results</p>
<span>No results found</span>
```

### Typography variants

| Variant    | Use for                      |
| ---------- | ---------------------------- |
| `heading`  | Page or section headings     |
| `title`    | Dialog / modal titles        |
| `subTitle` | Section sub-headers          |
| `body`     | Standard prose, descriptions |
| `caption`  | Hints, labels, timestamps    |

---

## Component Catalog

All components are imported from `@jahia/moonstone`:

```tsx
import {
  Modal,
  ModalFooter,
  Input,
  Button,
  Chip,
  Tooltip,
  Typography,
} from "@jahia/moonstone";
```

### Icons

Icons live in the same package — import them alongside components:

```tsx
import { Search, Close, Edit, Subdirectory } from '@jahia/moonstone';

// Use as JSX elements inside other components
<Search/>
<Close/>
```

### Common Patterns

**Modal with footer**

```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <Typography variant="title">{t("dialog.title")}</Typography>
  {/* content */}
  <ModalFooter>
    <Typography variant="caption">{t("dialog.hint")}</Typography>
  </ModalFooter>
</Modal>
```

**Input with search icon**

```tsx
<Input
  placeholder={t("search.placeholder")}
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  inputProps={{ "aria-label": t("search.ariaLabel") }}
/>
```

**Type badge**

```tsx
<Chip label={nodeType} color="default" />
```

---

## Vite Module Federation — singleton: false

Moonstone must be configured as **non-singleton** in the Vite federation plugin. This is because the module may need a local build of Moonstone that includes components not yet available in the version installed on the Jahia platform.

```ts
// vite.config.ts
jahia({
  exposes: { "./init": "./src/javascript/init.ts" },
  shared: {
    "@jahia/moonstone": { singleton: false, eager: false },
  },
});
```

> **Note**: `singleton: false` means **each module bundles its own copy** of Moonstone. Components are not shared with the platform or other modules. Revert to `singleton: true` once the platform ships the version you need.

---

## ESLint

The `@jahia` ESLint preset already covers all React and Moonstone-specific rules. Do **not** add your own `react/*` or `jsx-*` rules — they may conflict.

Rules the preset enforces that are relevant here:

- `react/boolean-prop-naming`: boolean props must use `is*` or `has*` prefix (e.g. `isOpen`, `hasError`, `isDisabled`).
- `react/jsx-runtime`: JSX transform is automatic — no need to `import React from 'react'`.

Run linting with:

```bash
yarn lint        # check
yarn lint:fix    # auto-fix
```
