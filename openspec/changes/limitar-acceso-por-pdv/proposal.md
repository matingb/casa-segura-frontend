# Proposal

## Why

Las pantallas visibles muestran stock, clientes y opciones comerciales de PDV a los
que el usuario no está asociado. La interfaz debe trabajar con datos autorizados por
el backend y ofrecer únicamente las acciones válidas para sus PDV.

## What Changes

- **BREAKING**: limitar los catálogos, selectores, detalles, formularios, filtros,
  totales y exportaciones de stock/clientes/listas/regiones a los PDV del usuario.
  Proteger también la entrada por URL directa y el manejo de rechazos del backend.
- Los clientes compartidos se pueden ver y editar por coincidir en al menos un PDV.
  Los datos comunes y descuentos son únicos y pueden repercutir en todos sus PDV;
  asociaciones y regiones ajenas se ocultan y se conservan al guardar.
- Dejar de usar `obtenerParaAdmin()` como catálogo global en formularios de clientes
  y regiones. Usar una referencia global mínima únicamente para las excepciones.
- Mostrar las regiones mixtas con sus PDV visibles y sin acciones de administración;
  permitir asignarlas a clientes en PDV propios.
- Conservar el catálogo de productos, la configuración completa de categorías y
  subcategorías, la designación de casa central y la cotización general autorizada
  por su permiso global actual. Los descuentos de categorías por PDV siguen globales.
- Limpiar datos y exportaciones al recibir pérdida de acceso; evitar selecciones
  de PDV inválidas y respuestas tardías de consultas anteriores.

## Capabilities

### New Capabilities

- `acceso-por-pdv`: contexto de PDV y experiencia de rechazo y excepciones globales.
- `stock-y-listas-por-pdv`: catálogo de stock, formularios, listas y exportaciones autorizadas.
- `clientes-por-pdv`: catálogos, edición compartida, asociaciones, descuentos y regiones.
- `configuracion-por-pdv`: PDV propios, regiones mixtas y cotizaciones.

### Modified Capabilities

Ninguna: el repositorio se inicializa sin specs principales previas. Los requisitos
describen el comportamiento objetivo y no afirman que ya esté implementado.

## Impact

`SucursalContext`, clientes HTTP y pantallas de `stock`, `clientes`, `lista-precios`
y `configuracion` en `src/app/(modulos)`. Mantener Next.js, CSS Modules y componentes
base existentes. No se requieren nuevas dependencias.
El [change par del backend](../../../../casa-segura-backend/openspec/changes/limitar-acceso-por-pdv/proposal.md)
es responsable de autorizar las APIs que estas pantallas consumen.

Fuera de alcance: páginas/APIs ocultas de Operaciones, Pedidos de reposición y
Cuentas financieras, habilitar sus enlaces, rediseñar autenticación, fórmulas de
precios/exportaciones y auditoría integral de Supabase/Data API/RLS. El alcance del
backend incluye llamadas directas a las APIs utilizadas por estas pantallas: un
selector restringido por sí solo no implementa autorización. Este pedido deja
únicamente configuración de OpenSpec y artefactos; las tareas de producto quedan pendientes.
