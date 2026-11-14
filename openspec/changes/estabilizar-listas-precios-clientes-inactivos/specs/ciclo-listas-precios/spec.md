# Spec Delta

## Purpose

Garantizar cargas acotadas y estados comprensibles de las listas de precios generales y de cliente, con descargas autorizadas que correspondan a precios calculados para la selección vigente.

## ADDED Requirements

### Requirement: Disponibilidad comercial de la lista del cliente

La interfaz SHALL solicitar y exportar la lista operativa solo para clientes activos con un PDV propio activo asociado. Un cliente inactivo SHALL conservar la consulta y administración autorizada de sus descuentos configurados, con un aviso de que sus precios estarán disponibles al reactivarlo.

#### Scenario: Cliente inactivo abierto por URL directa
- **WHEN** se abre el detalle de un cliente inactivo accesible y se selecciona Descuentos
- **THEN** se cargan sus descuentos configurados sin consultar su lista de precios ni la cotización para esa lista
- **AND** no se muestran simulaciones, conteos de productos calculados ni acciones de exportación utilizables

#### Scenario: Acción de lista para cliente inactivo
- **WHEN** el cliente está inactivo al renderizar la ficha o pasa a estarlo con un modal abierto
- **THEN** la acción de lista explica su indisponibilidad, se retiran los precios previos y se cancela cualquier descarga pendiente

#### Scenario: Reactivación del cliente
- **WHEN** se guarda la reactivación y se vuelve a abrir Descuentos o la lista
- **THEN** se permite cargar la lista del par cliente y PDV autorizado con los descuentos conservados

### Requirement: Consultas disparadas por cambios funcionales

Las listas SHALL cargar al habilitarse y ante cambios reales de cliente, PDV, región o revisión monetaria. Un render con selecciones y permisos equivalentes MUST NOT iniciar otra consulta. Una pestaña oculta o un modal cerrado MUST NOT cargar sus precios ni cotización y sus respuestas tardías MUST NOT rehabilitar acciones.

#### Scenario: Opciones equivalentes
- **WHEN** se actualizan las opciones de PDV conservando IDs, estado y selección
- **THEN** no se vuelve a consultar la lista ni el stock por ese único motivo

#### Scenario: Controles locales
- **WHEN** se escribe una búsqueda, cambia un orden, un filtro local, la página o se abre una sección de descuentos
- **THEN** se actualiza la vista sin nuevas consultas de cálculo de precios

#### Scenario: Selección inválida o sin PDV
- **WHEN** no hay PDV propios activos asociados o se retira el seleccionado
- **THEN** se retiran los datos anteriores y las descargas, sin consultar un ID vacío, inactivo o ajeno
- **AND** solo se carga otro PDV si existe una alternativa autorizada seleccionada

### Requirement: Recuperación acotada de recursos no disponibles

Un `404 RECURSO_NO_DISPONIBLE` de una lista SHALL invalidar esa lista y bloquear su descarga. MUST NOT asumirse que revocó todo el alcance de PDV. La comprobación del cliente y sus asociaciones SHALL ser acotada; si el contexto sigue sin cambios, el rechazo MUST terminar en un estado estable sin volver a montar o consultar la lista indefinidamente.

#### Scenario: Lista rechazada y cliente todavía accesible
- **WHEN** la lista devuelve 404 y una comprobación del detalle devuelve el mismo cliente y asociaciones
- **THEN** la lista queda no disponible y no se inicia otra consulta automática para ese mismo intento
- **AND** se conservan los descuentos autorizados, sin una sucesión de recargas globales o notificaciones

#### Scenario: Rechazo de acceso confirmado
- **WHEN** la comprobación de detalle confirma que el cliente ya no es accesible
- **THEN** se retiran datos, descuentos y acciones del cliente y no se consulta de nuevo el recurso sin una nueva acción o contexto autorizado

#### Scenario: Revocación explícita del PDV
- **WHEN** una consulta recibe `403 SUCURSAL_FUERA_DE_ALCANCE`
- **THEN** se actualiza el alcance, se retiran los datos afectados y se cancelan las descargas
- **AND** la recuperación termina sin repetir indefinidamente solicitudes del PDV revocado

### Requirement: Errores diferenciados de carga y vacío

La interfaz SHALL distinguir cargando, error, indisponibilidad y resultado vacío. Fallos de red, 5xx o validaciones de precio MUST finalizar la carga y mostrar una recuperación explícita sin reintentos automáticos ilimitados. Un error del resumen de descuentos MUST retirar sus acciones y no presentarse como carga perpetua; un error solo de precios MUST NOT ocultar los descuentos autorizados.

#### Scenario: Error del resumen de descuentos
- **WHEN** falla la consulta de descuentos del cliente
- **THEN** se muestra el error con una acción de reintento y no se mantiene indefinidamente el texto de carga

#### Scenario: Error de cálculo con descuentos disponibles
- **WHEN** se obtuvieron los descuentos y falla el cálculo de su lista de precios
- **THEN** se conservan los porcentajes configurados con un aviso de precios no disponibles
- **AND** no se muestran como reales simulaciones o cantidades cero derivadas de la ausencia de precios

#### Scenario: Reintento manual
- **WHEN** se pulsa Reintentar una vez después de un fallo recuperable
- **THEN** se inicia un solo nuevo intento de cada recurso necesario y se bloquean clics repetidos mientras está en curso

### Requirement: Lista general lista solo con cálculo completo

La lista general SHALL mostrar precios finales y permitir descargas únicamente con stock, regiones resueltas, cálculo de precios y contexto monetario compatibles para el PDV y región vigentes. Un mapa de precios ausente o incompleto MUST NOT interpretarse como descuento cero ni sustituirse por precios base. El resultado exitoso sin productos SHALL mostrarse como vacío.

#### Scenario: Stock rápido y cálculo lento
- **WHEN** termina el stock pero sigue pendiente la lista calculada
- **THEN** la vista sigue en carga, sin filas de precio final ni exportaciones habilitadas

#### Scenario: Falla la lista calculada
- **WHEN** el stock responde correctamente y la lista calculada falla
- **THEN** se muestra el error sin filas de precios finales ni descarga posible

#### Scenario: Fallan regiones
- **WHEN** falla la consulta de regiones del PDV
- **THEN** se ofrece reintentar y no se presenta automáticamente una lista calculada sin región como equivalente a la región esperada

#### Scenario: No existen regiones
- **WHEN** la consulta de regiones termina exitosamente con una lista vacía
- **THEN** se permite calcular la lista general sin región y con sus descuentos generales

#### Scenario: Resultados incompatibles
- **WHEN** stock y precios tienen distintos contextos monetarios o faltan precios para productos mostrados
- **THEN** no se exponen precios finales ni descargas hasta obtener un conjunto completo y compatible
- **AND** una recuperación automática por discrepancia monetaria se limita a un intento por transición y luego ofrece recuperación manual

### Requirement: Selecciones vigentes y respuestas atrasadas

Las listas SHALL vincular datos, estado de carga y errores a su cliente, PDV, región y generación de solicitud vigentes. Cambiar selección, disponibilidad comercial o acceso MUST invalidar inmediatamente la vista y las exportaciones anteriores. Una respuesta o error atrasado MUST NOT publicar datos ni disparar eventos de recuperación para una selección abandonada.

#### Scenario: Cambiar PDV o región durante la carga
- **WHEN** se cambia la selección de A a B y la respuesta de A llega después
- **THEN** se muestra solamente el estado y los datos de B y no se acepta la lista de A para exportar

#### Scenario: Regreso rápido a la misma selección
- **WHEN** se cambia de A a B y de nuevo a A antes de que termine el primer pedido
- **THEN** el primer pedido de A sigue siendo obsoleto y no puede completar la carga ni una descarga de la nueva generación

### Requirement: Exportación de una lista válida y autorizada

Cada descarga PDF o Excel SHALL partir de una lista completa y válida, revalidar acceso al par vigente y respetar filtros, columnas y política monetaria existentes. Un cambio de selección, cliente inactivo, fallo o revocación durante el diálogo o la comprobación MUST cancelar la descarga. Conservar vista anterior SHALL limitarse a un snapshot válido del mismo par y región, autorizado nuevamente.

#### Scenario: Carga o error al confirmar
- **WHEN** se intenta confirmar una exportación con precios pendientes, fallidos o sin contexto válido
- **THEN** no se genera archivo y se explica que la lista debe cargarse correctamente

#### Scenario: Revocación después de abrir el diálogo
- **WHEN** se pierde el acceso al cliente o PDV entre abrir el selector de columnas y confirmar la descarga
- **THEN** la revalidación rechaza la exportación y retira los datos protegidos

#### Scenario: Cotización modificada con snapshot válido
- **WHEN** existe una lista válida del mismo contexto autorizado y cambia su cotización
- **THEN** se mantienen las opciones de conservar la vista anterior o actualizar y regenerar
- **AND** la descarga conserva columnas, filtros, región y nombres correctos para el snapshot elegido
