---
type: workflow
title: Operations and Financial Accounts Workflow
description: Creation, inspection, allocation, and account-history flows for purchases, sales, transfers, and financial movements.
tags: [operations, finance, inventory, accounts]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:38:11.524Z
sources:
  - id: openwiki-source-4b9c6e2865cda4fbbe9b1aa6
    resource: repo://src/app/(modulos)/cuentas-financieras/_components/CuentaDetalle/CuentaDetalle.tsx
  - id: openwiki-source-934e409050fec05ce870a185
    resource: repo://src/app/(modulos)/cuentas-financieras/_components/CuentaFinancieraForm/CuentaFinancieraForm.tsx
  - id: openwiki-source-f5051730123cba326d60112d
    resource: repo://src/app/(modulos)/operaciones/_components/NuevaOperacionModal/NuevaOperacionModal.tsx
  - id: openwiki-source-61aa4ff1cb3aec117a33fd59
    resource: repo://src/app/(modulos)/operaciones/_components/OperacionForm/CuentasEditor.tsx
  - id: openwiki-source-543aa01bccc1cc5b2b9a5a8f
    resource: repo://src/app/(modulos)/operaciones/_components/OperacionForm/ItemsEditor.tsx
  - id: openwiki-source-9533a782c7c1242df7d55c93
    resource: repo://src/app/(modulos)/operaciones/_components/OperacionForm/MovimientoForm.tsx
  - id: openwiki-source-d4c2e76448cffbd9b58e767b
    resource: repo://src/app/(modulos)/operaciones/_components/OperacionForm/TrasladoForm.tsx
  - id: openwiki-source-288fe53b6241600696155a8a
    resource: repo://src/app/(modulos)/operaciones/_hooks/useOperacionCrear.ts
  - id: openwiki-source-5a5903a74511a98c2cbc2e7b
    resource: repo://src/lib/types/OperacionCrear.ts
generated: { by: "codex", at: "2026-09-05T04:38:11.524Z" }
---

# Operations and Financial Accounts Workflow

The operations area records four kinds of events: purchase, sale, branch transfer, and financial movement. It composes branch selection, inventory item selection where relevant, financial-account allocation, and a typed input that the operations API client serializes. Financial accounts provide the balance and movement-history views that link back to an operation.

## Choosing and creating an operation

The operations catalog is the entry page. Its new-operation modal links to one route per type: `/operaciones/nuevo/compra`, `/venta`, `/traslado`, and `/movimiento`. Each form uses `useOperacionCrear`, which tracks submission/error state, calls `operacionesClient.crear`, and navigates to the created operation's detail route on success.

`OperacionCrearInput` is a discriminated union. Every variant supplies an origin branch, optional date/allocation mode, and account entries. Purchase, sale, and transfer variants also have item lines; purchase adds supplier/document/totals, sale adds receipt/discount/totals, transfer adds destination branch and freight, and movement adds its ingreso/egreso type and optional description. `operacionesClient` translates this model to the transport body's snake_case keys and variant-specific nested object; see the API boundary page for that serialization.

## Items: branch inventory is the source

`ItemsEditor` does not load a global product list. After an origin branch is selected, it requests up to 200 stock rows for that `sucursalId` and stores each item by its `productoSucursalId`. The selector shows product code/name and currently available quantity. Purchase lines collect ARS unit cost; sale lines collect ARS unit price; transfers use the shared product/quantity controls.

For sales, the editor calculates a minimum price from the selected stock row's replenishment cost and minimum margin. A line below this threshold (with a small tolerance) reports a violation to the sale form, which prevents submission. This is client-side guardrail behavior; actual inventory, pricing, and transaction enforcement are outside this repository.

## Financial account allocation

`CuentasEditor` loads financial accounts and each account's configured extra percentage. It supports two modes:

- In percentage mode, an account's base is the operation base multiplied by its percentage, and its charged amount includes the account extra percentage.
- In amount mode, the entered amount already includes the charge; the editor derives the base by dividing by `1 + extra / 100`.

For an operation with a pre-existing base, allocation is invalid when a row lacks an account, percentages do not sum to 100 within `0.01`, or the derived bases do not cover the base within that same tolerance. The editor reports validity back to the parent form. Changing modes replaces the previous mode's numeric field values with zeroed values, avoiding a mix of stale percentage and amount inputs.

Purchase computes its ARS total from item quantity × unit cost and requires a branch, supplier, at least one item, at least one account, and a valid allocation. Sale computes its subtotal from unit prices and quantities and passes discount plus the pre-charge allocation base; it also requires a valid allocation and non-violating sale margins. A transfer requires distinct origin and destination branches and items; it only requires accounts/allocation when freight is positive. A financial movement has no item editor and uses amount allocation with `derivarTotalDeCuentas`, so its client input omits `montoArs` and relies on the operation contract to derive it from the accounts.

## Account screens and relationships

The financial-account catalog presents each account's initial/current balance and extra percentage, with client-side search and sorting. Its detail view loads the account plus movement history. Movement rows use the shared sign helper for outgoing types and link to `/operaciones/<operacionId>` when an operation ID is present. Account create/update sends name, initial balance, and extra percentage through `cuentaFinancieraClient`; the form displays current balance as an informational value in edit mode.

The link is therefore explicit in the UI: operation creation assigns account entries, and account history can lead readers back to the associated operation. Do not assume the precise balance-update, stock-update, or allocation persistence rules from this client code alone.
