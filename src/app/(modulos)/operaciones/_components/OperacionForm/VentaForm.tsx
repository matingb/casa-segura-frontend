'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import { clienteClient } from '../../../../../lib/api/cliente.client';
import { Cliente } from '../../../../../lib/types/Cliente';
import {
  descuentoEngineClient,
  EvaluacionOperacionResultado,
} from '../../../../../lib/api/descuento-engine.client';
import { formatARS } from '../../../../../lib/utils/formatters';
import ItemsEditor, { importeItem } from './ItemsEditor';
import PagoEditor from './PagoEditor';
import ResumenOperacion from './ResumenOperacion';
import OperacionFormLayout from './OperacionFormLayout';
import { aCuentasInput, calcularPago, validarPago, FilaPago, ModoPagoElegido } from './pago';
import styles from './OperacionFormLayout.module.css';

export default function VentaForm() {
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalElegida, setSucursalElegida] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [evaluacionDescuentos, setEvaluacionDescuentos] = useState<EvaluacionOperacionResultado | null>(null);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [descuentoArs, setDescuentoArs] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([
    { productoSucursalId: '', cantidad: 1, cantidadImpactadaStock: 1 },
  ]);
  const [modoPago, setModoPago] = useState<ModoPagoElegido>('unica');
  const [filasPago, setFilasPago] = useState<FilaPago[]>([]);
  const [tasas, setTasas] = useState<Map<string, number>>(new Map());
  const [margenInvalido, setMargenInvalido] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleTasasChange = useCallback((t: Map<string, number>) => setTasas(t), []);
  const handleMargenInvalidoChange = useCallback((v: boolean) => setMargenInvalido(v), []);

  // Carga de clientes para selector
  useEffect(() => {
    clienteClient
      .obtenerTodos({ operativo: true })
      .then((data) => setClientes(data))
      .catch((err) => {
        console.warn('[VentaForm] No se pudieron cargar los clientes:', err);
        setClientes([]);
      });
  }, []);

  // Si hay sucursales disponibles, se selecciona la primera por defecto.
  const sucursalId = sucursalElegida || (sucursales.length > 0 ? sucursales[0].id : '');

  // Evaluación centralizada de descuentos y margen de ganancia
  useEffect(() => {
    if (!sucursalId) {
      setEvaluacionDescuentos(null);
      return;
    }

    const itemsValidos = items
      .filter((it) => Boolean(it.productoSucursalId))
      .map((it) => ({
        productoSucursalId: it.productoSucursalId,
        cantidad: it.cantidad || 1,
        precioManual: it.precioUnitArs,
      }));

    if (itemsValidos.length === 0) {
      setEvaluacionDescuentos(null);
      return;
    }

    let activo = true;
    const timer = setTimeout(() => {
      descuentoEngineClient
        .evaluarOperacion(sucursalId, itemsValidos, clienteId || null)
        .then((res) => {
          if (activo) {
            setEvaluacionDescuentos(res);
          }
        })
        .catch((err) => {
          console.warn('[VentaForm] Error evaluando descuentos centralizados:', err);
        });
    }, 150);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [sucursalId, clienteId, items]);

  // Actualiza margenInvalido según el análisis centralizado
  useEffect(() => {
    if (evaluacionDescuentos?.resumen) {
      setMargenInvalido(
        evaluacionDescuentos.resumen.hayMargenPerforado ||
        evaluacionDescuentos.resumen.hayVentaEnPerdida
      );
    }
  }, [evaluacionDescuentos]);

  // Aplica los precios sugeridos calculados en cascada para el cliente seleccionado
  const aplicarPreciosSugeridos = useCallback(() => {
    if (!evaluacionDescuentos?.items) return;
    setItems((prev) =>
      prev.map((it) => {
        const match = evaluacionDescuentos.items.find(
          (e) => e.productoSucursalId === it.productoSucursalId
        );
        if (match && match.precioSugerido > 0) {
          return { ...it, precioUnitArs: match.precioSugerido };
        }
        return it;
      })
    );
  }, [evaluacionDescuentos]);

  const hayPreciosSugeridosDiferentes = useMemo(() => {
    if (!evaluacionDescuentos?.items) return false;
    return items.some((it) => {
      const match = evaluacionDescuentos.items.find(
        (e) => e.productoSucursalId === it.productoSucursalId
      );
      return match && it.precioUnitArs !== undefined && match.precioSugerido < it.precioUnitArs;
    });
  }, [items, evaluacionDescuentos]);

  const analisisMargenItems = useMemo(() => {
    if (!evaluacionDescuentos?.items) return undefined;
    return items.map((it) => {
      if (!it.productoSucursalId) return null;
      const match = evaluacionDescuentos.items.find(
        (e) => e.productoSucursalId === it.productoSucursalId
      );
      return match ? match.analisisMargen : null;
    });
  }, [items, evaluacionDescuentos]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + importeItem(item, 'venta'), 0),
    [items]
  );

  const descuentoNumero = Number(descuentoArs);
  const descuentoValido = descuentoArs === '' || Number.isFinite(descuentoNumero);
  const descuento = descuentoArs === '' || !descuentoValido ? 0 : descuentoNumero;

  // Base sobre la que se reparte entre cuentas: lo vendido menos el descuento.
  const mercaderia = subtotal - descuento;

  const pago = useMemo(
    () => calcularPago(mercaderia, filasPago, tasas, modoPago),
    [mercaderia, filasPago, tasas, modoPago]
  );
  const registrarFinanzasAhora = modoPago !== 'pendiente';
  const totalOperacion = registrarFinanzasAhora ? pago.total : mercaderia;

  // Sin un producto con importe cargado no hay monto que repartir entre cuentas.
  const hayProductos = items.some(
    (item) => item.productoSucursalId && (item.cantidad || 0) > 0 && (item.precioUnitArs ?? 0) > 0
  );

  const unidades = useMemo(
    () =>
      items
        .filter((item) => Boolean(item.productoSucursalId))
        .reduce((sum, item) => sum + (item.cantidadImpactadaStock ?? item.cantidad ?? 0), 0),
    [items]
  );

  const sucursalNombre = sucursales.find((s) => s.id === sucursalId)?.nombre;

  /** Limpia el error de un campo apenas el usuario lo edita. */
  const limpiarError = useCallback((campo: string) => {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const resto = { ...prev };
      delete resto[campo];
      return resto;
    });
  }, []);

  const validar = (): Record<string, string> => {
    const nuevos: Record<string, string> = {};

    if (!sucursalId) nuevos.sucursalId = 'Elegí una sucursal.';

    if (!descuentoValido) {
      nuevos.descuentoArs = 'Ingresá un número válido.';
    } else if (descuento < 0) {
      nuevos.descuentoArs = 'El descuento no puede ser negativo.';
    } else if (descuento > subtotal) {
      nuevos.descuentoArs = 'El descuento no puede superar el subtotal.';
    }

    if (items.length === 0) {
      nuevos.items = 'Agregá al menos un producto.';
    } else {
      items.forEach((item, i) => {
        if (!item.productoSucursalId) nuevos[`items.${i}.producto`] = 'Elegí un producto.';
        if (!item.cantidad || item.cantidad <= 0) {
          nuevos[`items.${i}.cantidad`] = 'Tiene que ser mayor a 0.';
        }
        const cantidadImpactada = item.cantidadImpactadaStock ?? item.cantidad;
        if (!Number.isInteger(cantidadImpactada) || cantidadImpactada < 0 || cantidadImpactada > item.cantidad) {
          nuevos[`items.${i}.impactoStock`] = 'Debe ser un entero entre 0 y la cantidad.';
        }
        if (item.precioUnitArs === undefined || item.precioUnitArs <= 0) {
          nuevos[`items.${i}.unitario`] = 'Tiene que ser mayor a 0.';
        }
      });
    }

    if (margenInvalido) {
      nuevos.margen =
        'Hay productos por debajo del margen mínimo configurado. Corregí los precios marcados para continuar.';
    }

    if (registrarFinanzasAhora) {
      validarPago({
        mercaderia,
        modo: modoPago,
        filas: filasPago,
        resultado: pago,
        politicaExceso: 'limitar',
      }).forEach((e) => {
        nuevos[e.campo] = e.mensaje;
      });
    }

    return nuevos;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // El botón siempre está habilitado: al tocarlo se muestra lo que falta.
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    await crear({
      tipo: 'venta',
      sucursalId,
      registrarFinanzasAhora,
      modoReparto: 'monto',
      items,
      cuentas: registrarFinanzasAhora ? aCuentasInput(pago) : [],
      venta: {
        numeroComprobante: numeroComprobante.trim() || undefined,
        subtotalArs: subtotal,
        descuentoArs: descuento > 0 ? descuento : undefined,
        totalArs: totalOperacion,
      },
    });
  };

  return (
    <OperacionFormLayout
      titulo="Nueva venta"
      error={error}
      total={totalOperacion}
      etiquetaTotal="Total a cobrar"
      etiquetaAccion="Registrar venta"
      submitting={submitting}
      onSubmit={handleSubmit}
      cabecera={
        <>
          <div>
            <Select
              id="sucursal"
              label="Sucursal"
              value={sucursalId}
              onChange={(e) => {
                limpiarError('sucursalId');
                setSucursalElegida(e.target.value);
              }}
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
            {errores.sucursalId && <span className={styles.errorCampo}>{errores.sucursalId}</span>}
          </div>

          <div>
            <Select
              id="cliente"
              label="Cliente (opcional)"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Consumidor Final (Sin cliente)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial ? `${c.razonSocial} (${c.nombre})` : c.nombre}
                  {c.descuentoPorcentaje ? ` [${c.descuentoPorcentaje}% desc.]` : ''}
                </option>
              ))}
            </Select>
            {evaluacionDescuentos?.cliente && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                {evaluacionDescuentos.cliente.regionNombre && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.08)', color: '#4338ca', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    📍 Región: {evaluacionDescuentos.cliente.regionNombre} (-{evaluacionDescuentos.cliente.regionDescuento}%)
                  </span>
                )}
                {evaluacionDescuentos.cliente.descuentoHabitual != null && evaluacionDescuentos.cliente.descuentoHabitual > 0 && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.08)', color: '#047857', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    ⭐ Habitual: -{evaluacionDescuentos.cliente.descuentoHabitual}%
                  </span>
                )}
              </div>
            )}
          </div>

          <Input
            label={<>Número de comprobante <span className={styles.campoOpcional}>(opcional)</span></>}
            value={numeroComprobante}
            onChange={(e) => setNumeroComprobante(e.target.value)}
          />

          <div>
            <Input
              label={<>Descuento ($) <span className={styles.campoOpcional}>(opcional)</span></>}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={descuentoArs}
              onChange={(e) => {
                limpiarError('descuentoArs');
                setDescuentoArs(e.target.value);
              }}
            />
            {errores.descuentoArs && <span className={styles.errorCampo}>{errores.descuentoArs}</span>}
          </div>
        </>
      }
      resumen={
        <>
          <ResumenOperacion
            mercaderia={subtotal}
            recargos={pago.recargos}
            total={totalOperacion}
            etiquetaTotal="Total a cobrar"
            lineasExtra={descuento > 0 ? [{ etiqueta: 'Descuento adicional', valor: descuento, negativo: true }] : []}
            etiquetaAccion="Registrar venta"
            submitting={submitting}
          />
          {evaluacionDescuentos?.resumen.gananciaTotalEstimada != null && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <span>Ganancia estimada:</span>
                <strong style={{ color: evaluacionDescuentos.resumen.gananciaTotalEstimada >= 0 ? '#16a34a' : '#dc2626' }}>
                  {formatARS(evaluacionDescuentos.resumen.gananciaTotalEstimada)}
                </strong>
              </div>
              {evaluacionDescuentos.resumen.margenEfectivoPromedio != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  <span>Margen prom. efectivo:</span>
                  <strong style={{ color: evaluacionDescuentos.resumen.margenEfectivoPromedio >= 0 ? '#16a34a' : '#dc2626' }}>
                    +{evaluacionDescuentos.resumen.margenEfectivoPromedio}%
                  </strong>
                </div>
              )}
            </div>
          )}
        </>
      }
    >
      <div>
        {/* Banner: Descuentos disponibles para aplicar */}
        {hayPreciosSugeridosDiferentes && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#3730a3',
              fontSize: '0.84rem',
            }}
          >
            <span>
              🏷️ <strong>Descuentos disponibles:</strong> El cliente tiene descuentos configurados para los productos cargados.
            </span>
            <button
              type="button"
              onClick={aplicarPreciosSugeridos}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Aplicar precios con descuento
            </button>
          </div>
        )}

        {/* Banner: Tope de margen aplicado */}
        {evaluacionDescuentos?.resumen.hayTopeAplicado && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#b45309',
              fontSize: '0.84rem',
            }}
          >
            <span>🛡️</span>
            <span>
              <strong>Tope de margen aplicado:</strong> Uno o más productos alcanzaron el precio mínimo permitido (costo + margen). Los descuentos se limitaron para proteger la rentabilidad.
            </span>
          </div>
        )}

        {/* Banner: Margen perforado o venta en pérdida */}
        {(evaluacionDescuentos?.resumen.hayMargenPerforado || evaluacionDescuentos?.resumen.hayVentaEnPerdida) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              marginBottom: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#b91c1c',
              fontSize: '0.84rem',
            }}
          >
            <span>🚨</span>
            <span>
              <strong>Margen no alcanzado:</strong> Hay productos por debajo del margen mínimo permitido o a pérdida. Ajustá los precios unitarios para continuar.
            </span>
          </div>
        )}

        <ItemsEditor
          sucursalId={sucursalId}
          items={items}
          onChange={setItems}
          modo="venta"
          onMargenInvalidoChange={handleMargenInvalidoChange}
          errores={errores}
          onCampoEditado={limpiarError}
          unidades={-unidades}
          sucursalNombre={sucursalNombre}
          analisisMargenItems={analisisMargenItems}
        />
        {errores.items && <span className={styles.errorCampo}>{errores.items}</span>}
        {errores.margen && <div className={styles.errorBanner}>{errores.margen}</div>}
      </div>

      <PagoEditor
        mercaderia={mercaderia}
        modo={modoPago}
        onModoChange={setModoPago}
        filas={filasPago}
        onFilasChange={setFilasPago}
        onTasasChange={handleTasasChange}
        errores={errores}
        onCampoEditado={limpiarError}
        etiquetaAccion="cobrar"
        etiquetaDebita="Acredita"
        etiquetaPendiente="No cobrar ahora"
        detallePendiente="La venta queda pendiente de cobro."
        habilitado={hayProductos}
        politicaExceso="limitar"
      />
    </OperacionFormLayout>
  );
}
