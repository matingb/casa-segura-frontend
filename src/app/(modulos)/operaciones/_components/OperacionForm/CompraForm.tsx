'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { proveedorClient, Proveedor } from '../../../../../lib/api/proveedor.client';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import ItemsEditor, { importeItem } from './ItemsEditor';
import PagoEditor from './PagoEditor';
import ResumenOperacion from './ResumenOperacion';
import OperacionFormLayout from './OperacionFormLayout';
import { aCuentasInput, calcularPago, validarPago, FilaPago, ModoPagoElegido } from './pago';
import styles from './OperacionFormLayout.module.css';

export default function CompraForm() {
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursalElegida, setSucursalElegida] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [numeroRemito, setNumeroRemito] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([{ productoSucursalId: '', cantidad: 1 }]);
  const [registrarFinanzasAhora, setRegistrarFinanzasAhora] = useState(true);
  const [modoPago, setModoPago] = useState<ModoPagoElegido>('unica');
  const [filasPago, setFilasPago] = useState<FilaPago[]>([]);
  const [tasas, setTasas] = useState<Map<string, number>>(new Map());
  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleTasasChange = useCallback((t: Map<string, number>) => setTasas(t), []);

  useEffect(() => {
    proveedorClient.obtenerTodos().then(setProveedores).catch((err) => console.error(err));
  }, []);

  // Si hay sucursales disponibles, se selecciona la primera por defecto.
  const sucursalId = sucursalElegida || (sucursales.length > 0 ? sucursales[0].id : '');

  const mercaderia = useMemo(
    () => items.reduce((sum, item) => sum + importeItem(item, 'compra'), 0),
    [items]
  );

  const pago = useMemo(
    () => calcularPago(mercaderia, filasPago, tasas, modoPago),
    [mercaderia, filasPago, tasas, modoPago]
  );
  const totalOperacion = registrarFinanzasAhora ? pago.total : mercaderia;

  // Sin un producto con importe cargado no hay monto que repartir entre cuentas.
  const hayProductos = items.some(
    (item) => item.productoSucursalId && (item.cantidad || 0) > 0 && (item.costoUnitArs ?? 0) > 0
  );

  const unidades = useMemo(
    () =>
      items
        .filter((item) => Boolean(item.productoSucursalId))
        .reduce((sum, item) => sum + (item.cantidad || 0), 0),
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
    if (!proveedorId) nuevos.proveedorId = 'Elegí un proveedor.';
    if (!numeroRemito.trim()) nuevos.numeroRemito = 'Ingresá el número de remito.';

    if (items.length === 0) {
      nuevos.items = 'Agregá al menos un producto.';
    } else {
      items.forEach((item, i) => {
        if (!item.productoSucursalId) nuevos[`items.${i}.producto`] = 'Elegí un producto.';
        if (!item.cantidad || item.cantidad <= 0) {
          nuevos[`items.${i}.cantidad`] = 'Tiene que ser mayor a 0.';
        }
        if (item.costoUnitArs === undefined || item.costoUnitArs <= 0) {
          nuevos[`items.${i}.unitario`] = 'Tiene que ser mayor a 0.';
        }
      });
    }

    if (registrarFinanzasAhora) {
      validarPago({
        mercaderia,
        modo: modoPago,
        filas: filasPago,
        resultado: pago,
        politicaExceso: 'permitir',
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
      tipo: 'compra',
      sucursalId,
      registrarFinanzasAhora,
      modoReparto: 'monto',
      items,
      cuentas: registrarFinanzasAhora ? aCuentasInput(pago) : [],
      compra: {
        proveedorId,
        numeroRemito: numeroRemito.trim() || undefined,
        numeroFactura: numeroFactura.trim() || undefined,
        subtotalArs: mercaderia,
        totalArs: totalOperacion,
      },
    });
  };

  return (
    <OperacionFormLayout
      titulo="Nueva compra"
      error={error}
      total={totalOperacion}
      etiquetaTotal="Total a pagar"
      etiquetaAccion="Registrar compra"
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
              label="Proveedor"
              value={proveedorId}
              onChange={(e) => {
                limpiarError('proveedorId');
                setProveedorId(e.target.value);
              }}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
            {errores.proveedorId && <span className={styles.errorCampo}>{errores.proveedorId}</span>}
          </div>

          <div>
            <Input
              label="Número de remito"
              value={numeroRemito}
              onChange={(e) => {
                limpiarError('numeroRemito');
                setNumeroRemito(e.target.value);
              }}
            />
            {errores.numeroRemito && <span className={styles.errorCampo}>{errores.numeroRemito}</span>}
          </div>

          <Input
            label={<>Número de factura <span className={styles.campoOpcional}>(opcional)</span></>}
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
          />
        </>
      }
      resumen={
        <ResumenOperacion
          mercaderia={pago.mercaderia}
          recargos={pago.recargos}
          total={totalOperacion}
          etiquetaTotal="Total a pagar"
          etiquetaAccion="Registrar compra"
          submitting={submitting}
        />
      }
    >
      <div>
        <ItemsEditor
          sucursalId={sucursalId}
          items={items}
          onChange={setItems}
          modo="compra"
          errores={errores}
          onCampoEditado={limpiarError}
          unidades={unidades}
          sucursalNombre={sucursalNombre}
        />
        {errores.items && <span className={styles.errorCampo}>{errores.items}</span>}
      </div>

      <fieldset className={styles.opcionesFinancieras}>
        <legend>Estado del pago</legend>
        <label className={styles.opcionFinanciera}>
          <input
            type="radio"
            checked={registrarFinanzasAhora}
            onChange={() => setRegistrarFinanzasAhora(true)}
          />
          Registrar pago ahora
        </label>
        <label className={styles.opcionFinanciera}>
          <input
            type="radio"
            checked={!registrarFinanzasAhora}
            onChange={() => setRegistrarFinanzasAhora(false)}
          />
          Dejar pendiente de pago
        </label>
      </fieldset>

      {registrarFinanzasAhora && (
        <PagoEditor
          mercaderia={mercaderia}
          modo={modoPago}
          onModoChange={setModoPago}
          filas={filasPago}
          onFilasChange={setFilasPago}
          onTasasChange={handleTasasChange}
          errores={errores}
          onCampoEditado={limpiarError}
          etiquetaAccion="pagar"
          etiquetaDebita="Debita"
          habilitado={hayProductos}
          politicaExceso="permitir"
        />
      )}
    </OperacionFormLayout>
  );
}
