# Acceso por punto de venta en el frontend

## Alcance y errores

`SucursalContext` carga solo los PDV activos asignados al usuario. Lo recarga al volver a la pestaña y después de un `403 SUCURSAL_FUERA_DE_ALCANCE`. Las consultas de detalle limpian los datos anteriores al cambiar de ID o al fallar para no dejar una ficha ajena visible.

Los clientes API conservan estado HTTP y código de error en `CatalogoApiError`. Las pantallas de stock, clientes, regiones y precios muestran el mensaje devuelto por la API y vacían los datos obsoletos.

## Pantallas

- Stock y su detalle usan respuestas limitadas por el backend. La lista de precios consulta stock solo para el PDV activo seleccionado; no carga el stock de otros PDV para filtrarlo en el navegador.
- El formulario de cliente muestra y envía solo asociaciones propias. Las asociaciones ajenas se conservan en el backend y no se cargan en la pantalla. Los datos comunes y descuentos del cliente compartido pueden afectar a todos sus PDV. Si se retira la última asociación visible y queda otra global, la respuesta `acceso_revocado` cierra la edición y vuelve al catálogo.
- Las listas de precios de cliente usan únicamente el cruce cliente–PDV visible y activo. Tanto la lista general como la de cliente vuelven a validar el acceso inmediatamente antes de descargar PDF o Excel. La acción de actualizar vuelve a cargar la lista; conservar una cotización anterior conserva los importes existentes, pero también revalida el acceso.
- La configuración de regiones muestra solo los PDV propios en una región compartida. La capacidad del servidor (`puedeModificar` y `motivoBloqueo`) decide si aparecen acciones de edición o baja. Los selectores de creación ofrecen PDV propios activos.
- La administración de PDV muestra los datos completos solo de PDV propios. Categorías y casa central usan la referencia mínima global (`id`, `nombre`, `activo`, `esCentral`) prevista para esas excepciones; no cargan fichas completas de PDV ajenos.

## Límites de integración

La UI no calcula el alcance ni trata un rol como permiso general por PDV; la respuesta del backend es la autoridad. No se cambian las pantallas ocultas ni las llamadas de ventas a `/evaluar` y `/calcular`.
