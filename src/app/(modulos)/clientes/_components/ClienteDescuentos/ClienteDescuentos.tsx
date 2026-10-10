'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, MapPin, Package, Tag } from 'lucide-react';
import { DescuentosClienteResumen } from '../../../../../lib/types/Region';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import Select from '../../../../../components/ui/Select/Select';
import { useListaPreciosCliente } from '../ListaPreciosCliente/useListaPreciosCliente';
import SeccionDescuento from './SeccionDescuento';
import RegionSelector from './RegionSelector';
import DescuentoCategoriaEditor from './DescuentoCategoriaEditor';
import DescuentoProductoEditor from './DescuentoProductoEditor';
import styles from './ClienteDescuentos.module.css';

type Seccion = 'region' | 'categoria' | 'producto';

interface Props {
  clienteId: string;
  sucursales: Array<{ id: string; nombre: string }>;
  descuentoHabitual?: number | null;
  onTotalDescuentosChange?: (count: number) => void;
  /** La pestaña está a la vista: recién ahí se calcula la lista de precios. */
  visible?: boolean;
  /** Cada cambio de valor abre la sección de región y la trae a la vista. */
  focoRegion?: number;
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export default function ClienteDescuentos({ clienteId, sucursales, descuentoHabitual, onTotalDescuentosChange, visible = true, focoRegion = 0 }: Props) {
  const { showError } = useToast();
  const [resumen, setResumen] = useState<DescuentosClienteResumen | null>(null);
  const [abiertas, setAbiertas] = useState<Set<Seccion>>(new Set());
  const [focoAnterior, setFocoAnterior] = useState(focoRegion);
  const lista = useListaPreciosCliente({ clienteId, sucursales, activo: visible });

  // Pedido de "Asignar región" desde otra parte de la pantalla.
  if (focoRegion !== focoAnterior) {
    setFocoAnterior(focoRegion);
    setAbiertas(prev => new Set(prev).add('region'));
  }
  useEffect(() => {
    if (focoRegion) document.getElementById('descuento-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focoRegion]);

  const cargar = useCallback(async () => {
    try {
      const data = await clienteDescuentoClient.obtenerDescuentos(clienteId);
      setResumen(data);
      onTotalDescuentosChange?.(data.regiones.length + data.categorias.length + data.productos.length);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudieron cargar los descuentos del cliente.');
    }
  }, [clienteId, showError, onTotalDescuentosChange]);

  useEffect(() => {
    if (!clienteId) return;
    let vigente = true;
    void Promise.resolve().then(() => (vigente ? cargar() : undefined));
    return () => { vigente = false; };
  }, [clienteId, cargar]);

  const alCambiar = useCallback(async () => {
    await Promise.all([cargar(), lista.recargar().catch(() => undefined)]);
  }, [cargar, lista]);

  const alternar = (seccion: Seccion) => setAbiertas(prev => {
    const next = new Set(prev);
    if (next.has(seccion)) next.delete(seccion); else next.add(seccion);
    return next;
  });

  if (!resumen) {
    return <div className={styles.cargando}>Cargando descuentos del cliente…</div>;
  }

  const { regiones, categorias, productos } = resumen;
  const habitual = Number(descuentoHabitual ?? resumen.descuentoGeneral ?? 0);
  const resumenRegion = regiones.length === 0 ? null
    : sucursales.length === 1 ? `${regiones[0].regionNombre} · ${formatPorcentaje(Number(regiones[0].descuento))}`
    : `${regiones.length} de ${sucursales.length} puntos de venta con región`;

  return (
    <div className={styles.container}>
      <div className={styles.intro}>
        <p className={styles.explicacion}>
          <Info size={14} aria-hidden />
          Los descuentos se aplican uno después del otro: 10% + 5% no es 15%, es 14,5%.
          {habitual > 0 && ` Además, el descuento habitual de ${formatPorcentaje(habitual)} se suma al final (se cambia en Información del cliente).`}
        </p>
        {sucursales.length > 1 && (
          <div className={styles.sucursalPrecios}>
            <Select id="descuentos-sucursal" label="Ver precios de" value={lista.sucursalId} onChange={(e) => lista.setSucursalId(e.target.value)}>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </div>
        )}
      </div>

      <SeccionDescuento
        id="descuento-region" paso={1} icono={<MapPin size={16} />} titulo="Descuento por región"
        subtitulo="Un descuento para todos los productos de cada punto de venta, según dónde está el cliente."
        resumen={resumenRegion} abierta={abiertas.has('region')} onToggle={() => alternar('region')} conConector
      >
        <RegionSelector clienteId={clienteId} sucursales={sucursales} regionesAsignadas={regiones} lista={lista} onChanged={alCambiar} />
      </SeccionDescuento>

      <SeccionDescuento
        id="descuento-categoria" paso={2} icono={<Tag size={16} />} titulo="Descuento por categoría"
        subtitulo="Para rubros completos, por ejemplo todas las cámaras."
        resumen={categorias.length ? plural(categorias.length, 'descuento asignado', 'descuentos asignados') : null}
        abierta={abiertas.has('categoria')} onToggle={() => alternar('categoria')} conConector
      >
        <DescuentoCategoriaEditor clienteId={clienteId} categorias={categorias} lista={lista} onChanged={alCambiar} />
      </SeccionDescuento>

      <SeccionDescuento
        id="descuento-producto" paso={3} icono={<Package size={16} />} titulo="Descuento por producto"
        subtitulo="Para precios especiales en productos puntuales."
        resumen={productos.length ? plural(productos.length, 'descuento asignado', 'descuentos asignados') : null}
        abierta={abiertas.has('producto')} onToggle={() => alternar('producto')}
      >
        <DescuentoProductoEditor clienteId={clienteId} productos={productos} lista={lista} onChanged={alCambiar} />
      </SeccionDescuento>

    </div>
  );
}
