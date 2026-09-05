---
type: workflow
title: Catalog and Branch Inventory Workflow
description: Product definition, classification, and the branch-specific stock records that provide prices, quantities, and availability in Casa Segura.
tags: [catalog, inventory, branches, products]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-d83d08edef73df38dbdd6f7e
    resource: repo://src/app/(modulos)/productos/_components/ProductoForm.tsx
  - id: openwiki-source-252373ced52f2e1beb7e2a6a
    resource: repo://src/app/(modulos)/productos/_components/ProductosCatalogo/ProductosCatalogo.tsx
  - id: openwiki-source-1e7ec9d451f2c34e90a89779
    resource: repo://src/app/(modulos)/productos/page.tsx
  - id: openwiki-source-3352de53484f0071e30319c5
    resource: repo://src/app/(modulos)/stock/_components/StockCatalogo/StockCatalogo.tsx
  - id: openwiki-source-e024df14539bcfbee6dba475
    resource: repo://src/app/(modulos)/stock/_components/StockForm.tsx
  - id: openwiki-source-9009166cd7b93804ad527240
    resource: repo://src/app/(modulos)/stock/page.tsx
  - id: openwiki-source-2396db2431fa89269cad54e7
    resource: repo://src/context/SucursalContext.tsx
  - id: openwiki-source-4d57e40e1c87baa59cf0029c
    resource: repo://src/lib/types/Stock.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Catalog and Branch Inventory Workflow

The product catalog and stock catalog are separate routes because they own different records. A product is the shared catalog definition; a stock row is the branch-specific `producto_sucursal` record that joins product information with branch, price, and quantity data.

## Entry points and lists

`/productos` renders `ProductosCatalogo`; `/stock` renders `StockCatalogo`. Both use the reusable paginated catalog hook with full-text search, multi-column sorting, page navigation, and field-specific filter options. The product table filters on brand, model, subtype, and state. The stock table adds branch as a filter and derives the availability warning from `cantidadDisponible - cantidadReservada`: a non-positive net quantity is danger, while a positive quantity at or below the minimum is a warning.

Rows navigate to detail pages and provide explicit edit actions; the list headers create `/productos/nuevo` and `/stock/nuevo` respectively. Classification names are resolved client-side by `useClasificacion` rather than being embedded into the product transport model.

## Classification and branches

The classification client loads types and subtypes separately from `/api/tipos` and `/api/subtipos`, normalizing `tipo_id` to `tipoId`. `useClasificacion` fetches both lists in parallel and offers type/subtype lookup helpers for forms and tables.

`SucursalProvider` is available to module routes. It loads the user's visible branches through `sucursalClient.obtenerTodas`, exposes the raw array and a reload function, and derives selector options with an empty `Todas las sucursales` option followed by each branch ID and name. The stock form uses the branch list when creating a new stock record.

## Product form

The product form works for creation, editing, and read-only detail presentation. It uses the product-detail hook when given an ID, and it uses classification data to derive the selected type from a product's subtype and restrict available subtype options to that type.

On save, the form turns browser fields and local image/QR/unit state into an API-shaped body: product properties, `subtipo_id`, dimensions and units, active status, image URL, base and replenishment costs, and QR code. It calls `productoClient.crear` for a new product or `productoClient.actualizar` for an existing one, then returns to `/productos`. In edit mode it compares a serialized form snapshot to disable saving until a change is made.

## Stock form and invariants

The stock form also supports create, edit, and read-only states. New records first fetch products for the combobox; choosing a product pre-fills its base replenishment cost and base ARS price. The form then combines that selected product ID with a selected branch ID when it creates the record. Existing records are updated by the stock row ID, not by product ID.

The form validates its commercial inputs before submission. Cost, ARS sale price, and minimum margin must be finite non-negative numbers when supplied. When cost is positive and a margin is supplied, the ARS sale price may not fall below `cost * (1 + margin / 100)`; the submit button is disabled and the handler returns early when this rule fails.

Creation sends product/branch identity, prices, tax, minimum margin, minimum stock, and enabled state. Update additionally sends available and reserved quantities. Both paths delegate to `stockClient` and return to `/stock` on success. An API failure is retained as inline form feedback.

## Relationship to operations and replenishment

Product and branch-stock data are upstream of both workflows. Operations reference `productoSucursalId` for item lines, and a replenishment request identifies a `productoSucursalId` plus provider and quantity. Treat the stock row ID as the handoff identity whenever extending those feature flows.
