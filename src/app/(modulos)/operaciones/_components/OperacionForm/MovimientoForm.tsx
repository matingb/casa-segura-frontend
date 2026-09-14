'use client';

import { useCallback, useMemo, useState } from 'react';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import PagoEditor from './PagoEditor';
import ResumenOperacion from './ResumenOperacion';
import OperacionFormLayout from './OperacionFormLayout';
import { aCuentasInput, calcularPago, validarPago, FilaPago } from './pago';
import styles from './OperacionFormLayout.module.css';

export default function MovimientoForm() {
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalElegida, setSucursalElegida] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'ingreso' | 'egreso'>('ingreso');
  const [descripcion, setDescripcion] = useState('');
  const [filasPago, setFilasPago] = useState<FilaPago[]>([{ cuentaFinancieraId: '' }]);
  const [tasas, setTasas] = useState<Map<string, number>>(new Map());
  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleTasasChange = useCallback((t: Map<string, number>) => setTasas(t), []);

  // No hay sucursal por defecto en el modelo: si el usuario tiene una sola, se usa esa.
  const sucursalId = sucursalElegida || (sucursales.length === 1 ? sucursales[0].id : '');

  // El monto del movimiento se deriva de las cuentas, no al revés.
  const pago = useMemo(
    () => calcularPago(0, filasPago, tasas, 'derivado'),
    [filasPago, tasas]
  );

  const esIngreso = tipoMovimiento === 'ingreso';

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

    validarPago({ mercaderia: 0, modo: 'derivado', filas: filasPago }).forEach((e) => {
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
      tipo: 'movimiento',
      sucursalId,
      // El monto del movimiento lo deriva el backend de las cuentas cargadas.
      cuentas: aCuentasInput(pago),
      movimiento: {
        tipo: tipoMovimiento,
        descripcion: descripcion.trim() || undefined,
      },
    });
  };

  return (
    <OperacionFormLayout
      titulo={`Nuevo movimiento financiero — ${esIngreso ? 'Ingreso' : 'Egreso'}`}
      error={error}
      total={pago.total}
      etiquetaTotal={esIngreso ? 'Total a ingresar' : 'Total a egresar'}
      etiquetaAccion="Registrar movimiento"
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

          <Select
            label="Tipo"
            value={tipoMovimiento}
            onChange={(e) => setTipoMovimiento(e.target.value as 'ingreso' | 'egreso')}
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>

          <div className={styles.campoAncho}>
            <label htmlFor="descripcion">
              Descripción <span className={styles.campoOpcional}>(opcional)</span>
            </label>
            <textarea
              id="descripcion"
              className={styles.textarea}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Motivo del movimiento"
            />
          </div>
        </>
      }
      resumen={
        <ResumenOperacion
          mercaderia={pago.mercaderia}
          recargos={pago.recargos}
          total={pago.total}
          etiquetaTotal={esIngreso ? 'Total a ingresar' : 'Total a egresar'}
          etiquetaAccion="Registrar movimiento"
          submitting={submitting}
        />
      }
    >
      <PagoEditor
        mercaderia={0}
        modo="derivado"
        onModoChange={() => {}}
        filas={filasPago}
        onFilasChange={setFilasPago}
        onTasasChange={handleTasasChange}
        errores={errores}
        onCampoEditado={limpiarError}
        etiquetaAccion={esIngreso ? 'ingresar' : 'egresar'}
        etiquetaDebita={esIngreso ? 'Acredita' : 'Debita'}
        titulo="Cuentas financieras"
        etiquetaBase="Monto"
      />
    </OperacionFormLayout>
  );
}
