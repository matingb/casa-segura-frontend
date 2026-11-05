# Tasks

Todas las casillas representan implementación pendiente. La configuración de
OpenSpec y la redacción de estos artefactos no completan tareas de producto.

## 1. Clients, tipos y contexto de PDV

- [ ] 1.1 Agregar el tipo/método de referencias globales mínimas a sucursalClient y mantener separado el catálogo propio; verificar tests con B disponible en referencias pero ausente de los PDV propios y sin campos comerciales inventados.
- [ ] 1.2 Adaptar clientes HTTP de stock, clientes, regiones, sucursales y cotización para conservar los códigos acordados y la respuesta acceso_revocado; verificar parsing de éxitos, data=null y errores 403/404 sin tratarlos como guardados exitosos.
- [ ] 1.3 Ajustar SucursalContext y consumidores protegidos para carga/error/vacío, refresco de alcance y selección revocada; verificar tests sin asignaciones, recuperar foco y respuestas tardías sin fallback global.
- [ ] 1.4 Documentar las fuentes de PDV propios activos, propios con inactivos y referencias globales junto a los clients/contexto; verificar que sus ejemplos coinciden con los contratos backend.

## 2. Stock visible y formularios

- [ ] 2.1 Adaptar StockCatalogo y filtros al resultado autorizado del servidor; verificar que filas, valores únicos, total y paginación de un usuario A no contienen B.
- [ ] 2.2 Ajustar StockForm y useStockDetalle para altas propias, detalle no disponible y pérdida de acceso durante guardado; verificar URL ajena sin datos/acciones y rechazo sin mensaje de éxito.
- [ ] 2.3 Conservar validaciones de cantidades, precio, costo, mínimo, margen y baja con stock cero; verificar las pruebas de comportamiento existentes y una edición/baja autorizada en A.
- [ ] 2.4 Documentar la semántica de Todas y los estados de no disponible de stock; verificarla contra las pruebas de catálogo y acceso directo.

## 3. Clientes y edición parcial

- [ ] 3.1 Adaptar ClientesCatalogo y useClienteDetalle a CA/CB/CAB autorizados; verificar que CAB aparece una vez, CB no aparece y la URL ajena no ofrece datos ni acciones.
- [ ] 3.2 Reemplazar el catálogo global de ClienteForm por PDV propios, conservando propios inactivos ya asociados; verificar alta con al menos un propio activo y selector sin B.
- [ ] 3.3 Adaptar el payload de sucursal_ids al reemplazo de vínculos propios y permitir [] en edición para validación del backend; verificar que guardar CAB con [A] no construye vínculos de B ni presupone borrarlos.
- [ ] 3.4 Manejar acceso_revocado=true después de editar: limpiar datos/modales/descuentos y volver al catálogo; verificar que no se intenta recargar CAB ni mostrar un fallo de guardado tras un éxito.
- [ ] 3.5 Mantener edición común de datos, estado y descuentos del cliente compartido e indicar su alcance común; verificar CAB editable desde A y cliente ajeno sin acciones.
- [ ] 3.6 Restringir ClienteDescuentos y RegionSelector al par cliente–PDV propio, permitiendo seleccionar regiones mixtas en A; verificar que nunca se consulta/modifica la región del cliente en B.
- [ ] 3.7 Documentar el guardado parcial, la pérdida de acceso y el alcance común de descuentos; verificar los ejemplos con las pruebas de formulario y la respuesta backend acordada.

## 4. Listas de precios y exportaciones

- [ ] 4.1 Cambiar useListaPrecios para consultar stock del PDV propio seleccionado y evitar consultas sin selección válida; verificar que no descarga todo el tenant y que cambiar A a D limpia el resultado previo.
- [ ] 4.2 Adaptar useListaPreciosCliente, TablaPreciosCliente y ClienteListaPreciosModal a la intersección autorizada; verificar CAB de A+B con usuario A ofreciendo y consultando únicamente A.
- [ ] 4.3 Invalidar listas, snapshots y acciones al cambiar cliente/PDV o recibir rechazo; verificar respuestas fuera de orden, modal cerrado y revocación sin reactivar datos anteriores.
- [ ] 4.4 Revalidar acceso mediante el endpoint de lista antes de cada descarga PDF/Excel y cancelar ante 403/404; verificar que una lista previamente cargada no se descarga después de revocar A.
- [ ] 4.5 Mantener columnas, formatos, filtros y opciones de conservar/actualizar cotización; verificar que una exportación autorizada usa el mismo par y preserva las pruebas actuales de contratos monetarios.
- [ ] 4.6 Documentar la revalidación de acceso y su convivencia con snapshots de cotización; verificar que los ejemplos no afirman revocar archivos ya descargados.

## 5. Configuración y excepciones

- [ ] 5.1 Adaptar CategoriasConfiguracion y DescuentoEditor a referencias globales mínimas; verificar ABM y descuentos generales/excepciones de categoría y subcategoría para B desde un usuario A.
- [ ] 5.2 Adaptar RegionesConfiguracion y tipo Region a puede_modificar/motivo_bloqueo y PDV proyectados; verificar RA editable, RAB en consulta con A, RB ausente y selector de altas solo propio.
- [ ] 5.3 Ajustar SucursalesConfiguracion y SucursalUsuariosEditor a fichas propias y opciones según permiso; verificar inactivos propios, reactivación, alta con autoasignación y ausencia de directorio global cuando falta permiso.
- [ ] 5.4 Conservar el cambio A central quitando esa marca a B mediante referencia mínima; verificar que no se carga la ficha comercial de B ni se habilitan sus otros campos.
- [ ] 5.5 Conservar CotizacionConfiguracion con permiso global, versiones y sugerencias propias; verificar usuario A autorizado cambiando tasa general heredada por B y ausencia de editor/cotización propia de B.
- [ ] 5.6 Ajustar los contadores de ConfiguracionView al conjunto autorizado visible y documentar las cuatro excepciones; verificar conteos propios de PDV/regiones y contador global de categorías.

## 6. Integración y entrega coordinada

- [ ] 6.1 Ejecutar npm.cmd test -- --run, npm.cmd run lint y npm.cmd run build; verificar resultados y registrar fallos previos/de entorno sin presentarlos como aprobados.
- [ ] 6.2 Verificar con navegador/backend/BD las cuentas A, A+D, sin PDV y administrador solo A, incluyendo URL directa, CAB, regiones mixtas, revocación y exportaciones; registrar evidencias separadas de los tests con mocks.
- [ ] 6.3 Verificar las cuatro excepciones con el backend coordinado y que el menú y los flujos de Operaciones, Cuentas y Reposición no recibieron cambios funcionales.
- [ ] 6.4 Ejecutar openspec.cmd validate limitar-acceso-por-pdv --strict --no-interactive y revisar el diff/contratos de ambos repos antes de la entrega coordinada; verificar que cada tarea marcada completada tenga evidencia.

## Workflow follow-up

- Revisar y aplicar este change junto con el del backend cuando el usuario solicite implementar.
- Archivar y sincronizar las specs principales solo después de completar las tareas y validar la entrega coordinada.
