'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Combobox from '../../../../components/ui/Combobox/Combobox';
import { DescuentoSucursal } from '../../../../lib/types/Tipo';
import { clasificacionClient } from '../../../../lib/api/clasificacion.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import styles from './DescuentoEditor.module.css';

interface DescuentoEditorProps {
  destino: 'tipos' | 'subtipos';
  id: string;
  nombre: string;
  descuentoGeneral: number | null;
  descuentosSucursal: DescuentoSucursal[];
  /** Qué pasa si se deja vacío (ej. "no tener descuento", "heredar el de la categoría"). */
  textoSinDescuento: string;
  onChanged: () => Promise<void>;
}

/**
 * Fila en edición. `id` es el de la base cuando el descuento ya estaba guardado,
 * y queda undefined mientras la fila solo existe en pantalla.
 */
interface FilaSucursal {
  id?: string;
  sucursalId: string;
  sucursalNombre: string;
  porcentaje: string;
}

function aFilas(descuentos: DescuentoSucursal[]): FilaSucursal[] {
  return descuentos.map((d) => ({
    id: d.id,
    sucursalId: d.sucursalId,
    sucursalNombre: d.sucursalNombre,
    porcentaje: String(d.porcentaje),
  }));
}

function textoGeneral(valor: number | null): string {
  return valor === null ? '' : String(valor);
}

export default function DescuentoEditor({
  destino,
  id,
  nombre,
  descuentoGeneral,
  descuentosSucursal,
  textoSinDescuento,
  onChanged,
}: DescuentoEditorProps) {
  const { sucursales } = useSucursales();
  const { showSuccess, showError } = useToast();

  const [generalDraft, setGeneralDraft] = useState(textoGeneral(descuentoGeneral));
  const [filas, setFilas] = useState<FilaSucursal[]>(aFilas(descuentosSucursal));
  const [guardando, setGuardando] = useState(false);

  // Al recargar la clasificación desde el servidor, la vista vuelve a partir
  // de lo persistido (así el "Guardar" deja el editor en un estado limpio).
  useEffect(() => {
    setGeneralDraft(textoGeneral(descuentoGeneral));
    setFilas(aFilas(descuentosSucursal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descuentoGeneral, JSON.stringify(descuentosSucursal)]);

  const sucursalesUsadas = new Set(filas.map((f) => f.sucursalId).filter(Boolean));
  const quedanSucursales = sucursales.some((s) => !sucursalesUsadas.has(s.id));

  const opcionesPara = (filaActual: FilaSucursal) =>
    sucursales
      .filter((s) => !sucursalesUsadas.has(s.id) || s.id === filaActual.sucursalId)
      .map((s) => ({ value: s.id, label: s.nombre }));

  const agregarFila = () => {
    setFilas((prev) => [...prev, { sucursalId: '', sucursalNombre: '', porcentaje: '' }]);
  };

  const actualizarFila = (indice: number, cambios: Partial<FilaSucursal>) => {
    setFilas((prev) => prev.map((f, i) => (i === indice ? { ...f, ...cambios } : f)));
  };

  const quitarFila = (indice: number) => {
    setFilas((prev) => prev.filter((_, i) => i !== indice));
  };

  const porcentajeValido = (texto: string) => {
    const n = Number(texto);
    return texto.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
  };

  // Comparamos contra lo persistido para saber si hay algo para guardar.
  const original = JSON.stringify(
    aFilas(descuentosSucursal).map((f) => ({ s: f.sucursalId, p: f.porcentaje }))
  );
  const actual = JSON.stringify(filas.map((f) => ({ s: f.sucursalId, p: f.porcentaje })));
  const hayCambios =
    generalDraft.trim() !== textoGeneral(descuentoGeneral) || original !== actual;

  const guardar = async () => {
    const textoGen = generalDraft.trim();
    const valorGeneral = textoGen === '' ? null : Number(textoGen);
    if (valorGeneral !== null && !porcentajeValido(textoGen)) {
      showError('El descuento debe ser un porcentaje entre 0 y 100.');
      return;
    }

    if (filas.some((f) => !f.sucursalId)) {
      showError('Elegí una sucursal en cada fila, o quitá las que no uses.');
      return;
    }
    if (filas.some((f) => !porcentajeValido(f.porcentaje))) {
      showError('Cada descuento por sucursal debe ser un porcentaje entre 0 y 100.');
      return;
    }

    setGuardando(true);
    try {
      // Lo eliminado es lo que estaba guardado y ya no figura en pantalla.
      const idsEnPantalla = new Set(filas.map((f) => f.id).filter(Boolean));
      const eliminados = descuentosSucursal.filter((d) => !idsEnPantalla.has(d.id));

      for (const d of eliminados) {
        await clasificacionClient.eliminarDescuentoSucursal(d.id);
      }

      if (textoGen !== textoGeneral(descuentoGeneral)) {
        await clasificacionClient.setDescuentoGeneral(destino, id, valorGeneral);
      }

      // El endpoint hace upsert, así que sirve tanto para altas como para cambios.
      for (const f of filas) {
        const previo = descuentosSucursal.find((d) => d.id === f.id);
        if (!previo || String(previo.porcentaje) !== f.porcentaje || previo.sucursalId !== f.sucursalId) {
          await clasificacionClient.setDescuentoSucursal(
            destino,
            id,
            f.sucursalId,
            Number(f.porcentaje)
          );
        }
      }

      await onChanged();
      showSuccess(`Descuentos de "${nombre}" guardados.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudieron guardar los descuentos.');
    } finally {
      setGuardando(false);
    }
  };

  const descartar = () => {
    setGeneralDraft(textoGeneral(descuentoGeneral));
    setFilas(aFilas(descuentosSucursal));
  };

  return (
    <div className={styles.editor}>
      <div className={styles.generalRow}>
        <label className={styles.label}>
          Descuento en todas las sucursales
          <div className={styles.percentInput}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={generalDraft}
              onChange={(e) => setGeneralDraft(e.target.value)}
              placeholder="—"
              disabled={guardando}
            />
            <span className={styles.percentSign}>%</span>
          </div>
        </label>
        <p className={styles.hint}>Dejalo vacío para {textoSinDescuento}.</p>
      </div>

      <div className={styles.excepciones}>
        <span className={styles.label}>Descuento por sucursal</span>

        {filas.length === 0 && (
          <p className={styles.hint}>
            Sin descuentos por sucursal: todas usan el descuento de arriba.
          </p>
        )}

        {filas.map((fila, i) => (
          <div key={fila.id ?? `nueva-${i}`} className={styles.filaSucursal}>
            <Combobox
              options={opcionesPara(fila)}
              value={fila.sucursalId}
              onChange={(val) =>
                actualizarFila(i, {
                  sucursalId: val,
                  sucursalNombre: sucursales.find((s) => s.id === val)?.nombre ?? '',
                })
              }
              placeholder="Seleccionar sucursal"
              disabled={guardando}
            />
            <div className={styles.percentInput}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={fila.porcentaje}
                onChange={(e) => actualizarFila(i, { porcentaje: e.target.value })}
                placeholder="0"
                disabled={guardando}
              />
              <span className={styles.percentSign}>%</span>
            </div>
            <button
              type="button"
              className={styles.btnQuitarFila}
              onClick={() => quitarFila(i)}
              aria-label={
                fila.sucursalNombre ? `Quitar descuento de ${fila.sucursalNombre}` : 'Quitar fila'
              }
              disabled={guardando}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Siempre debajo de lo cargado, para poder encadenar varias. */}
        {quedanSucursales && (
          <button
            type="button"
            className={styles.btnAgregar}
            onClick={agregarFila}
            disabled={guardando}
          >
            + Agregar sucursal
          </button>
        )}
      </div>

      <div className={styles.acciones}>
        {hayCambios && (
          <button
            type="button"
            className={styles.btnLink}
            onClick={descartar}
            disabled={guardando}
          >
            Descartar cambios
          </button>
        )}
        <button
          type="button"
          className={styles.btnSave}
          onClick={guardar}
          disabled={guardando || !hayCambios}
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
