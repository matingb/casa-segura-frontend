---
type: architecture
title: API Client Boundary and Data Normalization
description: How the Next.js client selects API URLs, handles credentialed requests, and translates API response and request shapes for feature code.
tags: [api, client, data-contracts, nextjs]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-4a2c698892059013040d959c
    resource: repo://src/lib/api.ts
  - id: openwiki-source-9f4dac1172756af91fcc323c
    resource: repo://src/lib/api/cuenta-financiera.client.ts
  - id: openwiki-source-46c2c86194d7ef6aa398f04d
    resource: repo://src/lib/api/operaciones.client.ts
  - id: openwiki-source-4c34e4ae0cc3c9371e91920d
    resource: repo://src/lib/api/producto.client.ts
  - id: openwiki-source-6bfa1692215398b1442e47bd
    resource: repo://src/lib/api/stock.client.ts
  - id: openwiki-source-2de4dda96c07b6f5546aad88
    resource: repo://src/lib/apiFetch.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# API Client Boundary and Data Normalization

The frontend keeps HTTP details in `src/lib/api*` and feature-specific clients under `src/lib/api/`. Pages and hooks normally work with TypeScript domain types rather than directly handling the backend's JSON field names.

## URL and session boundary

`apiUrl` deliberately returns a relative path in a browser. This lets browser requests use the same origin, while code evaluated outside the browser prefixes the path with `NEXT_PUBLIC_API_URL` or the local `http://localhost:8080` fallback. It is used directly for the authentication endpoints in `AuthContext` and the login page; most feature clients use relative paths with `apiFetch`.

`apiFetch` is the common wrapper for feature requests. It enables `credentials: 'include'` unless a caller overrides that option. A 401 on the client replaces the current location with `/login` and then throws, so callers do not silently treat an expired session as an ordinary empty result. Other status handling remains feature-specific: many list/create/update methods throw a localized error for a non-OK response, while several `obtenerPorId` methods return `null` when a resource request is not OK.

## Feature clients and response mapping

Feature clients request `/api/...` endpoints and generally expect a response envelope containing `status` and `data`. List methods only map arrays when `status === 'success'`; otherwise they return an empty list. Detail methods likewise map a truthy `data` value and otherwise return `null`.

The mapping functions form the client-side schema boundary. For example, product, branch-stock, account, and operation clients convert backend-style snake_case fields to the camelCase fields defined in `src/lib/types`. They also turn nullable numeric transport values into numbers or documented defaults before the data reaches React components. This keeps tables and forms independent from transport naming, but any backend contract change must be reflected in the matching mapper.

## Query and mutation conventions

Catalog, stock, and operation clients expose both offset-based and page/total-based list methods. The latter serializes `page`, `limit`, optional search or domain filters, multi-column `sortBy`/`sortDir`, and non-empty `filtro_<field>` entries into the query string. It returns the mapped data with page metadata, defaulting missing metadata to a first page and zero/one totals as appropriate.

Create and update methods send JSON through the shared wrapper. Product, stock, account, and replenishment clients accept feature-level input and serialize the endpoint's expected field naming at that boundary. Operations do more translation because their `OperacionCrearInput` has four variants: purchase, sale, transfer, and cash movement. `mapOperacionCrearInputToApiBody` creates common operation fields, maps item and account fields to snake_case, and attaches the variant-specific nested object. The reverse detail mapper reconstructs a unified operation detail with mapped items and account allocations for the UI.

## Extension guidance

When adding an endpoint, prefer a feature client that:

- calls `apiFetch` for authenticated feature traffic;
- maps transport data into a type from `src/lib/types` rather than leaking raw JSON into components;
- preserves the existing response-envelope and failure convention appropriate to list, detail, or mutation use; and
- keeps query-string serialization alongside the endpoint client.

This layer is a frontend contract, not a definition of backend persistence or authorization rules. Verify server behavior in the corresponding backend repository before documenting or relying on semantics not shown here.
