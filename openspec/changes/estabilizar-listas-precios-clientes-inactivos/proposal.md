# Proposal

## Why

Abrir Descuentos de un cliente inactivo dispara una consulta de precios que el backend rechaza; el frontend convierte ese rechazo en una recarga global que vuelve a montar la consulta. Además, la lista general puede mostrar precios base como finales mientras el cálculo está pendiente o falló, por lo que hace falta definir un ciclo de carga, error y exportación consistente.

## What Changes

- Distinguir el estado comercial del cliente de la visibilidad de la pestaña o del modal. Un cliente inactivo conserva sus descuentos administrables, pero no solicita ni exporta su lista operativa de precios.
- Tratar `404 RECURSO_NO_DISPONIBLE` como indisponibilidad del recurso consultado, sin asumir una revocación global de PDV. Conservar el tratamiento central de `403 SUCURSAL_FUERA_DE_ALCANCE` y acotar la recuperación para evitar ciclos.
- Disparar cargas por cambios funcionales de cliente, PDV, región o cotización y acciones explícitas; evitar consultas causadas solo por nuevas referencias de arrays equivalentes.
- Mostrar estados diferenciados de carga, error, vacío, cliente inactivo y pérdida de acceso. Los descuentos configurados no dependen del éxito de la simulación de precios.
- Mostrar y exportar precios finales de la lista general únicamente cuando stock, cálculo y contexto monetario correspondan a una misma selección vigente. No usar precios base para suplir un cálculo pendiente o fallido.
- Agregar regresiones que cuenten requests/eventos y verifiquen las descargas ante errores, cambios de selección y revocaciones.

## Capabilities

### New Capabilities

- `ciclo-listas-precios`: disponibilidad comercial, cargas acotadas, recuperación de errores y exportaciones coherentes de listas generales y de cliente.

### Modified Capabilities

Ninguna especificación consolidada: `openspec list --specs` no devuelve capacidades. Se deben preservar los contratos de alcance ya propuestos en [limitar-acceso-por-pdv](../limitar-acceso-por-pdv/proposal.md), especialmente `clientes-por-pdv` y `stock-y-listas-por-pdv`, sin modificarlos ni archivarlos en este trabajo.

## Impact

- Pantallas incluidas: detalle de Clientes, pestaña Descuentos, modal de lista del cliente y ruta `/lista-precios`, también al entrar por URL directa. Son accesos visibles desde el Sidebar actual.
- Código principal: `ClienteForm`, `ClienteDescuentos`, `useListaPreciosCliente`, `ClienteListaPreciosModal`, `TablaPreciosCliente`, `useListaPrecios` y `ListaPreciosCatalogo`. Revisar de forma acotada `cliente-descuento.client.ts`, `useClienteDetalle`, `useCotizacionSucursal` y la integración con `SucursalContext`/`apiFetch`.
- Mantener los endpoints y códigos existentes. El backend ya exige cliente activo para `GET /api/descuentos/lista-cliente` y permite administrar descuentos de un cliente accesible aunque esté inactivo. No se necesita modificar backend, SQL ni crear un change par.
- Mantener fórmulas, descuentos, márgenes, formatos PDF/Excel y política de conservar o actualizar un snapshot válido. La comprobación de autorización previa a descargar sigue siendo obligatoria.
- Excluidos: autenticación, cambios de permisos, productos/stock fuera de sus consumidores de listas, módulos ocultos de Operaciones, Cuentas financieras y Reposición, rediseños de catálogos y nuevas dependencias de fetching.
- Este change contiene solo planificación. El diagnóstico, la evidencia y el plan ejecutable están en [design.md](design.md); las tareas de implementación quedan pendientes en [tasks.md](tasks.md).
