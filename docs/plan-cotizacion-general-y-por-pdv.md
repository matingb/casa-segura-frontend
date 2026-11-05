# Plan de implementación: cotización general con excepción por PDV

Fecha: 4 de noviembre de 2026, America/Buenos_Aires.

Estado: propuesta de implementación basada en inspección estática de frontend, backend y migraciones. No se implementaron cambios funcionales ni se consultaron datos de producción.

Base revisada: frontend `dev`, commit `831f82e`; backend `main`, commit `14441f6`, con cambios locales preexistentes en configuración y una skill que quedan fuera de este trabajo. En el modelo actual, un PDV corresponde a `public.sucursal`.

## 1. Regla funcional y alcance

El tenant siempre tiene una cotización general válida, cargada manualmente al crear el tenant. Esa carga inicial se considera resuelta y no forma parte de este trabajo.

```text
Sin contexto de PDV: cotización del tenant.
Con contexto de PDV: COALESCE(sucursal.valor_dolar, tenant.cotizacion_usd_ars).
```

- La cotización general se puede modificar aunque uno, varios o todos los PDV tengan una propia, sujeto a permisos, concurrencia y límites numéricos válidos.
- Una cotización particular positiva prevalece sobre la general. `NULL` significa heredar, sin copiar físicamente el valor general al PDV.
- Cambiar la general modifica los equivalentes del catálogo global y de los PDV que heredan. Conserva los valores y equivalentes de los PDV con cotización propia.
- Quitar la particular hace que el PDV use inmediatamente la general vigente, incluyendo sus cambios posteriores.
- La casa central sigue la misma regla que cualquier PDV; `es_central` no determina la cotización.
- Se preservan los importes principales ARS/USD, las reglas de descuentos y margen, las cantidades, los saldos y los importes de operaciones ya registradas. Solo cambia qué tasa se usa para calcular equivalentes actuales.

Ejemplo de aceptación, para un precio principal de USD 100:

| Acción | General | PDV A: propia | Equivalente A | PDV B: hereda | Equivalente B |
| --- | ---: | ---: | ---: | --- | ---: |
| Estado inicial | 1.200 | 1.300 | ARS 130.000 | `NULL` | ARS 120.000 |
| Cambiar general | 1.400 | 1.300 | ARS 130.000 | `NULL` | ARS 140.000 |
| Quitar particular de A | 1.400 | `NULL` | ARS 140.000 | `NULL` | ARS 140.000 |
| Cambiar nuevamente general | 1.500 | `NULL` | ARS 150.000 | `NULL` | ARS 150.000 |

No se agregan cotizaciones automáticas, variantes oficial/MEP/blue ni nuevas operaciones financieras en USD.

## 2. Diagnóstico del código actual

| Área | Evidencia | Implicación |
| --- | --- | --- |
| Edición general | `CotizacionConfiguracion.tsx:29,85,104` habilita por permiso, guardado y conflicto; `CotizacionService.actualizar`, línea 18, actualiza el tenant. | La edición ya existe. No hay una condición explícita que la bloquee porque haya valores en los PDV. Su funcionamiento en un entorno real requiere prueba de API y UI. |
| Validación de la general | `cotizacion.service.ts:26` reúne máximos de producto y producto/sucursal y los convierte con la nueva tasa general. | Puede rechazar una actualización por un precio de un PDV que, con la nueva regla, debería seguir usando su tasa propia. Además, no incluye costos de reposición. |
| Edición del PDV en frontend | `SucursalesConfiguracion.tsx:45,145,234,237` usa `usaCentral`, omite `valor_dolar` al guardar y deja el campo en solo lectura. La fila muestra «Dólar anterior» en la línea 349. | Con el supuesto de tenant siempre configurado, nunca permite gestionar una particular. |
| Edición del PDV en backend | `sucursal.service.ts:29,44,198` llama a `validarDolarHeredado`, que rechaza cambios cuando existe cotización general. | No alcanza con habilitar el input: la API también impide crear, modificar y quitar una particular existente. |
| Resolución monetaria | `CotizacionRepository.obtener`, `precio-catalogo.service.ts:25` y las vistas de catálogo usan la tasa del tenant. | Los valores particulares guardados hoy no se aplican al catálogo. |
| Ventas y márgenes | `descuento-engine.service.ts`, `lista-precios.service.ts` y `operacion.repository.ts:464,1209` resuelven o verifican contra el tenant. | La prioridad debe aplicarse tanto a la evaluación visible como a la confirmación del servidor. |
| Contexto y exportación | `PrecioEditor` consulta el contexto global; `useExportacionCotizacion.tsx:23` comprueba la cotización general; `useListaPrecios.ts:144` elige `stockTotal[0]`. | Al coexistir tasas, pueden mostrarse equivalentes o metadatos de otro PDV, o producirse conflictos falsos. |
| Ausencia de particular | `sucursal.client.ts:7,52` define `valorDolar: number` y transforma `NULL` en `0`. | Se pierde la diferencia entre herencia y un valor configurado. Debe preservarse `NULL`. |
| Cobertura existente | `sucursal.service.test.ts:32` exige rechazar particulares con referencia general. | Hay que reemplazar esa expectativa y agregar pruebas de la nueva regla. |

La documentación de CAS-54 describe una cotización única y considera histórico el valor de sucursal. Este plan reemplaza esa decisión para la próxima implementación; el código todavía conserva la regla anterior.

## 3. Diseño de datos y contexto monetario

### 3.1 Datos persistidos

Reutilizar `tenant.cotizacion_usd_ars` y `sucursal.valor_dolar` como fuentes. No agregar otro campo para el mismo importe ni almacenar la general como particular.

Crear una migración nueva, sin editar las aplicadas, que:

1. Unifique `sucursal.valor_dolar` con `NUMERIC(18,6)`, la precisión de la general. Actualmente es `DECIMAL(12,4)`.
2. Agregue la restricción: `NULL` o decimal finito estrictamente positivo. Cero no representa herencia ni es una tasa válida.
3. Agregue `valor_dolar_version BIGINT NOT NULL DEFAULT 0`, `valor_dolar_actualizada_at` y `valor_dolar_actualizada_por`, con referencia al usuario y el mismo criterio de auditoría que el tenant.
4. Actualice la vista `producto_sucursal_catalogo` para usar la tasa efectiva tanto en precio como en costo y contexto. Mantenga `security_invoker`, los grants correspondientes y las columnas actuales.
5. Mantenga `producto_catalogo` con cotización general, agregando únicamente los metadatos de contexto compatibles que hagan falta.

Prever una consulta de diagnóstico antes de aplicar restricciones: los particulares positivos existentes pasan a ser excepciones activas y se conservan. Identificar ceros, negativos o valores especiales; no convertirlos silenciosamente ni elegir una tasa por inferencia. No hay backfill de cotizaciones de tenant en este alcance.

Actualizar también los comentarios y datos de prueba de `supabase/seed.sql`, que hoy describen el dólar de sucursal como reemplazado. Incluir fixtures con herencia y particular.

### 3.2 Un solo criterio de resolución

Extender `CotizacionRepository` con una lectura efectiva por `tenantId` y `sucursalId` opcional, sin confundir el `PoolClient` opcional actual con ese nuevo parámetro. La lectura global conserva su uso actual; la de PDV valida que este pertenezca al tenant antes de resolver.

La respuesta monetaria debe informar:

| Campo | Significado |
| --- | --- |
| `cotizacion_usd_ars` | Tasa efectiva como string decimal. |
| `origen` | `TENANT` o `SUCURSAL`. |
| `sucursal_id` | PDV al que corresponde el contexto; `null` en catálogo global. |
| `cotizacion_version` | Identificador que se compara para confirmar el contexto visto. |
| `actualizada_at`, `actualizada_por`, `actualizada_por_nombre` | Metadatos de la fuente efectiva, sin atribuir un cambio general a una particular. |

Compartir la misma expresión de prioridad y construcción de contexto entre SQL y backend; usar una expresión/vista auxiliar pequeña si evita duplicación, con pruebas de equivalencia SQL/TypeScript. Mantener `decimal.js`, ARS a dos decimales, USD a cuatro y los redondeos actuales.

### 3.3 Versiones y concurrencia

No comparar únicamente dos contadores: la versión 3 de un PDV no equivale a la versión 3 del tenant o de otro PDV.

Propuesta concreta:

- El GET general conserva su `cotizacion_version` numérica como string y el PATCH general mantiene `version_esperada`, sin cambiar su validación de dígitos.
- Un contexto de PDV devuelve `cotizacion_version` como token opaco que identifica tenant, PDV y versión local; si hereda, incluye además la versión general. Si tiene particular, no depende de la versión general.
- Todos los consumidores monetarios comparan el token completo y lo devuelven al servidor. No lo convierten a número ni lo usan como etiqueta técnica visible; la UI muestra tasa, origen y fecha.
- Crear, modificar o quitar una particular incrementa `valor_dolar_version` dentro de la misma transacción. El PATCH del PDV exige `valor_dolar_version_esperada` cuando se cambia ese campo. Un PATCH sin `valor_dolar` no exige ni modifica esa versión.
- El token cambia al pasar de particular a general aunque ambas tasas sean iguales, y distingue dos PDV con tasas idénticas. Un cambio general no invalida una edición en un PDV con particular.
- Las escrituras monetarias toman bloqueos en orden consistente: tenant, PDV cuando corresponda y luego filas comerciales. La actualización general bloquea el tenant; la particular bloquea el PDV después de obtener el bloqueo compatible del tenant. Las confirmaciones mantienen esos bloqueos hasta guardar, evitando validar con una tasa y persistir con otra.

No reutilizar `sucursal.updated_at` como versión de cotización: editar su nombre o sus usuarios no debería invalidar precios.

## 4. Backend: contratos y cambios

### 4.1 API de configuración

| Operación | Contrato propuesto |
| --- | --- |
| `GET /api/configuracion/cotizacion` | Conserva la consulta general, independientemente del PDV que se esté usando en otras pantallas. |
| `PATCH /api/configuracion/cotizacion` | Conserva `{ cotizacion_usd_ars, version_esperada }`; actualiza solo el tenant y su auditoría/versión. No limpia ni propaga particulares. |
| `GET /api/configuracion/cotizacion?sucursal_id=<id>` | Agrega consulta efectiva del PDV, con origen, token y metadatos. Un ID inválido o ajeno no produce fallback al tenant. |
| `POST /api/sucursales` | Acepta particular positiva o ausencia/`NULL` para heredar. Conserva el requisito actual de administrador para crear. |
| `PATCH /api/sucursales/:id` | `valor_dolar` omitido: conservar; string decimal positivo: establecer/modificar; `null`: quitar particular. Si cambia, exige la versión local esperada. Conserva la autorización actual de edición por asignación al PDV. |

Mantener `cotizacion.actualizar` para modificar la general y el tenant derivado de la identidad autenticada. No tomar el tenant del body. Los listados de sucursales deben exponer el particular nullable y su versión local para editarlo correctamente.

Reemplazar `validarDolarHeredado` por validación real de la particular: positivo, finito, precisión y rango. Usar el mismo criterio decimal que la general y evitar conversiones a `Number` antes de persistir. Conservar el manejo de `CatalogoError`, incluyendo `409 COTIZACION_CAMBIO` y `403` cuando corresponda.

La API de PDV debe conservar códigos/status de error también en el cliente frontend; hoy `sucursal.client.ts` los reduce a `Error` y no permite tratar un conflicto de cotización de forma específica.

### 4.2 Validación de rangos por alcance

Reemplazar la validación global de máximos indiscriminados por una validación de los montos afectados:

- Al cambiar la general: catálogo global y PDV sin particular. Un monto exclusivo de un PDV con particular no se evalúa con la nueva general.
- Al cambiar una particular: precios y costos de ese PDV, incluyendo el precio heredado del producto cuando no existe precio propio de stock.
- Al quitar una particular: validar ese PDV con la general vigente antes de confirmar.
- Incluir precio y costo de reposición, principal ARS/USD y los límites reales de sus equivalentes. No cambiar fórmulas de descuentos ni rechazar un cambio por montos de un ámbito ajeno.

El catálogo global siempre sigue dependiendo de la general: que todos los PDV tengan particular no elimina las validaciones legítimas sobre productos globales.

### 4.3 Consumidores que deben migrar juntos

| Archivo/flujo backend | Cambio |
| --- | --- |
| `src/repositories/cotizacion.repository.ts`, `src/services/cotizacion.service.ts`, controller y routes | Lectura global/efectiva, validación y contratos anteriores. |
| `src/services/sucursal.service.ts`, `src/repositories/sucursal.repository.ts` | Alta, edición y eliminación de particular, versión, auditoría y transacción. |
| `src/utils/moneda.ts`, `src/services/precio-catalogo.service.ts` | Ampliar contexto y permitir pasarlo según alcance. `escribirConMontos` debe seguir siendo un wrapper pequeño. |
| `src/services/producto.service.ts` | Mantener contexto global para precio/costo base. |
| `src/services/producto-sucursal.service.ts` | Usar contexto del PDV de destino en alta; en edición, derivarlo del registro existente. Resolver dentro de la transacción los montos no editados que se comparan con otros nuevos para validar margen. |
| `producto_catalogo`, `producto_sucursal_catalogo` y sus repositorios consumidores | Global con general; stock con efectiva. Conservar ordenamiento/filtros sobre los equivalentes correctos antes de paginar. |
| `src/services/descuento-engine.service.ts` | Usar efectiva del PDV, incluso al evaluar un producto global sin fila de stock. |
| `src/services/lista-precios.service.ts` | Lista general del PDV y lista de cliente con el mismo contexto efectivo para precios, costos, piso y descuentos. |
| `src/repositories/operacion.repository.ts` | Comparar token contra `data.sucursal_id` validado y usar esa misma tasa para el margen al confirmar. Verificar que los ítems pertenezcan al PDV de la operación; no confiar en el token enviado por el cliente. |

Las listas deben obtener contexto y montos con una lectura consistente: misma consulta o transacción con la tasa protegida durante el cálculo. No combinar una consulta de contexto con filas de otra revisión.

Revisar los grants efectivos de la Data API para `sucursal.valor_dolar` y su nueva metadata: las políticas actuales aíslan por tenant, pero no reemplazan las reglas de edición del backend. Si existe una vía directa de escritura que elude versión o asignación, cerrarla conservando las operaciones no monetarias necesarias. La general ya tiene restricción de UPDATE por columna en la migración CAS-54. Esta revisión requiere una base de prueba; no se afirma el estado de grants de producción.

## 5. Frontend

### 5.1 Configuración

En `CotizacionConfiguracion.tsx`:

- Mantener la edición general habilitada por permiso aunque todos los PDV tengan particular.
- Reemplazar «Referencia manual única» por una explicación de la prioridad: «Se aplica a los PDV que no tienen una cotización propia».
- No ofrecer importar valores históricos de PDV como parte de un alta inicial: el tenant ya tiene tasa. No mostrar una particular como cotización general.
- Conservar borrador y revisión explícita ante conflicto; actualizar las vistas afectadas al guardar.

En `SucursalesConfiguracion.tsx`:

- Quitar `usaCentral` como bloqueo y condición para omitir `valor_dolar`.
- Agregar elección explícita entre «Usar cotización general» y «Usar cotización propia». La primera envía `NULL`; la segunda exige un decimal positivo con hasta seis decimales.
- Mostrar valor general vigente, particular si existe, tasa efectiva y origen. Reemplazar «Dólar anterior» por el estado actual.
- Un PDV nuevo hereda por defecto. Editar otros campos conserva el particular y no lo reemplaza accidentalmente por la general.
- Si cambia la general mientras se edita una particular, conservar el borrador. Si se elige heredar, mostrar el valor general actualizado.
- Ante `409`, conservar los datos, recargar la referencia y permitir revisarla antes de reintentar.

Actualizar `src/lib/api/sucursal.client.ts`: particular como `string | null`, versión local como string y metadatos correspondientes. Ajustar los fixtures que hoy usan cero como ausencia. Los strings conservan precisión en el contrato; el formato visual puede usar conversión numérica.

### 5.2 Contexto por pantalla

Conservar `CotizacionContext` para configuración y catálogo global. Agregar un hook pequeño de cotización por PDV, respaldado por el GET con `sucursal_id`; no reemplazar el contexto global con un único PDV mutable que afecte a toda la aplicación.

Actualizar `Moneda.ts`, `cotizacion.client.ts`, `PrecioEditor`, `ContextoPrecios`, `PrecioDetalle`, utilidades de precio y los hooks de edición para recibir/comparar el contexto correcto. Un editor reutilizable no debe imponer siempre el global.

| Pantalla | Contexto |
| --- | --- |
| Configuración de cotización y formulario/catálogo de producto | General. |
| Formulario/detalle de stock | Efectivo del PDV del registro o seleccionado al crear. |
| Evaluación y confirmación de venta | Efectivo del PDV de la operación. |
| Lista general y lista de cliente | Contexto devuelto por la API para el PDV seleccionado. |
| Vista con varios PDV | Contexto de cada fila; no asumir una cotización común. |

Al cambiar de PDV, descartar respuestas pendientes del anterior, revisar equivalentes y no confirmar hasta disponer del contexto nuevo. Ante una tasa nueva, conservar los importes principales del borrador y pedir revisión cuando su token cambie. No usar temporalmente la general mientras se carga la tasa de un PDV que podría tener particular.

Notificar también cambios de particulares para recargar datos y contextos, reutilizando `cotizacion-actualizada` con información de alcance si resulta necesario. Un refresco no debe producir conflictos en una particular cuyo token sigue vigente. Mantener recarga al recuperar foco.

### 5.3 Listas, ventas y exportaciones

- En `useListaPrecios.ts`, eliminar la selección de contexto mediante `stockTotal[0]`. Conservar el contexto del DTO de la lista del PDV seleccionado, incluso si no hay ítems.
- En `VentaForm.tsx` e `ItemsEditor.tsx`, comprobar y refrescar la cotización del PDV, no la del provider general. Evitar asignar la versión general a ítems que se recargaron con una particular.
- En `useExportacionCotizacion.tsx`, comprobar vigencia para el mismo `sucursal_id` de la lista. Conservar la opción actual de exportar una vista anterior o actualizarla, identificando su tasa y origen.
- En `exportacion-precios.ts` y los generadores PDF/Excel general y cliente, incluir PDV, tasa, origen y fecha del snapshot; validar el token y alcance de todas las filas. No mezclar contextos de PDV distintos por coincidir el importe o el contador.
- Al regenerar, mantener filas, descuentos y contexto del mismo snapshot; no etiquetar datos viejos con una cotización recién consultada.

## 6. Secuencia de implementación y comprobación

1. Preparar fixtures y consultas de diagnóstico; crear la migración de particulares, versiones y vistas. Validar SQL y grants en una base aislada de Casa Segura.
2. Implementar resolución y contratos backend. Habilitar particulares solo junto con las lecturas, listas, ventas y validaciones que las consumen.
3. Implementar configuración frontend y contexto por PDV, incluyendo edición de stock, ventas y exportaciones.
4. Reemplazar pruebas de la regla anterior y ejecutar los casos siguientes. Actualizar la documentación vigente de CAS-54 para enlazar y describir esta nueva prioridad, conservando la trazabilidad de la decisión anterior.
5. Entregar migración, backend y frontend compatibles en una misma versión. Revisar antes de activar los particulares positivos existentes, porque pasan de dato histórico a fuente efectiva y pueden cambiar equivalentes actuales. Una reversión de aplicación debe conservar los datos y el esquema nuevos y considerar este cambio de comportamiento.

No habilitar solo el input: permitir guardar particulares mientras alguna validación sigue usando la general deja resultados contradictorios.

## 7. Pruebas y criterios de aceptación

| Caso | Resultado exigido |
| --- | --- |
| General con ningún, algún o todos los PDV con particular | PATCH general exitoso si el usuario está autorizado y los montos afectados son válidos. |
| Ejemplo de USD 100 de la sección 1 | Se cumplen exactamente las cuatro filas, tanto en API como en pantalla. |
| Precio principal ARS 120.000 | El principal permanece; su equivalente es USD 100 con tasa 1.200 y USD 80 con tasa 1.500. |
| Particular omitida, positiva y `NULL` | Conservar, establecer y heredar, respectivamente. Crear sin particular no copia la general. |
| Cero, negativo, infinito, NaN o demasiados decimales | Rechazo en API y restricción de base coherente, sin cambios parciales. |
| Casa central con/sin particular | Misma prioridad que otro PDV. |
| General cambia con particular vigente | No cambia esa tasa ni su token; no se fuerza un conflicto falso al guardar un precio en ese PDV. |
| Particular cambia o se elimina con formulario abierto | `409`; borrador conservado y nueva revisión antes de confirmar. |
| Dos escrituras con la misma versión | Solo una gana; la otra informa conflicto. Probar general y particular, además de lectura/confirmación concurrentes. |
| Dos PDV con tasa/contador iguales; cambio de origen con tasa igual | Contextos distinguibles, sin aceptar un token del ámbito anterior. |
| Precio heredado del producto en stock | Conserva el principal del producto y convierte con la tasa efectiva del PDV. |
| Costos USD, margen y descuentos | Misma tasa en editor, detalle, evaluación, lista y confirmación; se conservan las fórmulas existentes. |
| Rango extremo exclusivo de PDV con particular | No bloquea por error una general válida. Al cambiar/quitar la particular, sí se valida el PDV con su tasa de destino. |
| Usuarios sin permiso, PDV no asignado o de otro tenant | Rechazo conforme a la autorización del endpoint; no hay fallback ni cambios en datos ajenos. |
| Lista vacía o cambio rápido de PDV | Contexto del PDV seleccionado, sin tomar la primera fila de otro ni una respuesta atrasada. |
| Exportaciones general y cliente | Tasa, origen, PDV y precios del mismo snapshot, incluyendo conservar vista anterior y regenerar. |
| Operación histórica | Sus importes no cambian al modificar ninguna cotización. |

Cobertura backend: agregar pruebas de `CotizacionService`/repositorio, actualizar `sucursal.service.test.ts`, `moneda.test.ts`, pruebas de producto/stock, listas, motor de descuentos y confirmación de operaciones. Integración real para vistas, restricciones, transacciones, concurrencia y aislamiento.

Cobertura frontend: pruebas de configuración general/PDV, cliente de sucursales, hook de contexto por PDV, `PrecioEditor`, formularios de producto/stock, venta, listas y comprobación/exportación de snapshots.

Comandos de verificación una vez implementado, desde cada repositorio, ajustando la selección de pruebas a los archivos agregados:

```powershell
# Backend
npm.cmd test
npm.cmd run build
git diff --check

# Frontend
npm.cmd run test -- --run
npm.cmd run lint
npm.cmd run build
git diff --check
```

Para integración, preparar una base descartable con las migraciones correctas de Casa Segura y ejecutar escenarios nuevos con tenant configurado. `scripts/verify-cas54.mjs` escribe datos y pone la general en `NULL` al comenzar; requiere adaptación y una base aislada, no sirve como consulta de comprobación sobre un entorno compartido.

Finalizar con una comprobación de navegador y API del ejemplo de la sección 1, alta/cambio/eliminación de particular, venta y PDF/Excel. Registrar por separado pruebas unitarias, integración de base y verificación de UI; ningún resultado está ejecutado por la preparación de este plan.

## 8. Referencias del repositorio

- Backend: [cotización](../../casa-segura-backend/src/services/cotizacion.service.ts), [resolución y permiso](../../casa-segura-backend/src/repositories/cotizacion.repository.ts), [edición de PDV](../../casa-segura-backend/src/services/sucursal.service.ts), [persistencia de PDV](../../casa-segura-backend/src/repositories/sucursal.repository.ts).
- Backend monetario: [wrapper de escritura](../../casa-segura-backend/src/services/precio-catalogo.service.ts), [stock](../../casa-segura-backend/src/services/producto-sucursal.service.ts), [listas](../../casa-segura-backend/src/services/lista-precios.service.ts), [descuentos](../../casa-segura-backend/src/services/descuento-engine.service.ts), [confirmación de operaciones](../../casa-segura-backend/src/repositories/operacion.repository.ts).
- Vistas actuales: [producto global y costos](../../casa-segura-backend/supabase/migrations/20261012120000_costo_reposicion_doble_moneda.sql), [stock y precio heredado](../../casa-segura-backend/supabase/migrations/20261028120000_precio_stock_desde_producto.sql).
- Frontend: [configuración general](<../src/app/(modulos)/configuracion/_components/CotizacionConfiguracion.tsx>), [configuración de PDV](<../src/app/(modulos)/configuracion/_components/SucursalesConfiguracion.tsx>), [contexto global](../src/context/CotizacionContext.tsx), [lista general](<../src/app/(modulos)/lista-precios/_hooks/useListaPrecios.ts>), [comprobación de exportaciones](../src/lib/hooks/useExportacionCotizacion.tsx).
- Decisión previa a actualizar al implementar: [plan CAS-54](CAS-54-plan-implementacion-doble-moneda.md) y [documentación de implementación](CAS-54-implementacion-etapas-1-3.md).
