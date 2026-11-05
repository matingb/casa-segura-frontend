# Spec Delta

## Purpose

Ofrecer una experiencia consistente con el alcance autorizado por PDV en las
pantallas visibles, sin convertir los filtros del navegador en autorización.

## ADDED Requirements

### Requirement: Selectores y alcance entregados por el servidor

La interfaz SHALL utilizar exclusivamente PDV autorizados por el backend en los flujos protegidos. La opción Todas SHALL significar todos los PDV propios. Referencias globales para categorías y casa central MUST NOT reutilizarse en selectores de stock, clientes, listas o regiones.

#### Scenario: Un usuario de A abre selectores protegidos
- **WHEN** el usuario pertenece a A y existen A y B en el tenant
- **THEN** los selectores protegidos solo ofrecen A y Todas no incorpora B

#### Scenario: Carga inicial sin contexto
- **WHEN** aún se están cargando los PDV o falla esa consulta
- **THEN** la interfaz muestra carga o error y no usa un catálogo global ni un filtro vacío para ampliar el alcance

### Requirement: Ausencia o pérdida de PDV asociados

La interfaz SHALL mostrar un estado vacío explícito cuando no hay PDV disponibles, deshabilitar altas protegidas y no seleccionar PDV ajenos como alternativa. Al refrescar el alcance SHALL descartar selecciones revocadas y los datos dependientes antes de utilizarlos.

#### Scenario: Usuario sin asignaciones
- **WHEN** el backend devuelve cero PDV propios
- **THEN** stock, clientes y listas no muestran datos ajenos ni permiten altas sin PDV
- **AND** productos, categorías y cotización general conservan sus reglas globales

#### Scenario: PDV revocado mientras la página está abierta
- **WHEN** una recarga de alcance o respuesta 403/404 informa que A dejó de ser accesible
- **THEN** se limpian selección, detalle y datos derivados de A y se ofrece volver a un flujo permitido

### Requirement: Acceso directo y errores sin datos residuales

La interfaz SHALL manejar 403 SUCURSAL_FUERA_DE_ALCANCE, 404 RECURSO_NO_DISPONIBLE y 403 REGION_COMPARTIDA_FUERA_DE_ALCANCE con mensajes comprensibles. MUST NOT mostrar detalles previos, habilitar guardado o interpretar un rechazo como permiso para consultar todo el tenant.

#### Scenario: URL directa de stock o cliente ajeno
- **WHEN** el usuario abre un enlace de detalle o edición fuera de alcance
- **THEN** ve un recurso no disponible sin datos residuales, formularios utilizables ni acciones de exportación

#### Scenario: Respuesta tardía de una selección anterior
- **WHEN** la selección cambia de A a D y llega después una respuesta de A
- **THEN** esa respuesta no reemplaza los datos ni habilita acciones para la selección vigente D

### Requirement: Excepciones de productos y categorías conservadas

La interfaz SHALL conservar las acciones actuales sobre el catálogo compartido de productos y la configuración completa de categorías/subcategorías, incluidas sus excepciones de descuento para cualquier PDV del tenant. Los selectores globales de esas excepciones solo usan referencias mínimas.

#### Scenario: Configurar una categoría para B desde A
- **WHEN** un usuario de A abre Categorías y elige B para una excepción
- **THEN** puede crear, editar o quitar esa excepción y no se le exige asociación a B
- **AND** el selector no recibe stock, cotización ni usuarios de B

#### Scenario: Editar un producto compartido
- **WHEN** un usuario de A edita un producto del catálogo compartido
- **THEN** sus acciones y validaciones actuales siguen disponibles sin restricciones nuevas por PDV

### Requirement: Casa central y cotización general mantienen excepciones

La interfaz SHALL permitir designar como central un PDV propio aunque el anterior sea ajeno. La edición de cotización general SHALL depender del permiso global informado por el backend, sin exigir asociación a todos los PDV que la heredan.

#### Scenario: Nueva casa central propia
- **WHEN** el usuario marca A como central y B era la central anterior
- **THEN** puede confirmar el cambio y el resultado identifica la nueva central sin habilitar edición de otros datos de B

#### Scenario: Cotización global autorizada
- **WHEN** el backend informa puede_actualizar=true para un usuario de A y B hereda la cotización general
- **THEN** el formulario global permanece habilitado sin pedir asociación a B

### Requirement: Navegación conserva los módulos excluidos

La interfaz SHALL mantener fuera del alcance de este change las pantallas y enlaces ocultos de Operaciones, Pedidos de reposición y Cuentas financieras. La implementación MUST NOT habilitarlos ni añadirles nuevos flujos como parte del cambio.

#### Scenario: Navegación tras la entrega
- **WHEN** se verifica el menú y los cambios de este trabajo
- **THEN** solo se modifican los flujos visibles alcanzados y no se incorporan enlaces ni criterios nuevos para los módulos excluidos
