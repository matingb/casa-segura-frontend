# Casa Segura — Frontend (ERP de gestión de stock)

## Qué es este proyecto

ERP multi-sucursal para una empresa que vende dispositivos de seguridad, pensado
para venderse luego a otras empresas (arquitectura multi-tenant). Esta es la
**Iteración 1: Gestión Interna de Stock**.

El alcance funcional completo está en `/docs/CasaSegura_Iteracion_1.pdf`.
El modelo de datos está en `/docs/der_casa_segura.mmd` (diagrama entidad-relación).
La documentación de entidades está en `/docs/CasaSegura_ModeloDatos.docx`.

## Stack

- **Next.js** con App Router (`src/app`).
- **TypeScript**.
- **CSS Modules** para estilos (archivos `.module.css` junto a cada componente).
- **Supabase** se usará SOLO como base de datos (Postgres). No se usa su SDK.
- El backend/API se consume vía `src/lib/api.ts`.

## TAREA ACTUAL: integración real con el backend

La etapa de maquetado con mocks terminó. Los módulos ya maquetados (Productos,
Stock, Operaciones, Cuentas Financieras, Lista de Precios) se están
conectando al backend real en paralelo, módulo por módulo. Reglas:

### SÍ hacer
- Reemplazar los datos mockeados por llamadas reales a la API a través de
  `src/lib/api.ts` (o los clients específicos en `src/lib/api/*.client.ts`,
  siguiendo el patrón ya usado por `sucursal.client.ts` y `stock.client.ts`).
- Usar `apiFetch` (`src/lib/apiFetch.ts`) para requests desde cliente, que
  ya maneja `credentials: 'include'` y redirección a `/login` en 401.
- Implementar validaciones de formularios y lógica de negocio reales a
  medida que se conecta cada pantalla.
- Ir retirando los archivos de `src/lib/mocks/` que queden sin uso una vez
  que el módulo correspondiente esté completamente integrado.
- Mantener el estilo visual y los componentes base ya construidos.

### NO hacer
- NO usar Tailwind, Material UI, ni ninguna librería de estilos.
  **Solo CSS Modules.**
- NO tocar la lógica de autenticación existente
  (`src/context/AuthContext.tsx`, `src/middleware.ts`, `src/app/login`)
  salvo que se indique explícitamente.
- NO conectar módulos que todavía no fueron maquetados (ej. Pedidos de
  Reposición) — esos siguen el flujo original: primero maqueta con mocks,
  después se integra.

## Convenciones de código

- Cada componente/pantalla con su `.module.css` al lado.
- Nombres de archivos y componentes en el idioma que ya usa el repo.
- Reutilizar componentes base (botones, inputs, tablas, cards) en vez de
  repetir markup. Si no existe un componente base necesario, crearlo primero
  en `src/components/`.
- Si hay design tokens o estilos compartidos en `src/app/styles.ts`, usarlos.

## Módulos a maquetar (según el alcance de la Iteración 1)

1. Layout general con sidebar de navegación entre módulos.
2. Productos (listado + alta/edición).
3. Stock por sucursal (visualización, indicador de stock bajo mínimo,
   corrección manual).
4. Operaciones: compra, venta, traslado, movimiento financiero.
5. Cuentas financieras + estado financiero (ingresos, egresos, balance).
6. Lista de precios (generación de PDF — solo la pantalla, sin el PDF real).
7. Pedidos de reposición.

## Flujo de trabajo que espero

Trabajá **de a un módulo por vez**. Antes de avanzar al siguiente módulo,
mostrame lo hecho (o probá el flujo end-to-end contra el backend real) y
esperá mi confirmación. No integres todos los módulos de una sola vez.
