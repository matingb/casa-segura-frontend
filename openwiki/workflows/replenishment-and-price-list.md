---
type: workflow
title: Replenishment and Price List Workflow
description: Branch-specific replenishment requests and the client-generated, filterable price-list exports built from active stock rows.
tags: [replenishment, price-list, exports, inventory]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-6d14800671c9459d75ef49fc
    resource: repo://src/app/(modulos)/lista-precios/_components/ExportExcelModal/ExportExcelModal.tsx
  - id: openwiki-source-f45184b9f18d5708665e994f
    resource: repo://src/app/(modulos)/lista-precios/_components/ListaPreciosCatalogo/ListaPreciosCatalogo.tsx
  - id: openwiki-source-6fb7357370a4721a82789c6d
    resource: repo://src/app/(modulos)/lista-precios/_hooks/useListaPrecios.ts
  - id: openwiki-source-d132977e23757f6f907c29da
    resource: repo://src/app/(modulos)/lista-precios/_lib/exportColumns.ts
  - id: openwiki-source-34723c717c4083c0bc7249a3
    resource: repo://src/app/(modulos)/lista-precios/_lib/exportExcel.ts
  - id: openwiki-source-4d349cf9c4898bbefd894dcb
    resource: repo://src/app/(modulos)/lista-precios/_lib/exportPdf.ts
  - id: openwiki-source-d2bf5af5adc645c7bf70ad64
    resource: repo://src/app/(modulos)/pedidos-reposicion/_components/PedidoReposicionForm.tsx
  - id: openwiki-source-79a478e17b6314b703af2c4d
    resource: repo://src/app/(modulos)/pedidos-reposicion/_components/PedidosReposicionCatalogo/PedidosReposicionCatalogo.tsx
  - id: openwiki-source-834863de51533b8fd24a2e7d
    resource: repo://src/lib/api/pedido-reposicion.client.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Replenishment and Price List Workflow

Both features start with branch-specific stock but serve different needs. Replenishment creates a request for one product-at-branch and supplier; the price list presents enabled stock at one branch and can generate local Excel or PDF output from the filtered result.

## Replenishment requests

The replenishment catalog uses `useCatalogoPaginado` with select filters for branch, supplier, and status, plus a text `usuario` filter. Its search field is mapped to the product filter. It renders a status badge based on the returned status string, but this frontend code does not expose status-transition actions.

The new-request form loads providers once. Selecting a branch clears the current product selection and loads up to 200 stock rows for that branch; the product combobox identifies each choice by the stock row ID and displays its available quantity. Submission is allowed only with a product-sucursal ID, provider ID, and strictly positive quantity. The form calls `pedidoReposicionClient.crear`, then returns to the catalog; a failed request remains as local error feedback.

The client serializes the create input to `producto_sucursal_id`, `proveedor_id`, and `cantidad`. Its response mapper brings back request identity along with product, branch, supplier, user, status, and date display fields. This establishes that a replenishment request is tied to a branch stock record rather than merely to a global product.

## Branch price list

`useListaPrecios` retrieves all stock rows once and then applies price-list selection in memory. When branches have loaded and no branch filter is set, it selects the first branch. The visible source set is limited to rows whose `sucursalId` equals the selected branch and whose `activo` flag is true.

From that source set, the hook derives branch, brand, model, and subtype filter options; applies case-insensitive code/name search and the selected filters; performs ordered client-side sorting; and slices the result into ten-row pages. Consequently, the table and both export actions use the complete filtered `items` set, rather than only the current page.

The price-list UI requires a selected branch and at least one enabled item before enabling export. It displays product fields, resolved subtype, ARS/USD sale prices, and IVA. Current export-column definitions cover catalog, branch, status, pricing, tax, margin, and quantity fields; no QR field is included in the price-list export-column registry.

## Exports

Excel export first opens a modal whose selected columns default to the configured default keys; the user can select all, select none, or toggle individual columns, and cannot confirm an empty selection. The export function selects those definitions, converts each filtered item to a row using the column getters, creates an `xlsx` workbook/sheet, and writes it to a client-selected file name.

PDF export builds an A4 portrait `jsPDF` document with the branch name and generated date, then adds a table containing code, product/brand/model, subtype, ARS price, USD price, and IVA. It writes the total-page footer before saving the client-generated document. Neither path calls a server-side export endpoint.

## Extension seams

Add a new list export field in `exportColumns.ts`; the Excel column selector will pick it up automatically, while the PDF layout must be changed independently. If a new branch-level selection rule is needed, change the source-set/filter logic in `useListaPrecios` so table display and exports remain consistent. For replenishment, preserve `productoSucursalId` as the identity passed through form and API client.
