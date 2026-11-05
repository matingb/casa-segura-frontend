# Spec Delta

## Purpose

Presentar configuración comercial y administración de PDV coherentes con las
asignaciones, conservando las excepciones de categorías, central y cotización general.

## ADDED Requirements

### Requirement: Configuración completa solo para PDV propios

La interfaz SHALL listar datos completos de PDV propios, incluidos sus inactivos cuando se soliciten. Descuento, cotización propia, estado, resumen de uso y usuarios de PDV ajenos MUST NOT cargarse. Las referencias mínimas globales se reservan a las excepciones.

#### Scenario: Configuración de un usuario de A
- **WHEN** el usuario abre Sucursales y B pertenece al mismo tenant pero no está asignado
- **THEN** no recibe ni muestra la ficha comercial ni los usuarios de B
- **AND** puede identificar la central actual mediante una referencia mínima si es necesario

#### Scenario: PDV propio inactivo
- **WHEN** el usuario está asignado a D inactivo y activa la visualización de inactivos
- **THEN** puede ver D y utilizar la reactivación con las validaciones existentes

### Requirement: Administración de usuarios conserva el permiso existente

La interfaz SHALL habilitar creación de PDV y modificación de sus asignaciones según puede_administrar entregado por el backend. El editor opera solo sobre un PDV propio existente; un usuario sin ese permiso MUST NOT recibir ni utilizar el catálogo global de usuarios asignables.

#### Scenario: Sin administración de usuarios
- **WHEN** el backend devuelve puede_administrar=false y opciones vacías
- **THEN** se muestran las asignaciones existentes del PDV propio sin controles para modificarlas ni un directorio global de usuarios

#### Scenario: Crear PDV como administrador
- **WHEN** el usuario posee el permiso existente y crea un PDV
- **THEN** se conserva el flujo de alta y la autoasignación actual y se actualiza el contexto de PDV propios

### Requirement: Regiones filtradas y capacidad de edición explícita

La interfaz SHALL mostrar solo regiones con PDV propios y utilizar sus sucursales proyectadas. Cuando puede_modificar=false y motivo_bloqueo=REGION_COMPARTIDA_FUERA_DE_ALCANCE, MUST ocultar o deshabilitar editar, eliminar, desactivar y cambiar sus PDV, con una explicación visible.

#### Scenario: Región compartida con PDV ajenos
- **WHEN** RAB incluye A+B y el usuario solo pertenece a A
- **THEN** ve RAB con A y una explicación de que afecta a PDV fuera de su alcance
- **AND** no ve los nombres de B ni puede cambiar nombre, descuento, estado o asociaciones de RAB

#### Scenario: Región totalmente propia
- **WHEN** RA incluye únicamente A y el backend informa puede_modificar=true
- **THEN** el editor está disponible y su selector solo ofrece PDV propios activos para nuevas asociaciones

### Requirement: Categorías mantienen configuración global

La interfaz SHALL conservar ABM y descuentos generales de categorías/subcategorías y excepciones para cualquier PDV del tenant. Para identificar esos PDV utiliza referencias mínimas globales, sin convertirlas en opciones de clientes, stock o regiones.

#### Scenario: Excepción de descuento para B
- **WHEN** un usuario de A configura el descuento de una categoría o subcategoría en B
- **THEN** B continúa seleccionable y la acción conserva las validaciones actuales sin requerir asociación a B

### Requirement: Designación de central mantiene su efecto global

La interfaz SHALL conservar la posibilidad de marcar un PDV propio como casa central y refrescar la referencia de central vigente después del cambio. MUST NOT habilitar mediante esa acción otros campos o usuarios de un PDV ajeno.

#### Scenario: A reemplaza a B como central
- **WHEN** el usuario designa A como central y el servidor confirma el cambio
- **THEN** se muestra A como nueva central sin abrir ni cargar la ficha completa de B

### Requirement: Cotización general global y cotizaciones propias restringidas

La interfaz SHALL mantener la edición general según puede_actualizar, conservando validaciones de versión. Los editores y sugerencias de cotización propia SHALL incluir únicamente PDV propios autorizados; la falta de asociación a PDV que heredan la tasa general no agrega bloqueos.

#### Scenario: Editar cotización general desde A
- **WHEN** el usuario de A tiene puede_actualizar=true y B hereda la cotización general
- **THEN** el formulario general permite guardar con la versión vigente sin exigir asociación a B

#### Scenario: Sugerencias y edición propia
- **WHEN** se consulta la cotización general o se abre la edición propia de un PDV
- **THEN** las sugerencias no muestran tasas propias de B y solo se ofrecen editores de PDV autorizados

### Requirement: Conteos de configuración con semántica explícita

La interfaz SHALL calcular los indicadores de sucursales y regiones sobre el conjunto autorizado visible. Los conteos globales de categorías se conservan. MUST distinguir las referencias globales usadas por excepciones de los conteos de PDV administrables.

#### Scenario: Indicadores de pestañas
- **WHEN** un usuario de A abre Configuración y existen regiones y PDV exclusivamente de B
- **THEN** los indicadores de sucursales y regiones no los cuentan y el indicador de categorías mantiene su alcance global
