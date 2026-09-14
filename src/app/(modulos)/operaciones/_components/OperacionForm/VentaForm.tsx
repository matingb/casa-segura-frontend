'use client';

import { useCallback, useMemo, useState } from 'react';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
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
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [descuentoArs, setDescuentoArs] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([]);
  const [modoPago, setModoPago] = useState<ModoPagoElegido>(null);
  const [filasPago, setFilasPago] = useState<FilaPago[]>([]);
  const [tasas, setTasas] = useState<Map<string, number>>(new Map());
  const [margenInvalido, setMargenInvalido] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleTasasChange = useCallback((t: Map<string, number>) => setTasas(t), []);
  const handleMargenInvalidoChange = useCallback((v: boolean) => setMargenInvalido(v), []);

  // No hay sucursal por defecto en el modelo: si el usuario tiene una sola, se usa esa.
  const sucursalId = sucursalElegida || (sucursales.length === 1 ? sucursales[0].id : '');

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

  // Sin un producto con importe cargado no hay monto que repartir entre cuentas.
  const hayProductos = items.some(
    (item) => item.productoSucursalId && (item.cantidad || 0) > 0 && (item.precioUnitArs ?? 0) > 0
  );

  const unidades = useMemo(
    () => items.reduce((sum, item) => sum + (item.cantidad || 0), 0),
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
        if (item.precioUnitArs === undefined || item.precioUnitArs <= 0) {
          nuevos[`items.${i}.unitario`] = 'Tiene que ser mayor a 0.';
        }
      });
    }

    if (margenInvalido) {
      nuevos.margen =
        'Hay productos por debajo del margen mínimo configurado. Corregí los precios marcados para continuar.';
    }

    validarPago({
      mercaderia,
      modo: modoPago,
      filas: filasPago,
      resultado: pago,
      politicaExceso: 'limitar',
    }).forEach((e) => {
      nuevos[e.campo] = e.mensaje;
    });

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
      modoReparto: 'monto',
      items,
      cuentas: aCuentasInput(pago),
      venta: {
        numeroComprobante: numeroComprobante.trim() || undefined,
        subtotalArs: subtotal,
        descuentoArs: descuento > 0 ? descuento : undefined,
        // El total lo recalcula el backend sumando los recargos de cada cuenta.
      },
    });
  };

  return (
    <OperacionFormLayout
      titulo="Nueva venta"
      error={error}
      total={pago.total}
      etiquetaTotal="Total a cobrar"
      etiquetaAccion="Registrar venta"
      submitting={submitting}
      onSubmit={handleSubmit}
      cabecera={
        <>
          <div>
            <Select
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
        <ResumenOperacion
          mercaderia={subtotal}
          recargos={pago.recargos}
          total={pago.total}
          etiquetaTotal="Total a cobrar"
          lineasExtra={descuento > 0 ? [{ etiqueta: 'Descuento', valor: descuento, negativo: true }] : []}
          etiquetaAccion="Registrar venta"
          submitting={submitting}
        />
      }
    >
      <div>
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
        habilitado={hayProductos}
        politicaExceso="limitar"
      />
    </OperacionFormLayout>
  );
}
