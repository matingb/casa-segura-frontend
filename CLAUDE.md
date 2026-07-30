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

## TAREA ACTUAL: maquetar pantallas SIN lógica funcional

Estoy maquetando las pantallas del ERP. Necesito la UI construida y navegable,
pero **sin lógica funcional todavía**. Reglas estrictas:

### SÍ hacer
- Construir las pantallas con componentes React + CSS Modules.
- Usar **datos mockeados** importados desde `src/lib/mocks/` (un archivo por
  entidad, ej. `mocks/productos.ts`, `mocks/operaciones.ts`).
- Tipar los mocks con interfaces TypeScript que reflejen el modelo de datos
  (estas interfaces sirven como contrato para la implementación real).
- Botones y acciones presentes visualmente, pero sin efecto real
  (pueden hacer `console.log` o abrir modales estáticos).
- Mantener el estilo visual consistente entre todas las pantallas.

### NO hacer
- NO conectar a Supabase ni a ninguna base de datos.
- NO escribir llamadas `fetch` reales ni consumir `src/lib/api.ts`.
- NO implementar validaciones de formularios ni lógica de negocio.
- NO usar Tailwind, Material UI, ni ninguna librería de estilos.
  **Solo CSS Modules.**
- NO tocar la lógica de autenticación existente
  (`src/context/AuthContext.tsx`, `src/middleware.ts`, `src/app/login`).
  Las pantallas nuevas asumen que el usuario YA está autenticado.

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
mostrame lo hecho y esperá mi confirmación. No generes todas las pantallas
de una sola vez.

**Primer paso**: armá (1) el layout general con el sidebar y (2) los
componentes UI base reutilizables, y (3) una sola pantalla de ejemplo
(listado de productos) como referencia de estilo. Pará ahí y mostrámelo
antes de seguir.
