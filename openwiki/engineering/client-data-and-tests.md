---
type: engineering-guide
title: Client Data Patterns and Focused Tests
description: Reusable table-query, catalog loading, classification, and account-movement conventions, plus the focused Vitest coverage that protects them.
tags: [testing, react, hooks, tables, data]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-30a72e1fb831c2bff71de266
    resource: repo://src/app/(modulos)/operaciones/_hooks/useOperacionesFiltrado.test.ts
  - id: openwiki-source-c46a43ab7bac0dfb8125368d
    resource: repo://src/app/(modulos)/operaciones/_hooks/useOperacionesFiltrado.ts
  - id: openwiki-source-78538f0df2601af76158ad29
    resource: repo://src/components/ui/Table/Table.tsx
  - id: openwiki-source-41eeb9828cc389ed38fdb190
    resource: repo://src/lib/hooks/useClasificacion.ts
  - id: openwiki-source-31ed04a9f59624ffcff9b906
    resource: repo://src/lib/hooks/useTableQuery.test.ts
  - id: openwiki-source-ae0754ae4b5646e3b78ec35f
    resource: repo://src/lib/hooks/useTableQuery.ts
  - id: openwiki-source-ab605491c10d5f91c58b1c89
    resource: repo://src/lib/utils/movimientos.test.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
  - id: openwiki-source-fa7e60e4d16a0910621fd6db
    resource: repo://vitest.setup.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Client Data Patterns and Focused Tests

The client has a small set of reusable hooks for catalog screens. They centralize table query state, paginated loading, and filter-option hydration so feature components can concentrate on columns, actions, and domain-specific parameter transforms.

## Table query state

`useTableQuery` owns page, sort criteria, free-text search, and field filters. Any sort, text-search, or filter change resets the page to 1; `resetQuery` also clears sort and search and can replace the entire filter set. Its sorting transition is defined by `toggleSortCriterion`: a column moves absent → ascending → descending → absent, while independently sorted columns are retained. This enables ordered multi-column criteria, which the table component displays with a priority marker when more than one criterion is active.

## Paginated catalog loading

`useCatalogoPaginado` composes that state with a client offering `obtenerPaginadoConTotal` and, optionally, `obtenerValoresUnicos`.

- It loads options for every configured filter field concurrently and exposes them as `{ value, label }` pairs.
- It builds a default query from current page, page size, sort, filters, and search. If a `searchField` is configured, search is merged into `filtros`; otherwise it is sent as the separate `search` parameter.
- A feature can supply `transformParams` to tailor this generic shape to an endpoint. For example, operations removes the UI `tipo` filter into `tipoId` and turns free-text search into the backend-facing `usuario` filter.
- Both effects use an `active` flag, so results that settle after the effect cleanup do not update state. Fetch failures are logged and complete the loading state rather than throwing from the effect.

Feature catalog components for products, stock, replenishment, and operations call this hook. A client therefore needs to support the paginated contract before it can use the shared catalog UI.

## Other client helpers

`useClasificacion` fetches types and subtypes in parallel, retains a loading/error state, and exposes memoized lookup helpers for resolving names, subtype-to-type IDs, and subtypes for a selected type. This is the classification-facing counterpart to the generic catalog hook.

For financial movement presentation, `esEgresoMovimiento` normalizes the type and treats `egreso`, `compra`, and `traslado` as outflows. `montoConSignoMovimiento` then returns the absolute amount with a negative sign for an outflow and a positive sign otherwise. The source amount is not mutated.

## Tests and scope

`npm test` invokes Vitest. The test configuration uses jsdom, the React plugin, and Testing Library's jest-dom setup, so focused hook/component tests can render browser-oriented behavior without a running backend.

The committed tests cover the query state's initialization, page reset behavior, sort cycle, and reset behavior; they also mock product, stock, and operations clients to assert that catalog changes produce the expected request parameters. Operation filter tests further check type-option loading and the derived visible-page total. The movement utility tests cover outgoing versus incoming signs. These are unit/integration-style client tests with mocked API clients; they do not establish a live backend or full browser end-to-end flow.

## Adding a catalog screen

Use `useCatalogoPaginado` when the client can provide the expected paginated method. Configure select-filter field names, then add `transformParams` only where the endpoint uses a different public parameter shape. Extend the focused tests when you add a transform or change the query semantics: assert both the resulting hook state and the parameters passed to the mocked client.
