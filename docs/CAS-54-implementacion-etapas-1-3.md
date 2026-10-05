# CAS-54 — Implementación de las etapas 1 a 3

Fecha: 4 de octubre de 2026, America/Buenos_Aires.

Las tres etapas de catálogo del [plan](CAS-54-plan-implementacion-doble-moneda.md) están implementadas en backend y frontend. Los cambios están en los archivos de trabajo; esta entrega no aplica migraciones a producción ni realiza un despliegue.

## Funcionalidad entregada

| Etapa | Comportamiento implementado |
| --- | --- |
| 1. Consulta | Cotización manual por empresa; Productos, Stock y Lista de Precios muestran ARS/USD resueltos, referencia, versión y actualización. Ordenamiento numérico antes de paginar en los catálogos del servidor. |
| 2. Edición | Un importe principal ARS o USD, equivalente de solo lectura, revisión de pares heredados y copia explícita de la sugerencia global. Los conflictos conservan el formulario. Editar un precio omite cantidades de stock que no se editaron. |
| 3. Listas | Lista por cliente evaluada en backend con cargas por lote y una sola cascada en moneda principal. PDF y Excel general/cliente incluyen toda la selección, cotización, versión, fechas, referencia por fila y advertencia de datos heredados. |

### Reglas adoptadas

- `1 USD = X ARS`, manual por tenant. La cotización admite seis decimales, debe ser positiva y tiene control de versión.
- Principal ARS: dos decimales. Principal USD: cuatro. Cálculos con `decimal.js 10.6.0`, precisión 40 y `ROUND_HALF_UP`. El piso de margen USD se eleva a cuatro decimales para que su equivalente no perfore el mínimo ARS.
- El costo de reposición conserva su referencia ARS. Cambiar el dólar modifica equivalentes calculados; no actualiza masivamente precios principales, stock ni saldos.
- El precio global y el de cada sucursal son independientes. La sugerencia global solo se copia mediante una acción explícita.
- Un importe ausente permanece ausente; cero es un importe válido cuando cumple las reglas de margen. Sin cotización se puede consultar ARS y editar atributos no monetarios. El equivalente USD se muestra como no disponible.
- Se preserva el perfil comercial anterior de la lista por cliente: precio y descuento del producto en esa sucursal, región, categoría/subcategoría del cliente, excepción por producto y descuento habitual. No se agrega una nueva herencia del descuento global.
- El motor de ventas conserva su origen global y sus niveles existentes. Ventas, cuentas, pagos y operaciones históricas continúan en ARS.

## Uso

1. En **Configuración → Cotización ARS/USD**, un administrador configura el dólar de la empresa. Se muestran la fecha, versión y persona que lo actualizó. Los dólares anteriores de sucursal son sugerencias que deben elegirse explícitamente.
2. En un producto o stock, elegir **Usar ARS como referencia** o **Usar USD como referencia**, cargar el importe y revisar el equivalente. Vaciarlo y guardar elimina el precio; dejarlo sin editar lo conserva.
3. Si aparece **Actualizar cotización y revisar**, el borrador sigue disponible. Revisar la nueva referencia antes de reintentar. Cambiar de moneda durante ese conflicto mantiene pendiente la revisión de la cotización visible.
4. En un par heredado, comparar los originales ARS/USD y confirmar la referencia elegida. Un caso con USD histórico y sin ARS requiere seleccionar explícitamente USD; no se interpreta como ARS cero.
5. Consultar la lista general o la lista del cliente y exportar PDF/Excel. Si cambió el dólar, elegir **Conservar vista anterior** o **Actualizar y regenerar**. Cada archivo identifica la versión utilizada.

Las listas del cliente mantienen el bloqueo de exportación cuando los descuentos no permiten alcanzar el margen mínimo. El tope y la advertencia se calculan en backend; el equivalente final se deriva de ese resultado.

## Datos, permiso y adopción

Migración aditiva: [20261005011204_cas54_catalogo_doble_moneda.sql](../../casa-segura-backend/supabase/migrations/20261005011204_cas54_catalogo_doble_moneda.sql).

Agrega cotización, fecha, autor y versión a `tenant`; referencia y principal USD a `producto`; referencia, confirmación y copias de ambos importes anteriores a `producto_sucursal`. Las vistas `producto_catalogo` y `producto_sucursal_catalogo` resuelven las lecturas con `security_invoker`, preservando RLS de las tablas subyacentes.

Los precios de sucursal previos quedan como referencia ARS provisional. Cuando existía USD, se señaliza `LEGADO_PENDIENTE_REVISION`; los originales sobreviven a la confirmación en `precio_venta_ars_heredado` y `precio_venta_usd_heredado`. No se infiere una cotización histórica ni se normaliza un par automáticamente.

La migración otorga `cotizacion.actualizar` a roles existentes cuyo nombre es `Administrador`, sin distinguir mayúsculas. El servidor comprueba usuario activo y permiso en una sucursal activa de su empresa. Roles distintos o administradores creados posteriormente requieren asignar ese permiso. Se revoca la actualización directa de las columnas monetarias de `tenant` para `authenticated`, conservando la edición de nombre de empresa y `updated_at`.

Una vez configurada la cotización central, backend e interfaz impiden modificar `sucursal.valor_dolar`; se conserva como dato heredado. La lectura nueva se activa con el despliegue conjunto. La edición de un principal requiere que el tenant haya configurado su cotización. No se incorporaron banderas independientes de producto ni una plataforma de flags.

## Contratos API

Las rutas conservan sus envoltorios `status/data/page`. El tenant y el autor se toman de la sesión.

| Ruta | Uso |
| --- | --- |
| `GET /api/configuracion/cotizacion` | Tasa, versión, fecha, autor, permiso y sugerencias anteriores por sucursal |
| `PATCH /api/configuracion/cotizacion` | Cambio del dólar con versión esperada |
| `GET /api/productos` y `GET /api/productos/:id` | Precio global resuelto y contexto, con variantes paginadas existentes |
| `GET /api/producto-sucursal` y `GET /api/producto-sucursal/:id` | Precio de sucursal resuelto, precio global resuelto, contexto y originales heredados |
| `GET /api/descuentos/lista-cliente?sucursalId=…&clienteId=…` | Evaluación completa de la lista del cliente y contexto común |

Cambio del dólar:

```json
{
  "cotizacion_usd_ars": "1200.000000",
  "version_esperada": "2"
}
```

Precio para POST/PATCH de producto o producto/sucursal:

```json
{
  "precio": {
    "moneda_referencia": "USD",
    "importe_referencia": "100.1234",
    "cotizacion_version": "3"
  }
}
```

Omitir `precio` no lo cambia; `precio: null` lo limpia. Se rechazan escrituras de los importes viejos sin referencia con `PRECIO_REQUIERE_REFERENCIA`. Los campos monetarios nuevos y la versión viajan como cadenas. La validación de versión y escritura se realizan en una transacción con bloqueo compartido del tenant; actualizar el dólar requiere el bloqueo de escritura.

Errores principales: `COTIZACION_CAMBIO` (`409`), `COTIZACION_REQUERIDA`, `IMPORTE_INVALIDO`, `PRECIO_FUERA_DE_RANGO` y `SIN_PERMISO` (`403`). Una venta ARS que usa un principal USD debe enviar `cotizacion_version_catalogo`; el servidor rechaza la referencia anterior antes de registrar la operación. La interfaz conserva los ítems y ofrece actualizar sus unitarios y revisarlos.

## Validación realizada

| Comprobación | Resultado |
| --- | --- |
| Backend Vitest | 24 archivos, 263 pruebas aprobadas |
| Frontend Vitest | 24 archivos, 158 pruebas aprobadas |
| Compilación | `npm run build` aprobado en ambos proyectos |
| PostgreSQL local aislado | Migraciones desde cero y 11 escenarios de integración aprobados |
| Formularios | Principal USD de cuatro decimales, conservación ante conflicto, ausencia sin herencia global y PATCH sin cantidades no editadas |
| Navegador | Configuración con autor; detalle USD 100,1234; rechazo concurrente, revisión y guardado conservando 42 unidades; listas y decisiones de exportación |
| Archivos reales | Excel general: 68 filas frente a 10 visibles; PDF general: 4 páginas. Cliente: 24 filas y PDF de 2 páginas. Importes y metadatos contrastados con la vista; páginas renderizadas e inspeccionadas |
| Selección de 25 ítems | Prueba de los generadores exporta 25, conserva cuatro decimales, ausencia vacía y metadatos comunes |
| ESLint acotado | Componentes/utilidades nuevos y lista del cliente sin hallazgos. Persisten 5 errores de `react-hooks/set-state-in-effect` en formularios existentes, confirmados también en HEAD previo |

La integración verifica conservación de pares heredados, ausencia de dólar, permisos, actualizaciones concurrentes, independencia de principales y sucursales, precisión SQL/TypeScript, orden previo a paginación, margen, stock, configuración de descuentos, rechazo de una venta con versión anterior, historial ARS, aislamiento y bloqueo de actualización directa.

El navegador integrado no pudo conectarse. Se verificó con Chrome headless separado; esa herramienta canceló las descargas nativas, por lo que los archivos se guardaron capturando los blobs producidos por los botones reales de la interfaz. Se comprobó su contenido y renderizado; la descarga nativa en el navegador habitual queda para la revisión del entorno de entrega.

La base `public` que estaba disponible en el PostgreSQL local corresponde a otra aplicación. No se la migró ni reseteó. Se usaron bases separadas `casa_segura_cas54_test` y `casa_segura_cas54_final`, con fixtures sintéticos de Auth. La cuenta local temporal de navegador se elimina al terminar la verificación.

Reproducción desde el directorio backend, con una conexión local en `.env` y un nombre de base nuevo:

```powershell
$env:CAS54_TEST_DATABASE = 'casa_segura_cas54_verificacion'
node --env-file=.env scripts/cas54-local-db.mjs
npm run build
node --env-file=.env scripts/verify-cas54.mjs
npm test
```

La preparación rechaza una base existente. Ambos scripts rechazan servidores remotos y nombres fuera del prefijo de pruebas. `verify-cas54.mjs` escribe y reinicia la cotización exclusivamente dentro de la base aislada; no debe utilizarse como comprobación de producción.

## Despliegue y trabajo posterior

1. Aplicar la migración con el flujo habitual de Supabase al proyecto/base de **Casa Segura** identificado y revisar sus permisos. No usar un reset ni apuntar al `public` de la otra aplicación local.
2. Instalar las dependencias de ambos repositorios con sus locks y desplegar backend y frontend compatibles en la misma entrega. El backend nuevo necesita las vistas; los formularios antiguos no pueden escribir el nuevo contrato monetario.
3. Configurar el dólar del tenant de prueba, revisar sus pares heredados y comparar listas antes de extender el uso. La migración no elige ese dólar automáticamente.
4. Ante una reversión, conservar el esquema y un backend que entienda los principales USD ya escritos. Volver al backend anterior requiere una estrategia adicional; no reinterpretar USD como ARS.

La etapa 4 conserva la auditoría de datos del entorno real, medición de rendimiento con volumen representativo y habilitación gradual. Las etapas 5 y 6 conservan operaciones/cuentas USD, pagos mixtos y reversiones financieras. No corresponde cerrar el alcance financiero completo de CAS-54 con esta entrega de catálogo.
