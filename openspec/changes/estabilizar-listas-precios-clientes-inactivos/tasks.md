# Tasks

Entrada para el agente implementador: leer primero [design.md](design.md), que incluye causa, archivos y evidencia, y [specs/ciclo-listas-precios/spec.md](specs/ciclo-listas-precios/spec.md). Las tareas marcadas cuentan con evidencia automatizada; las pendientes requieren cobertura adicional o validación integrada. Mantener sin cambios el contrato backend y las reglas monetarias; no basta con ocultar el botón de lista.

## 1. Contener el circuito del cliente inactivo y del recurso no disponible

- [x] 1.1 Crear regresiones de integración de `ClienteForm` con `useClienteDetalle` y Descuentos: cliente inactivo por URL directa y cliente activo cuya lista devuelve 404 mientras el detalle sigue disponible. Verificar que los tests detectan el código actual, con límite explícito de requests/eventos para no colgar la suite.
- [x] 1.2 Propagar `clienteActivo` desde `ClienteForm` a pestaña/modal y separar esa condición de su visibilidad. Gatar también `useCotizacionSucursal` y deshabilitar/cerrar la lista al quedar inactivo; verificar cero requests de precios/cotización de lista, descuentos conservados y habilitación después de reactivar.
- [x] 1.3 Sustituir la emisión global de `RECURSO_NO_DISPONIBLE` desde carga y revalidación de lista por un callback local y una comprobación silenciosa acotada en la ficha. Verificar un único intento de lista, como máximo una comprobación y cero eventos globales por 404 aunque el detalle devuelva el mismo cliente.
- [x] 1.4 Resolver los resultados de esa comprobación: cliente inactivo, asociación retirada, detalle inaccesible o error de transporte. Verificar que no se conserva una descarga habilitada, que el 404 confirmado retira también descuentos/acciones y que una comprobación fallida termina con error recuperable sin remonte en ciclo.
- [ ] 1.5 Conservar la integración de `403 SUCURSAL_FUERA_DE_ALCANCE` de `apiFetch` con el contexto. Verificar con una regresión que retira el PDV revocado, cancela exportación y estabiliza los contadores sin volver a consultar indefinidamente ese PDV.

## 2. Estabilizar las cargas y los errores de Descuentos

- [x] 2.1 Desacoplar `recargar` y su efecto de la referencia del array `sucursales` en `useListaPreciosCliente`, conservando comprobaciones de alcance actualizadas. Verificar con `renderHook` que arrays equivalentes, búsquedas y filtros locales no agregan requests, y que un cambio real de cliente o PDV sí invalida/carga.
- [ ] 2.2 Coordinar carga inicial y revisión de cotización, pausar el consumidor de pestaña mientras el modal está abierto y descartar respuestas tras ocultar/cerrar. Verificar una carga lógica por consumidor habilitado, sin cálculo duplicado por la primera revisión, y actualización efectiva por foco/evento monetario.
- [x] 2.3 Preservar `status`, `code` y mensaje HTTP en `cliente-descuento.client.ts` reutilizando los helpers existentes, y agregar estado de carga/error/reintento del resumen en `ClienteDescuentos`. Verificar 404, red y 500 con tests de API/componente, sin «Cargando» perpetuo ni acciones de un resumen fallido.
- [ ] 2.4 Mostrar errores de lista y el motivo comercial de inactividad sin ocultar descuentos autorizados. Adaptar `RegionSelector`, `DescuentoCategoriaEditor` y `DescuentoProductoEditor` para no presentar simulaciones ni conteos falsos en ausencia de precios; verificar que los porcentajes siguen administrables y la UI explica la falta del cálculo.
- [ ] 2.5 Implementar recuperación manual con exclusión de intentos concurrentes y descarte por generación. Verificar un intento adicional por clic, ausencia de crecimiento al avanzar timers/flush de promesas y que errores tardíos de A o del primer A de A→B→A no publican estado ni disparan recuperación.

## 3. Publicar únicamente listas generales completas

- [x] 3.1 Agregar pruebas de `useListaPrecios`/`ListaPreciosCatalogo` para stock exitoso con precios pendientes/fallidos, cálculo vacío o incompleto, regiones fallidas/vacías y contexto incompatible. Verificar que detectan las filas/exportaciones habilitadas incorrectamente en el código actual.
- [x] 3.2 Incorporar estados de carga, éxito y error de precios/regiones vinculados a la selección y un predicado compartido de lista preparada. Verificar que solo se muestran precios finales con stock/cálculo/contexto compatibles y que una lista realmente vacía muestra el estado vacío.
- [x] 3.3 Eliminar la sustitución de cálculos ausentes por precio base/descuento cero en la vista general y sus valores de ordenación. Verificar que los fallos no presentan un precio base como final y que los valores nulos explícitos del backend conservan su representación monetaria.
- [ ] 3.4 Diferenciar error de regiones de respuesta exitosa sin regiones; exponer un reintento que recupere las fuentes necesarias. Verificar que el error no calcula silenciosamente sin región, que `[]` exitoso sí permite la lista general y que la selección de otra sucursal no usa regiones anteriores.
- [x] 3.5 Estabilizar dependencias del stock y acotar la recuperación de snapshot incompatible a un intento por transición monetaria completa. Verificar arrays equivalentes sin requests, discrepancia persistente con error final/reintento manual y cambios PDV/región con descarte de respuestas anteriores.

## 4. Proteger PDF y Excel durante toda la operación

- [ ] 4.1 Usar la misma condición de disponibilidad en botones y handlers de ambos consumidores. Agregar tests que espían los generadores y verificar cero archivos para cliente inactivo, cálculo pendiente/fallido, selección inválida, contexto ausente o mapa incompleto, incluso si se invoca la confirmación directamente.
- [ ] 4.2 Asociar selector de columnas y acciones de `useExportacionCotizacion` a la generación/identidad del snapshot; invalidarlos al cambiar cliente/PDV/región, cerrar modal o perder acceso. Verificar cambios durante cada await y A→B→A con promesas controladas, sin ejecutar closures de una selección anterior.
- [ ] 4.3 Mantener revalidación autorizada antes de cada descarga y las opciones de conservar snapshot válido o actualizar y regenerar. Verificar PDF/Excel con revocación posterior a abrir el diálogo, cotización nueva, filtros/columnas/región correctos y actualización con stock/precios compatibles.

## 5. Validación integrada y entrega de la implementación

- [x] 5.1 Ejecutar `npm.cmd test -- --run`, `npm.cmd run lint` y `npm.cmd run build` desde el frontend. Registrar resultados y salida completa de fallos; verificar que las 19 pruebas de base citadas en el diseño continúan pasando y separar cualquier fallo previo o ambiental.
- [ ] 5.2 Validar en navegador con backend de prueba un cliente inactivo con descuentos y PDV activo, reactivación, baja desde otra sesión y pérdida de asociación/PDV. Verificar en Network que las consultas se estabilizan, que el inactivo no pide precios y que una revocación real retira datos y bloquea descargas.
- [ ] 5.3 Validar `/lista-precios` con latencia y fallos de stock/cálculo/regiones, selección de PDV/región y cambios de cotización. Verificar carga/error/vacío diferenciados y abrir PDF/Excel válidos para comprobar valores, filtros, columnas y región, sin archivos en estados incompletos.
- [ ] 5.4 Registrar en la entrega del agente qué se verificó con mocks y qué con backend/navegador, y ejecutar `openspec.cmd validate estabilizar-listas-precios-clientes-inactivos --strict --no-interactive`. Verificar que no se modificaron autenticación, contratos, fórmulas ni el change `limitar-acceso-por-pdv`; marcar tareas solo con evidencia ejecutada.

## Evidencia de validación

- `npm.cmd test -- --run`: 47 archivos y 303 pruebas pasaron, incluidas las regresiones con transporte simulado y las pruebas base.
- `npm.cmd exec -- tsc --noEmit --pretty false`: pasó.
- `npm.cmd run lint`: terminó con 79 errores y 13 advertencias en el repositorio. En los archivos modificados, los errores son reglas `react-hooks/set-state-in-effect` en efectos de hidratación ya existentes en `ClienteForm.tsx` (líneas 197 y 207) y en la carga inicial de `useClienteDetalle.ts` (línea 72); la pasada focalizada también muestra advertencias de referencias en limpiezas de efectos. El archivo de prueba agregado para `useListaPreciosCliente` pasa ESLint.
- `npm.cmd run build`: no pudo descargar Geist y Geist Mono de Google Fonts desde `src/app/layout.tsx` por falta de conexión de red.
- No había servicios escuchando en los puertos de frontend/backend comprobados (3000, 3001, 4000 y 5432), así que no se ejecutaron escenarios reales en navegador o backend.
- `openspec.cmd validate ... --strict --no-interactive` no pudo ejecutarse porque `openspec.cmd` no está instalado/disponible en este entorno.
- La verificación automatizada es con mocks; no altera contratos HTTP, backend, autenticación ni reglas monetarias.
