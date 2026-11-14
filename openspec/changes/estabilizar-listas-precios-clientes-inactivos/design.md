# Design

## Context

Plan de implementación para otro agente. Revisión del 13 de noviembre de 2026; no se modificó código de aplicación. Ver [proposal.md](proposal.md) para alcance y [specs/ciclo-listas-precios/spec.md](specs/ciclo-listas-precios/spec.md) para aceptación.

### Causa del loop: circuito completo

1. `ClienteForm.tsx:818` pasa a `ClienteDescuentos` el ID y los PDV del cliente, pero no `cliente.activo`.
2. `ClienteDescuentos.tsx:39` llama `useListaPreciosCliente({ ..., activo: visible })`. Aquí `activo` significa pestaña visible, no cliente activo. Al abrir Descuentos se solicita la lista de un cliente inactivo.
3. `../casa-segura-backend/src/services/lista-precios.service.ts:26` exige `c.activo = TRUE`. Para el inactivo, `recursoNoDisponible()` produce `404 RECURSO_NO_DISPONIBLE`; el controlador preserva ese código.
4. `useListaPreciosCliente.ts:62` convierte ese 404 en el evento global `alcance-pdv-revocado`. El código no demuestra que se haya revocado un PDV: la misma respuesta cubre cliente inactivo, cliente no accesible o asociación inexistente.
5. `useClienteDetalle.ts` escucha el evento y ejecuta `fetchData()`, que pone `cliente=null` e `isLoading=true`. `ClienteForm.tsx:312` devuelve la pantalla de carga y desmonta `ClienteDescuentos`.
6. El detalle sí admite consultar un cliente inactivo accesible: `ClienteRepository.findById` no filtra `activo`. Cuando responde, el formulario vuelve a montar los descuentos, conservando su `activeTab='descuentos'`. El hook reinicia sus refs y repite desde el paso 2.
7. El evento también recarga `SucursalProvider` y las sucursales administrativas de `ClienteForm`, amplificando las requests. `SucursalContext` ya preserva la referencia del array si el contenido es igual; por eso el loop principal no debe atribuirse solamente a ese array.

El reintento de autenticación de `apiFetch` solo aplica a 401 y no explica este caso. `apiFetch` ya emite el evento de alcance para el código específico `403 SUCURSAL_FUERA_DE_ALCANCE`.

### Hallazgos adicionales

| Prioridad | Evidencia actual | Consecuencia |
| --- | --- | --- |
| P1 | `useListaPreciosCliente.ts:69` incluye el array completo `sucursales` en `recargar`; el efecto depende de esa función. `useListaPrecios.ts:144-145` repite el patrón para stock. | Un array nuevo con contenido equivalente inicia consultas adicionales. En el cliente se combina con las recargas del detalle. |
| P1 | `ClienteForm.tsx:640` ofrece «Ver lista de precios» también al inactivo; el modal usa `activo: isOpen`. | El modal abre otra entrada al mismo rechazo y circuito global; corregir solo la pestaña no alcanza. |
| P1 | `useListaPrecios.ts:147-185` carga precios sin estado propio de carga. El `isLoading` retornado solo cubre stock y resolución de regiones. `snapshotCompatible` es verdadero cuando no hay contexto calculado. | Con stock listo y cálculo pendiente o fallido, quedan filas visibles y `canExport` verdadero. |
| P1 | `ListaPreciosCatalogo.tsx` y `getValor` sustituyen un precio calculado ausente por `precioVentaArs`/`precioVentaUsd` y descuento 0. | La pantalla puede mostrar un precio base bajo el rótulo «Precio final». El banner afirma que se ocultaron datos, pero las filas continúan visibles. |
| P2 | `ClienteDescuentos` no renderiza `lista.error`. Si falla `obtenerDescuentos`, vuelve a `resumen=null` y muestra «Cargando descuentos…» permanentemente. | El usuario no distingue un error de un cálculo lento; los editores pueden interpretar la falta de items como cero productos afectados. |
| P2 | `cliente-descuento.client.ts` arroja `Error` genérico; `ClienteDescuentos` comprueba `instanceof CatalogoApiError`. | La rama específica de recurso no disponible no recibe los errores HTTP reales de ese cliente. |
| P2 | `useListaPreciosCliente` llama `useCotizacionSucursal(sucursalId)` aunque no esté habilitado. El mismo hook se monta en pestaña y modal. | La pestaña oculta o el cliente inactivo pueden consultar cotización; modal y pestaña visibles pueden duplicar cálculos. El primer incremento de `revision` también puede provocar otra carga finita. |
| P2 | El catch de regiones de `useListaPrecios` marca `regionesListas=true`, vacía la selección y habilita cálculo sin región. | Un fallo de regiones se confunde con la respuesta exitosa «sin regiones» y puede reducir los descuentos aplicados. |
| P2 | `ultimoReintentoSnapshot` limita una clave de versión de stock/lista, pero no ofrece un estado terminal claro ni incluye todo el contexto usado por `mismoContexto`. | Una discrepancia persistente puede seguir mostrando «actualizando» cuando ya no hay pedido. Se necesita recuperación manual visible. |

No se observó un mecanismo autónomo de reintento de 500 en `listaSucursal`. En la lista general se confirmaron estados incompletos y se identificó sensibilidad a referencias; no se afirma que todo fallo produzca el mismo loop del cliente.

### Evidencia ejecutada durante la revisión

Se ejecutaron sondas temporales en memoria con React, JSDOM y los hooks reales transpiliados desde TypeScript; las APIs se simularon y no se escribieron pruebas ni cambios de aplicación:

| Sonda | Resultado |
| --- | --- |
| `useClienteDetalle` + `useListaPreciosCliente`, detalle accesible e inactivo, precios con 404, cotización fija. Montaje condicional igual al formulario. | 6 cargas de detalle, 5 requests de precios fallidas y 5 eventos globales. Se cortó artificialmente en la sexta carga; el código no tiene una condición de corte equivalente. |
| Hook de cliente con error genérico, sin listeners globales y tres renders con arrays de sucursales equivalentes. | 4 requests: la inicial y una por cada nueva referencia. |
| Hook de lista general con stock exitoso y precios pendientes. | 1 fila, mapa de precios vacío, contexto nulo, `isLoading=false`, condición de exportación del componente verdadera. |
| Hook de lista general con stock exitoso y cálculo rechazado. | El mismo estado exportable, con error visible. Confirma habilitación incorrecta; no demuestra por sí solo una descarga consumada, porque hay revalidación previa. |

Pasaron 19 tests existentes en 5 archivos:

```powershell
npm.cmd test -- --run src/lib/hooks/useCotizacionSucursal.test.tsx src/lib/utils/exportacion-precios.test.ts src/lib/hooks/useExportacionCotizacion.test.tsx src/lib/apiFetch.test.ts src/context/SucursalContext.test.tsx
```

Estas pruebas no cubren hoy los hooks de lista ni la interacción de `ClienteForm` con Descuentos. No se verificó el incidente contra un backend real ni en el navegador, y no se ejecutaron build/lint en esta fase documental.

## Goals / Non-Goals

**Goals:** convertir cada intento en una operación acotada, separar disponibilidad comercial de visibilidad y publicar un conjunto coherente de stock/precios antes de mostrar precios finales o descargarlo. Mantener la retirada de datos ante pérdida real de acceso.

**Non-Goals:** no eliminar la revalidación previa a exportar, no aceptar clientes inactivos en el endpoint operativo, no modificar fórmulas ni autenticación y no introducir una librería de cache/fetching. No refactorizar todos los consumidores del evento global.

## Decisions

### 1. Separar cliente activo, visibilidad y disponibilidad de precios

En `ClienteForm` pasar explícitamente `clienteActivo` a los consumidores. Renombrar o documentar el parámetro `activo` del hook como habilitación de carga para evitar seguir confundiéndolo con el estado del cliente.

La habilitación resulta de: cliente activo + consumidor visible + ID de cliente válido + PDV seleccionado presente en la intersección autorizada de PDV activos. Pasar un ID nulo a `useCotizacionSucursal` cuando esa carga esté deshabilitada; no invocar hooks condicionalmente.

Mantener los descuentos configurados editables del cliente inactivo, conforme a los endpoints actuales y a `clientes-por-pdv`. Mostrar el aviso «El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios». Deshabilitar la acción del modal con explicación; si el estado cambia mientras está abierto, invalidar/cerrar la lista y sus diálogos. Los editores no deben mostrar simulaciones ni cantidades calculadas en cero cuando no hay lista.

Cuando se abre el modal, pausar la carga de precios de la pestaña subyacente. Preservar sus datos administrativos y evitar un cache global nuevo. El propósito es un solo consumidor de precios habilitado por ficha; al volver a la pestaña se admite una nueva carga explícita.

Alternativas descartadas: quitar `c.activo=TRUE` ampliaría el contrato comercial; ocultar toda la pestaña impediría administrar descuentos que el backend conserva; corregir solamente el botón dejaría abierto el loop de Descuentos.

### 2. Separar la indisponibilidad de la lista de la revocación de alcance

Conservar el evento global para el código explícito de `apiFetch`, `403 SUCURSAL_FUERA_DE_ALCANCE`. El hook de precios no debe emitirlo automáticamente por cada `404 RECURSO_NO_DISPONIBLE`, ni desde `recargar` ni desde `revalidarAcceso`.

Ante ese 404, bloquear y limpiar inmediatamente la lista; notificar a `ClienteForm` mediante un callback local con el par cliente/PDV y la generación del intento. Centralizar allí una sola comprobación del detalle/asociaciones por intento fallido. La comprobación debe ser silenciosa: agregar a `useClienteDetalle` una variante de revalidación que no ponga `cliente=null`/carga inicial antes de tener el resultado. El formulario conserva el bloqueo de la lista durante esa comprobación.

- Detalle aún accesible y mismo par activo: conservar descuentos autorizados y dejar la lista con error estable, sin recargarla al recibir otro objeto equivalente.
- Cliente ahora inactivo: aplicar la indisponibilidad comercial y conservar la administración autorizada.
- Asociación retirada: retirar ese par; solo seleccionar y cargar una alternativa si realmente existe en el nuevo contexto.
- Detalle 404: limpiar el cliente, descuentos y acciones mediante la ruta de recurso no disponible existente.
- Error de red/5xx en la comprobación: mantener precios bloqueados, mostrar fallo recuperable y permitir reintento manual. No afirmar revocación ni relanzar una cadena automática.

Registrar la comprobación antes de iniciarla y compartir la promesa si hay notificaciones concurrentes. Los errores atrasados de otra generación no deben comprobar ni invalidar el contexto actual. Un 5xx, fallo de red, `COTIZACION_REQUERIDA` o `REGION_NO_DISPONIBLE` no se convierte en revocación global.

En `cliente-descuento.client.ts` preservar mensaje, status y code con `errorCatalogo`/`respuestaApi` existentes, sin cambiar URLs ni payloads. El resumen debe resolver la pérdida confirmada de acceso por la misma frontera local; no introducir otro emisor de 404 global.

Alternativas descartadas: quitar todos los eventos perdería el refresco ante revocaciones reales; un debounce o backoff solo reduciría la frecuencia del circuito sin corregir su causa; una ref dentro del hijo no sobrevive a su desmontaje.

### 3. Efectos con dependencias funcionales y generaciones vigentes

En ambos hooks obtener primitivas como `sucursalId`, `sucursalValida`, `clienteId`, `clienteActivo` y `regionId`. Hacer depender las cargas de esas primitivas y de la revisión monetaria necesaria, no de la identidad de `sucursales` ni del objeto completo retornado por otro hook. Comprobar el alcance actualizado mediante datos/ref vigentes sin eliminar dependencias del linter.

Usar una generación de selección/intento para estado, respuestas y valores retornados a exportación. La identidad comprende cliente cuando aplique, PDV, región y snapshot monetario. Conservar el control por contador y descartar también el resultado devuelto por una solicitud superada; no basta con evitar `setState`. Una transición A→B→A no rehabilita el primer pedido de A.

Deshabilitar la carga o perder el par debe limpiar los datos visibles antes de poder confirmar una exportación. `AbortController` es opcional para ahorrar trabajo: la protección por generación sigue siendo necesaria.

No tomar el primer éxito de cotización como motivo para mantener dos cargas concurrentes: coordinar la carga inicial y la revisión de `useCotizacionSucursal`, preservando la actualización real por foco o `cotizacion-actualizada`. Cambiar búsqueda/filtros/orden/página sigue siendo local.

### 4. Estado explícito de precios y conjunto completo en la lista general

Conservar stock y lista calculada como fuentes distintas, porque el catálogo usa datos de stock que no contiene `ListaPreciosSucursal`. Agregar estado explícito para precios y regiones, con su clave de selección; evitar que `contexto=null` cuente como cálculo válido.

| Estado | Tabla de precios finales | Exportación | Recuperación |
| --- | --- | --- | --- |
| Sin PDV / deshabilitada | Vacía con motivo | Bloqueada | Seleccionar PDV o reactivar |
| Cargando stock, regiones o precios | Indicador de carga | Bloqueada | Esperar |
| Error de cualquiera de esas fuentes | Error; sin precios finales | Bloqueada | Reintento explícito |
| Respuesta completa sin productos | Vacío real | Bloqueada | Sin reintentos automáticos |
| Respuesta completa compatible | Filas calculadas | Habilitada | Revalidar antes de descargar |
| Incompatibilidad persistente | Error; sin precios finales | Bloqueada | Un intento automático y luego manual |

Definir un único predicado de lista preparada/`puedeExportar` compartido por tabla, botones y manejadores: PDV válido, regiones resueltas exitosamente, stock y precios exitosos para la misma selección, contexto válido/compatible y precio calculado para cada fila expuesta. Una respuesta vacía de cálculo es válida solo si las filas a mostrar también están vacías; si stock contiene productos sin cálculo, tratarlo como inconsistencia.

No usar `precio?.precioFinalArs ?? item.precioVentaArs` ni descuento 0 para suplir precios que faltan por una carga o error. Un precio final nulo explícitamente informado por el backend se representa como tal conforme al modelo monetario existente; no se inventa un precio local. Diferenciar respuesta de regiones `[]` exitosa de error: solamente la primera habilita cálculo sin región. Al cambiar PDV, no reutilizar selecciones de región de la carga anterior.

Exponer un reintento manual para la lista general que vuelva a resolver las fuentes fallidas, incluidas regiones, como un único intento de actualización. Deshabilitarlo mientras trabaja. La recuperación de incompatibilidad monetaria debe tener presupuesto de un intento por transición, incluyendo PDV, región y el contexto monetario completo comparado por `mismoContexto`; si sigue incompatible, terminar con error en vez de «actualizando» perpetuo.

Alternativas descartadas: bloquear solo el botón mantendría precios finales engañosos; ampliar únicamente `isLoading` sin un estado de éxito/error dejaría pasar mapas vacíos; sustituir todo por stock eliminaría los descuentos calculados por el servidor.

### 5. Errores visibles y exportación protegida hasta la confirmación

En `ClienteDescuentos` separar `cargandoResumen`, `errorResumen` y el resumen obtenido. Renderizar un error con reintento cuando falle; mostrar `lista.error` sin ocultar los descuentos que sí fueron autorizados. Revisar `RegionSelector`, `DescuentoCategoriaEditor` y `DescuentoProductoEditor` para que las simulaciones, «productos afectados» y confirmaciones dependientes de precios expliquen que no están disponibles. Conservar los porcentajes y sus escrituras autorizadas.

En `ClienteListaPreciosModal`/`ListaPreciosCatalogo`, validar el estado completo tanto en `disabled` como en el handler. Al abrir el selector de columnas capturar la identidad/generación del snapshot y verificarla nuevamente al confirmar y al resolver cada await. Invalidar diálogos pendientes ante cambio de cliente/PDV/región, cliente inactivo o pérdida de acceso. Cerrar y reabrir el modal no debe ejecutar closures antiguos.

Mantener `useExportacionCotizacion` y la revalidación autorizada existente. «Conservar vista anterior» solo admite un snapshot previamente completo y autorizado del mismo par y región; nunca recupera un mapa incompleto por un error. «Actualizar y regenerar» debe obtener stock/precios completos y compatibles, y rechazar resultados superados aunque coincidan los IDs después de A→B→A.

### 6. Pruebas de regresión y criterios de cierre

Agregar tests de hooks con promesas controladas y tests de integración de componentes con providers reales y transporte simulado. La regresión principal debe montar `ClienteForm` + `useClienteDetalle` + Descuentos; un test aislado del hook no reproduce su desmontaje por el evento global.

| Grupo | Cobertura mínima |
| --- | --- |
| Cliente inactivo | URL directa, abrir Descuentos y acción de lista: cero `listaCliente` y cero cotización de esa lista; descuentos visibles; sin simulaciones falsas. Reactivar habilita precios conservando descuentos. |
| Circuito 404 | Backend simulado rechaza lista y admite detalle; un intento y a lo sumo una comprobación local; 0 eventos globales de 404. Flush de promesas y avance de timers sin crecimiento de contadores. |
| Errores | Red, 500, `COTIZACION_REQUERIDA`, `REGION_NO_DISPONIBLE`, resumen fallido y reintento manual; sin spinner perpetuo ni ciclos. |
| Alcance | 403 real, detalle 404 y asociación eliminada: datos/acciones retirados; sin consultas repetidas al par revocado; nueva alternativa solo si autorizada. |
| Estabilidad | Arrays equivalentes, búsqueda, orden, filtros y página: contadores estables. Cliente/PDV/región nuevos: una carga lógica; Strict Mode sin efectos sostenidos ni conteos globales duplicados. |
| Lista general | Stock rápido/precios lentos, precios fallidos, regiones fallidas vs vacías, lista vacía y mapa incompleto: disponibilidad y botones coherentes. |
| Concurrencia | Cambios A→B y A→B→A, cierre de modal y errores tardíos: no publican ni exportan resultados obsoletos. |
| Cotización | ARS sin dólar, USD sin cotización, cambio por foco/evento, versiones incompatibles: comportamiento monetario conservado y recuperación acotada. |
| Descargas | PDF/Excel sin generación en estados inválidos; revocación durante diálogo o await; conservar snapshot válido y actualizar; filtros/columnas/región correctos. |

Reutilizar Vitest/Testing Library existentes. En tests de reintentos, hacer fallar cualquier solicitud inesperada o imponer un límite con fallo explícito; no dejar que una prueba reproduzca el loop sin límite. Los 19 tests de base deben seguir pasando. Antes de entregar la implementación ejecutar suite, lint y build; reportar por separado fallos previos o del entorno con su salida completa.

## Risks / Trade-offs

- [Revalidar silenciosamente conserva por un intervalo el detalle administrativo anterior] → bloquear precios inmediatamente; ante 404 de detalle retirar también descuentos y acciones; no autorizar escrituras ni descargas por cache.
- [Un 404 no distingue inactividad y pérdida de relación] → una comprobación local acotada resuelve el estado sin ampliar el contrato HTTP ni revelar datos del servidor.
- [La política estricta reduce disponibilidad durante un error parcial] → mensaje específico y recuperación manual; evita mostrar como final un precio sin los descuentos esperados.
- [Modificar un hook compartido de cotización/exportación puede afectar Stock y Productos] → preferir la habilitación por ID nulo y las guardas en consumidores; si se requiere un cambio compartido, ejecutar sus pruebas existentes y verificar esos consumidores.
- [El agente podría limitarse a ocultar el botón o a memoizar un array] → la aceptación exige corregir el evento/remontaje y probar fallos con cliente todavía accesible, además del caso inactivo.

## Migration Plan

1. Implementar en el frontend siguiendo [tasks.md](tasks.md), primero la contención del cliente y después la coherencia general. No hay migraciones, nuevas dependencias ni cambios backend previstos.
2. Ejecutar las regresiones automatizadas y validar este change con OpenSpec. No marcar tareas hasta ejecutar y verificar su comportamiento.
3. En un entorno de prueba, usar un cliente accesible e inactivo con PDV activo y descuentos; verificar en Network la ausencia de consultas de precios al abrir Descuentos. Activarlo, consultar, desactivarlo desde otra sesión y volver a consultar/exportar. Simular fallo de cálculo/regiones y latencia en `/lista-precios`, contando solicitudes y verificando los archivos.
4. Verificar pérdida real de asociación/PDV desde otra sesión, filtros y cotización. Separar la evidencia real de los mocks antes de dar por resuelto el incidente.
5. El despliegue usa el procedimiento habitual del repositorio; no forma parte de esta planificación. El rollback revierte solo el cambio de frontend y no requiere rollback de datos, aunque reintroduce el incidente original.
