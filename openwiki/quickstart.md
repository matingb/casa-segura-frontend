---
type: quickstart
title: Casa Segura Frontend Quickstart
description: A contributor entry point for running and navigating the Casa Segura Next.js frontend and locating its main workflows.
tags: [quickstart, nextjs, frontend, casa-segura]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-bde9ba4fb64efd4d26f60493
    resource: repo://src/app/(modulos)/layout.tsx
  - id: openwiki-source-01afbbf49552967677fd17eb
    resource: repo://src/app/page.tsx
  - id: openwiki-source-68178021efa182976403abc9
    resource: repo://src/components/layout/Sidebar/Sidebar.tsx
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Casa Segura Frontend Quickstart

Casa Segura is a Next.js frontend for a product catalog, branch inventory, operations, financial accounts, price lists, and replenishment requests. It is a client application that calls a separate API through `/api/...` contracts; this repository does not contain that backend's setup or persistence implementation.

## Run and validate

The package scripts are:

```text
npm run dev     # Next.js development server
npm run build   # production build
npm run start   # serve a built application
npm run lint    # ESLint
npm test        # Vitest
```

The application root redirects to `/productos`. Authentication state is established by the root provider, and module pages receive both the standard application shell and branch context through the `(modulos)` route-group layout. The sidebar is the concise map of user-facing areas:

- `/productos` — product catalog and product detail/edit/create routes
- `/stock` — branch stock catalog and stock detail/edit/create routes
- `/operaciones` — history, detail, and creation routes for purchases, sales, transfers, and movements
- `/cuentas-financieras` — financial account catalog, detail, and maintenance
- `/lista-precios` — enabled branch stock filtered as a price list, with client exports
- `/pedidos-reposicion` — replenishment request catalog and creation

## Start with the relevant page

| If you need to understand or change | Read |
| --- | --- |
| Session redirects, provider placement, login, and the authenticated shell | [Application Shell and Session Control](architecture/application-shell-and-session.md) |
| Request behavior, endpoint clients, response mapping, or payload translation | [API Client Boundary and Data Normalization](architecture/api-client-boundary.md) |
| Products, classifications, branches, or stock rows | [Catalog and Branch Inventory Workflow](workflows/catalog-and-branch-inventory.md) |
| Purchases, sales, transfers, financial movements, or account allocation/history | [Operations and Financial Accounts Workflow](workflows/operations-and-financial-accounts.md) |
| Replenishment requests, price lists, Excel, or PDF exports | [Replenishment and Price List Workflow](workflows/replenishment-and-price-list.md) |
| Shared table/query hooks, filter conventions, or the focused test suite | [Client Data Patterns and Focused Tests](engineering/client-data-and-tests.md) |

## Repository landmarks

- `src/app/` contains route pages and route-group layouts.
- `src/components/` contains the reusable visual primitives and layout shell.
- `src/context/` supplies authentication and branch data to client components.
- `src/lib/api/` is the feature API-client and transport-normalization boundary.
- `src/lib/types/` contains the TypeScript domain shapes used by components and clients.
- `src/lib/hooks/` and feature `_hooks/` hold reusable and feature-specific client state.

When working on a feature, trace from its route/component to its hook and client rather than changing a response mapper or query shape in isolation. For source-of-truth behavior, consult the source and focused tests; these pages describe the current frontend contracts and navigation paths.
