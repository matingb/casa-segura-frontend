# Spec Delta

## Purpose

Permitir consultar y gestionar los clientes de PDV asociados, incluyendo clientes
compartidos, sin mostrar ni sobrescribir sus relaciones específicas con PDV ajenos.

## ADDED Requirements

### Requirement: Catálogo y detalle de clientes propios o compartidos

La interfaz SHALL mostrar clientes que compartan al menos un PDV con el usuario, una sola vez por cliente. Los filtros y totales deben corresponder al resultado autorizado y las URL de clientes ajenos MUST mostrar un recurso no disponible.

#### Scenario: Clientes exclusivos y compartidos
- **WHEN** un usuario de A consulta clientes y existen CA de A, CB de B y CAB de A+B
- **THEN** ve CA y CAB con total dos, y no ve CB ni sus datos en búsqueda o filtros

#### Scenario: Cliente exclusivamente ajeno
- **WHEN** el usuario abre directamente el detalle o la edición de CB
- **THEN** la pantalla no presenta datos ni acciones utilizables y permite volver al catálogo

### Requirement: Datos comunes editables en un cliente compartido

La interfaz SHALL permitir editar datos comunes, estado y descuentos de un cliente accesible aunque tenga vínculos ajenos. Los descuentos habituales y especiales siguen siendo comunes al cliente; la interfaz MUST explicar ese alcance sin mostrar las relaciones ocultas.

#### Scenario: Edición desde A de un cliente compartido
- **WHEN** un usuario de A abre CAB asociado a A+B
- **THEN** puede modificar sus datos comunes y descuentos y ve una indicación de que esos datos son compartidos por el cliente
- **AND** no se le exige pertenecer a B ni se expone la región de CAB en B

### Requirement: Selector de asociaciones únicamente propias

La interfaz SHALL ofrecer solo PDV propios activos para agregar asociaciones. En edición puede mostrar vínculos propios inactivos ya existentes. MUST enviar únicamente la porción editable de sucursal_ids y utilizar el contrato de conservación de vínculos ajenos del backend.

#### Scenario: Alta con PDV propios
- **WHEN** un usuario de A crea un cliente
- **THEN** debe elegir al menos un PDV propio activo y B no aparece en el selector de clientes aunque esté disponible en Categorías

#### Scenario: Guardar el único vínculo visible
- **WHEN** CAB tiene A+B y la pantalla de un usuario de A muestra y envía únicamente A
- **THEN** el guardado conserva B mediante el contrato del backend y no construye una lista global de reemplazo en el navegador

### Requirement: Manejo de pérdida de acceso después de guardar

La interfaz SHALL interpretar la respuesta de edición `status: success`, `data: null`, `acceso_revocado: true` como una escritura exitosa que retiró el último vínculo propio. MUST limpiar el cliente y sus listas/descuentos, informar el resultado y volver al catálogo.

#### Scenario: Retirar A del cliente compartido
- **WHEN** el usuario de A retira su asociación a CAB y el backend informa acceso_revocado=true
- **THEN** se confirma el guardado y se informa que el cliente dejó de pertenecer a sus PDV
- **AND** se vuelve al catálogo sin intentar mostrar o recargar el cliente que conserva B

#### Scenario: No dejar un cliente sin PDV globales
- **WHEN** CA solo tiene A y el backend rechaza quitar su último vínculo
- **THEN** la pantalla conserva la edición, muestra la validación y no anuncia éxito

### Requirement: Descuentos autorizados por cliente accesible

La interfaz SHALL cargar y modificar descuentos habituales, de categoría/subcategoría y de producto únicamente para un cliente autorizado. Un rechazo de acceso al cliente MUST retirar también sus descuentos y acciones, sin conservar información de una consulta anterior.

#### Scenario: Descuento común permitido
- **WHEN** un usuario de A modifica el descuento especial de CAB
- **THEN** la acción sigue disponible como cambio común y no solicita elegir B ni consultar sus datos específicos

#### Scenario: Cliente deja de ser accesible
- **WHEN** una recarga o escritura de descuentos recibe 404 RECURSO_NO_DISPONIBLE
- **THEN** la pantalla retira los descuentos y deja de permitir nuevas modificaciones o exportaciones del cliente

### Requirement: Regiones de cliente limitadas a sus PDV visibles

La interfaz SHALL mostrar y permitir asignar/quitar regiones solo en PDV asociados al cliente y al usuario. Una región mixta puede seleccionarse para un PDV propio; las asociaciones y regiones ajenas MUST permanecer fuera del formulario y sin cambios.

#### Scenario: Asignar región mixta en A
- **WHEN** CAB pertenece a A+B, RAB incluye A+B y el usuario pertenece solo a A
- **THEN** puede seleccionar RAB para A sin ver un editor para B ni administrar el descuento común de RAB

### Requirement: Listas y exportaciones siguen el alcance del cliente

La interfaz SHALL abrir listas y exportaciones de clientes solo para su intersección con los PDV propios. Los cambios de cliente o PDV y la pérdida de acceso MUST invalidar la tabla previa y sus acciones.

#### Scenario: Cliente o PDV anterior en memoria
- **WHEN** el usuario cambia de cliente o pierde acceso mientras está abierto el modal de precios
- **THEN** la tabla anterior deja de ser exportable y las respuestas tardías no la reactivan
