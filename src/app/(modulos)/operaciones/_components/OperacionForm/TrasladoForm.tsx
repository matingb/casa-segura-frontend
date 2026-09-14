'use client';

import { useCallback, useMemo, useState } from 'react';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import ItemsEditor from './ItemsEditor';
import PagoEditor from './PagoEditor';
import ResumenOperacion from './ResumenOperacion';
import OperacionFormLayout from './OperacionFormLayout';
import { aCuentasInput, calcularPago, validarPago, FilaPago, ModoPagoElegido } from './pago';
import styles from './OperacionFormLayout.module.css';

export default function TrasladoForm() {
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalElegida, setSucursalElegida] = useState('');
  const [sucursalDestinoId, setSucursalDestinoId] = useState('');
  const [costoFleteArs, setCostoFleteArs] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([]);
  const [modoPago, setModoPago] = useState<ModoPagoElegido>(null);
  const [filasPago, setFilasPago] = useState<FilaPago[]>([]);
  const [tasas, setTasas] = useState<Map<string, number>>(new Map());
  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleTasasChange = useCallback((t: Map<string, number>) => setTasas(t), []);

  // No hay sucursal por defecto en el modelo: si el usuario tiene una sola, se usa esa.
  const sucursalId = sucursalElegida || (sucursales.length === 1 ? sucursales[0].id : '');

  const fleteNumero = Number(costoFleteArs);
  const fleteValido = costoFleteArs === '' || Number.isFinite(fleteNumero);
  // Las cuentas solo intervienen si el traslado tiene costo de flete.
  const fleteArs = costoFleteArs === '' || !fleteValido ? 0 : fleteNumero;

  const pago = useMemo(
    () => calcularPago(fleteArs, filasPago, tasas, modoPago),
    [fleteArs, filasPago, tasas, modoPago]
  );

  const unidades = useMemo(
    () => items.reduce((sum, item) => sum + (item.cantidad || 0), 0),
    [items]
  );

  const mismaSucursal = Boolean(sucursalId && sucursalDestinoId && sucursalId === sucursalDestinoId);
  const destinoNombre = sucursales.find((s) => s.id === sucursalDestinoId)?.nombre;

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

    if (!sucursalId) nuevos.sucursalId = 'Elegí una sucursal de origen.';
    if (!sucursalDestinoId) nuevos.sucursalDestinoId = 'Elegí una sucursal de destino.';
    if (mismaSucursal) nuevos.sucursalDestinoId = 'El destino debe ser distinto al origen.';

    if (!fleteValido) {
      nuevos.costoFleteArs = 'Ingresá un número válido.';
    } else if (fleteArs < 0) {
      nuevos.costoFleteArs = 'El flete no puede ser negativo.';
    }

    if (items.length === 0) {
      nuevos.items = 'Agregá al menos un producto.';
    } else {
      items.forEach((item, i) => {
        if (!item.productoSucursalId) nuevos[`items.${i}.producto`] = 'Elegí un producto.';
        if (!item.cantidad || item.cantidad <= 0) {
          nuevos[`items.${i}.cantidad`] = 'Tiene que ser mayor a 0.';
        }
      });
    }

    // Sin flete no hay nada que repartir entre cuentas.
    if (fleteArs > 0) {
      validarPago({
        mercaderia: fleteArs,
        modo: modoPago,
        filas: filasPago,
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
      tipo: 'traslado',
      sucursalId,
      modoReparto: 'monto',
      items,
      cuentas: fleteArs > 0 ? aCuentasInput(pago) : [],
      traslado: {
        sucursalDestinoId,
        costoFleteArs: fleteArs > 0 ? fleteArs : undefined,
      },
    });
  };

  return (
    <OperacionFormLayout
      titulo="Nuevo traslado"
      error={error}
      total={pago.total}
      etiquetaTotal="Costo del traslado"
      etiquetaAccion="Registrar traslado"
      submitting={submitting}
      onSubmit={handleSubmit}
      cabecera={
        <>
          <div>
            <Select
              label="Sucursal origen"
              value={sucursalId}
              onChange={(e) => {
                limpiarError('sucursalId');
                setSucursalElegida(e.target.value);
              }}
            >
              <option value="">Seleccionar sucursal origen</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
            {errores.sucursalId && <span className={styles.errorCampo}>{errores.sucursalId}</span>}
          </div>

          <div>
            <Select
              label="Sucursal destino"
              value={sucursalDestinoId}
              onChange={(e) => {
                limpiarError('sucursalDestinoId');
                setSucursalDestinoId(e.target.value);
              }}
            >
              <option value="">Seleccionar sucursal destino</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>
            {errores.sucursalDestinoId && (
              <span className={styles.errorCampo}>{errores.sucursalDestinoId}</span>
            )}
          </div>

          <div>
            <Input
              label={<>Costo de flete ($) <span className={styles.campoOpcional}>(opcional)</span></>}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={costoFleteArs}
              onChange={(e) => {
                limpiarError('costoFleteArs');
                setCostoFleteArs(e.target.value);
              }}
            />
            {errores.costoFleteArs && <span className={styles.errorCampo}>{errores.costoFleteArs}</span>}
          </div>
        </>
      }
      resumen={
        <ResumenOperacion
          mercaderia={fleteArs}
          recargos={pago.recargos}
          total={pago.total}
          etiquetaTotal="Costo del traslado"
          etiquetaAccion="Registrar traslado"
          submitting={submitting}
        />
      }
    >
      <div>
        <ItemsEditor
          sucursalId={sucursalId}
          items={items}
          onChange={setItems}
          modo="traslado"
          errores={errores}
          onCampoEditado={limpiarError}
          unidades={-unidades}
          sucursalNombre={destinoNombre}
        />
        {errores.items && <span className={styles.errorCampo}>{errores.items}</span>}
      </div>

      {fleteArs > 0 && (
        <PagoEditor
          mercaderia={fleteArs}
          modo={modoPago}
          onModoChange={setModoPago}
          filas={filasPago}
          onFilasChange={setFilasPago}
          onTasasChange={handleTasasChange}
          errores={errores}
          onCampoEditado={limpiarError}
          etiquetaAccion="pagar"
          etiquetaDebita="Debita"
          politicaExceso="limitar"
          titulo="Pago del flete"
        />
      )}
    </OperacionFormLayout>
  );
}
