# Spec Delta

## Purpose

Mostrar y editar stock propio y generar listas de precios autorizadas, manteniendo
los formatos de exportación y las reglas monetarias actuales.

## ADDED Requirements

### Requirement: Catálogo de stock y filtros propios

La interfaz SHALL mostrar solo stock, conteos y opciones de filtro autorizados por el backend. MUST NOT descargar stocks de otros PDV para ocultarlos después en el navegador. La edición y el detalle de cada fila siguen el alcance del registro real.

#### Scenario: Catálogo con stock ajeno
- **WHEN** un usuario de A abre Stock y existen filas en A y B
- **THEN** solo recibe y muestra filas de A, con filtros y paginación calculados sobre A

#### Scenario: Detalle ajeno por URL
- **WHEN** el usuario abre un stock de B y el backend devuelve RECURSO_NO_DISPONIBLE
- **THEN** el detalle no muestra cantidades, precios, costos ni botones de edición o eliminación

### Requirement: Formularios de stock limitados al alcance

La interfaz SHALL permitir crear stock solo en PDV propios activos y editar o eliminar únicamente registros autorizados. Debe conservar validaciones de cantidades, mínimos, precio, costo, margen y baja con stock cero; un rechazo de alcance MUST cancelar la escritura sin simular éxito.

#### Scenario: Alta en A
- **WHEN** un usuario de A abre Nuevo stock
- **THEN** el selector ofrece solo PDV propios activos y no ofrece B aunque figure en Categorías

#### Scenario: Pérdida de acceso durante la edición
- **WHEN** el usuario guarda un stock y el backend rechaza la autorización
- **THEN** se informa el rechazo, se retiran las acciones y datos del recurso y no aparece un mensaje de guardado exitoso

### Requirement: Lista general y selección de PDV autorizada

La interfaz SHALL cargar la lista general y sus datos de stock solo para un PDV propio seleccionado. No genera consultas de listas sin un PDV válido y MUST evitar mezclar respuestas o contextos monetarios de distintas selecciones.

#### Scenario: Cambiar entre dos PDV propios
- **WHEN** el usuario cambia de A a D
- **THEN** la tabla y las acciones se vinculan a D y una respuesta tardía de A no se usa para mostrar o descargar la lista de D

#### Scenario: Sin selección o selección inválida
- **WHEN** no existen PDV propios o el ID seleccionado dejó de pertenecer al alcance
- **THEN** se limpia la lista y las exportaciones quedan deshabilitadas hasta obtener una selección autorizada

### Requirement: Lista de cliente solo para la intersección autorizada

La interfaz SHALL ofrecer en la lista de un cliente únicamente PDV asociados tanto al cliente como al usuario. El selector, la tabla, los descuentos y los archivos SHALL usar ese mismo par cliente–PDV autorizado.

#### Scenario: Cliente de A y B visto por usuario de A
- **WHEN** se abre la lista del cliente compartido CAB
- **THEN** solo se ofrece A, sin consultar la lista, la cotización ni los precios de CAB en B

### Requirement: Revalidación de acceso antes de exportar

La interfaz SHALL comprobar mediante una solicitud autorizada vigente el acceso al par correspondiente antes de cada descarga PDF o Excel. Un rechazo MUST limpiar los datos protegidos y cancelar la descarga, aunque hubiera un snapshot anterior en memoria.

#### Scenario: Revocación después de cargar la lista
- **WHEN** se revoca la asociación a A después de cargar una lista y el usuario intenta exportarla
- **THEN** la comprobación es rechazada y no se genera ningún archivo con la lista almacenada

#### Scenario: Exportación válida
- **WHEN** la autorización sigue vigente al exportar
- **THEN** se mantienen las columnas, formatos, filtros y política de snapshots/cotización existentes
- **AND** si se conserva un snapshot anterior, este corresponde al mismo par autorizado y no incluye datos ajenos
