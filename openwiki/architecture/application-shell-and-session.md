---
type: architecture
title: Application Shell and Session Control
description: The Next.js route shell, client session state, login flow, and navigation behavior for authenticated Casa Segura modules.
tags: [architecture, authentication, routing, nextjs]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-bde9ba4fb64efd4d26f60493
    resource: repo://src/app/(modulos)/layout.tsx
  - id: openwiki-source-8d46e58add4326fa55236087
    resource: repo://src/app/layout.tsx
  - id: openwiki-source-19239aba292dca25251c06dc
    resource: repo://src/app/login/page.tsx
  - id: openwiki-source-ebbd7b7e0b4e6fc77f56325e
    resource: repo://src/components/layout/AppShell/AppShell.tsx
  - id: openwiki-source-68178021efa182976403abc9
    resource: repo://src/components/layout/Sidebar/Sidebar.tsx
  - id: openwiki-source-731e438f26c856d034b4db65
    resource: repo://src/context/AuthContext.tsx
  - id: openwiki-source-96ab6644c13a9411e85312ee
    resource: repo://src/middleware.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Application Shell and Session Control

Casa Segura is an App Router application. The root route redirects to `/productos`; authenticated business routes are grouped under `src/app/(modulos)`, whose layout combines the branch context and application shell.

## Layered session checks

The middleware is the early route guard. It treats every path beginning with `/login` or `/api` as public, and for other matched requests checks only whether the `access_token` cookie exists. When that cookie is absent it redirects to `/login`; when it exists it allows the request to continue. This is a presence check, not frontend validation of the token's contents, identity, or authorization level.

`AuthProvider`, which wraps the entire root layout, supplies `user`, `isLoading`, and `logout` to client components. On every pathname change except `/login`, it requests `/api/auth/me` with included credentials. A successful response installs `data.data.user`; a non-OK response or request failure clears the user and performs a client-side replacement to `/login`. The mounted flag prevents this asynchronous check from setting state after the provider has unmounted.

The two layers therefore serve different purposes: middleware redirects a request lacking the cookie, and the client provider verifies the current session response for the rendered application. The code in this repository does not show permission/role enforcement for individual feature routes.

## Login and logout lifecycle

The login page is a client component. It posts email and password JSON to `/api/auth/login` with included credentials, displays the response message on failure, and navigates to `/` followed by `router.refresh()` when the request succeeds. The root redirect then takes the user to the product catalog. If the session provider already has a user while the login page is rendered, the page redirects away and renders nothing.

`logout` posts to `/api/auth/logout`, but clears local user state in `finally` even when the network request fails. It does not itself navigate; navigation after a logout is handled by the consumer or by the next session/route check.

## Authenticated module shell

The `(modulos)` layout nests `SucursalProvider` inside the global authentication provider and then renders `AppShell`. This scopes branch data to module pages while keeping authentication available to both the login page and the module shell.

`AppShell` waits on the auth provider, showing a loading spinner while `isLoading` is true and rendering no protected content if `user` is absent. With a user present it renders the sidebar, user menu, and a main content area. Its sidebar open state is local UI state; opening it also renders a button overlay that closes it.

The sidebar is the functional route map: products, branch stock, operations, financial accounts, price lists, and replenishment orders. It derives active state from the pathname, including descendant routes, and closes itself after a navigation click.

## Practical implications

- Put module pages below `src/app/(modulos)` when they need the standard shell and branch context.
- Use `useAuth` only under `AuthProvider`; it intentionally throws if the provider is missing.
- Keep request/session error behavior consistent with the API boundary page: an unauthorized feature request redirects through `apiFetch`, while direct auth calls in the provider and login page own their local flows.
- Do not infer access control from navigation visibility. The frontend's visible route guard only observes cookie presence; server-side authorization must remain authoritative.
