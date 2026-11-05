# Design

## Context

Ver [proposal.md](proposal.md) para motivación y alcance. La evidencia es estática
del checkout local y no constituye validación de navegación ni de producción.

- `src/components/layout/Sidebar/Sidebar.tsx` expone Clientes, Productos, Stock,
  Lista de precios y Configuración; deja fuera Operaciones, Cuentas y Reposición.
- `src/context/SucursalContext.tsx` consume `sucursalClient.obtenerTodas()` para PDV
  propios activos. Su opción Todas no representa hoy una autorización del backend.
- `StockCatalogo` usa `useCatalogoPaginado` y valores únicos del servidor. `StockForm`
  toma el PDV del registro cargado para edición y permite ajustar cantidades/baja.
- `ClienteForm` obtiene todas las sucursales con `obtenerParaAdmin()`, envía el array
  completo de asociaciones y pasa `cliente.sucursales` a regiones y listas de precios.
- `CategoriasConfiguracion`, `RegionesConfiguracion` y `ConfiguracionView` reutilizan
  el catálogo administrativo global. Sus necesidades son distintas.
- `useListaPrecios` descarga todo el stock y filtra por el PDV seleccionado.
  `useListaPreciosCliente` elige entre los PDV del cliente; ambas exportan en cliente.
- `useExportacionCotizacion` permite conservar o actualizar snapshots frente a un
  cambio de tasa. La nueva autorización debe convivir con esa política.
- `SucursalesConfiguracion` ya diferencia `asignado` y `puedeAdministrar`;
  `CotizacionConfiguracion` ya respeta `puede_actualizar` informado por el backend.

## Goals / Non-Goals

**Goals:** consumir DTO ya autorizados, preservar la edición parcial de clientes,
separar referencias globales de selectores propios y retirar datos inválidos tras
un rechazo o cambio de contexto sin perder las fórmulas/formatos existentes.

**Non-Goals:** duplicar reglas SQL en React, descargar todo para filtrar después,
agregar un gestor genérico de permisos, modificar login/middleware, habilitar módulos
ocultos o reescribir los generadores PDF/Excel.

## Decisions

### 1. Contextos propios y referencias globales separados

Conservar `SucursalContext` como fuente de PDV propios activos para operaciones
visibles. El catálogo administrativo restringido incluye también propios inactivos
para configuración o para conservar vínculos existentes en edición de clientes.
No mezclar esas dos listas con la nueva referencia global mínima.

Agregar un tipo específico de referencia global y un método de cliente HTTP para
`GET /api/sucursales/referencias-globales`, con solo `id`, `nombre`, `activo`,
`es_central`. No tiparlo como `Sucursal` con descuentos/cotizaciones inventados.
`CategoriasConfiguracion` lo usa para todas sus excepciones por PDV;
`SucursalesConfiguracion` puede usarlo para identificar la central vigente.
`RegionesConfiguracion`, `ClienteForm`, stock y precios usan alcance propio.

Alternativas descartadas: filtrar la respuesta administrativa global en React
(los datos ya se descargaron) y restringir todo por igual (rompe las excepciones
confirmadas de categorías y central). Mantener los componentes y CSS Modules.

### 2. Contratos coordinados y manejo de respuestas

El [diseño del backend](../../../../casa-segura-backend/openspec/changes/limitar-acceso-por-pdv/design.md)
define la semántica HTTP compartida:

| Contrato | Consumo previsto |
| --- | --- |
| `/api/sucursales` | PDV propios activos para selectores protegidos. |
| `/api/sucursales/admin?todas=true` | Fichas propias; inactivos cuando corresponda. |
| `/api/sucursales/referencias-globales` | Referencias mínimas para categorías y central. |
| 403 `SUCURSAL_FUERA_DE_ALCANCE` | Retirar el contexto rechazado y sus datos; refrescar alcance. |
| 404 `RECURSO_NO_DISPONIBLE` | Detalle no disponible sin datos previos ni acciones. |
| Región con `puede_modificar: false`, `motivo_bloqueo: REGION_COMPARTIDA_FUERA_DE_ALCANCE` | Mostrar proyección de consulta, sin administración. |
| 403 `REGION_COMPARTIDA_FUERA_DE_ALCANCE` al guardar | Refrescar capacidad y bloquear edición, sin simular éxito. |
| PATCH cliente con `{status:'success', data:null, acceso_revocado:true}` | Guardado exitoso, limpiar cliente y regresar al catálogo. |
| Opciones de asignación sin permiso | `puede_administrar:false`, usuarios/roles vacíos. |

Actualizar los clients de stock, cliente, región, sucursal y cotización para
conservar códigos y no transformar los errores en datos vacíos indistinguibles.
Usar `apiFetch` y los patrones de `CatalogoApiError` existentes con la adaptación
mínima necesaria; no construir una capa de permisos genérica. El detalle 404 puede
representarse como no disponible, pero no como un formulario nuevo o un éxito.

### 3. Cliente compartido: proyección visible y edición común

Decisión confirmada: cliente A+B editable por usuario de A. El backend devuelve
solo vínculos y regiones propios; el frontend no necesita conocer ni preservar B
por su cuenta. `sucursal_ids` expresa únicamente el conjunto propio deseado y su
omisión deja relaciones intactas. El backend hace la unión con los vínculos ajenos.

Mantener un cliente único. En el editor de datos/descuentos indicar que son comunes
al cliente y pueden utilizarse en otros PDV, sin enumerar relaciones ocultas.
Crear exige al menos un PDV propio activo. Editar puede enviar un array vacío: el
backend determina si quedan vínculos globales, sin exponerlos. En caso exitoso con
`acceso_revocado`, limpiar detalle, descuentos, listas, borrador y modal, notificar
y navegar al catálogo. No recargar el cliente después de esa respuesta.

Los editores de región y selectores de listas usan la intersección de
`cliente.sucursales` autorizadas y el alcance propio vigente. Una región mixta sirve
para asignación en A aunque su administración global esté bloqueada. Los descuentos
especiales por categoría/producto del cliente requieren cliente visible y siguen
siendo comunes; no confundirlos con la configuración global de categorías.

### 4. Regiones y configuración

Agregar capacidad de modificación al tipo `Region` y a su mapeo. La proyección
`sucursales=[A]` no demuestra que la región sea totalmente propia: respetar
`puede_modificar` del servidor. RAB se muestra con A y la explicación de que también
afecta a PDV fuera de alcance, sin identificarlos. Deshabilitar u ocultar sus botones
de edición/baja/cambio de PDV. Las regiones propias usan el formulario existente.

`ConfiguracionView` calcula contadores sobre listas autorizadas, no sobre las
referencias globales. Categorías mantiene su contador y ABM globales. En
`SucursalesConfiguracion`, nombre/descuento/cotización propia/estado/asignaciones
solo se muestran para fichas propias. Se conservan usuarios.administrar, creación
de PDV con autoasignación y prohibiciones de autoquitarse/cambiarse el rol.

Marcar A central conserva el efecto global sobre la antigua central B y refresca
la referencia mínima. No habilitar otros campos de B. `CotizacionConfiguracion`
conserva `puede_actualizar` global, versiones y conflictos actuales; las sugerencias
se limitan a PDV propios. El catálogo de productos sigue usando el contexto general.

### 5. Stock y exportaciones sin datos ajenos ni snapshots residuales

`StockCatalogo` consume resultados y filtros ya autorizados del servidor. No llenar
selectores con referencias globales. `StockForm` no permite usar un stock ajeno por
ID y su selector de alta contiene solo propios activos.

Modificar `useListaPrecios` para solicitar stock del PDV seleccionado, en lugar de
descargar stocks de todo el tenant. Si no hay selección válida, no hacer la consulta
ni habilitar exportaciones. El cambio de PDV limpia inmediatamente la tabla previa.
Mantener los contadores/refs de solicitudes que ya existen en los hooks y extender
su invalidación a pérdida de alcance, cambio de cliente y modal cerrado.

Antes de cada descarga, volver a consultar el endpoint autorizado de la lista
general o del cliente para ese mismo par. La respuesta es la comprobación de acceso
y puede reutilizarse si se elige actualizar el snapshot. Si devuelve 403/404, limpiar
datos y cancelar la descarga. Si se autoriza, mantener la política actual de
conservar/actualizar la cotización y las columnas, filtros, nombres y formatos de
archivo. Conservar un snapshot antiguo requiere que sea del mismo par autorizado.
No agregar un endpoint exclusivamente para exports ni cambiar las fórmulas.

Una revocación no puede retirar archivos ya descargados ni datos que el usuario
recibió mientras estaba autorizado. La garantía es cancelar nuevas solicitudes,
acciones y descargas tras la comprobación actual y retirar datos al conocer el rechazo.

### 6. Estados de carga, vacío y permisos revocados

No resolver un error de carga usando listas globales ni dejando que un filtro
vacío signifique tenant completo. Distinguir cargando, error, sin asignaciones y
sin resultados. Reutilizar los mensajes/componentes existentes y dar una salida
al catálogo cuando un detalle no está disponible.

Refrescar el alcance al recuperar foco o al recibir un rechazo de autorización;
no hace falta agregar realtime ni polling. Invalidar selections y requests en curso
para que una respuesta tardía no reactive datos rechazados. Solo se cambia la
actualización del contexto por PDV, sin rediseñar la autenticación de sesión.

## Risks / Trade-offs

- Un cliente compartido conserva efectos comunes sobre otros PDV → decisión del
  usuario, indicación visible y guardado parcial de relaciones garantizado por backend.
- Respuestas más pequeñas cambian supuestos de formularios actuales → actualizar
  todos los consumidores de sucursalClient y cliente.sucursales dentro del alcance.
- Un PDV oculto puede seguir siendo nombrado en Categorías → referencia mínima
  deliberada para la excepción global; nunca reutilizarla como autorización.
- Snapshots pueden sobrevivir en hooks/modales → invalidar al cambiar contexto,
  atender rechazos y revalidar antes de exportar sin alterar la política monetaria.
- Limitar regiones mixtas agrega un estado de consulta → comunicar la causa y
  mantener la asignación a clientes propios, sin permitir una edición incompleta.

## Migration Plan

1. Implementar clients/tipos/contextos contra los contratos del backend coordinado,
   sin habilitar temporalmente un fallback a datos globales.
2. Adaptar stock, clientes/listas y configuración; conservar las excepciones y el
   menú actual. Agregar pruebas de comportamiento sobre límites y relaciones.
3. Verificar ambos repos en un entorno conjunto con usuarios A, A+D, sin PDV y
   administrador solo A; probar clientes/regiones compartidos y exportaciones.
4. Desplegar ambos cambios coordinados después de la validación. Si falla el
   contrato de guardado parcial, retirar la entrega conjunta; no usar un frontend
   antiguo para reemplazar relaciones contra un contrato incompatible.
