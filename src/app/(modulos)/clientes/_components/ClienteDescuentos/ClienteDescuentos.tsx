'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, MapPin, Package, Tag } from 'lucide-react';
import { DescuentosClienteResumen } from '../../../../../lib/types/Region';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { CatalogoApiError } from '../../../../../lib/api/apiError';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import Select from '../../../../../components/ui/Select/Select';
import { ListaClienteNoDisponible, nuevaGeneracionNotificacionListaCliente, useListaPreciosCliente } from '../ListaPreciosCliente/useListaPreciosCliente';
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
  clienteActivo?: boolean;
  onRecursoNoDisponible?: (detalle: ListaClienteNoDisponible) => void | Promise<void>;
  /** Cada cambio de valor abre la sección de región y la trae a la vista. */
  focoRegion?: number;
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export default function ClienteDescuentos({ clienteId, sucursales, descuentoHabitual, onTotalDescuentosChange, visible = true, clienteActivo = true, onRecursoNoDisponible, focoRegion = 0 }: Props) {
  const [resumen, setResumen] = useState<DescuentosClienteResumen | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<Seccion>>(new Set());
  const [focoAnterior, setFocoAnterior] = useState(focoRegion);
  const request = useRef(0);
  const lista = useListaPreciosCliente({ clienteId, sucursales, clienteActivo, activo: visible, onRecursoNoDisponible });
  const sucursalIdActual = useRef(lista.sucursalId);
  useEffect(() => { sucursalIdActual.current = lista.sucursalId; }, [lista.sucursalId]);

  // Pedido de "Asignar región" desde otra parte de la pantalla.
  if (focoRegion !== focoAnterior) {
    setFocoAnterior(focoRegion);
    setAbiertas(prev => new Set(prev).add('region'));
  }
  useEffect(() => {
    if (focoRegion) document.getElementById('descuento-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focoRegion]);

  const cargar = useCallback(async () => {
    const version = ++request.current;
    setResumen(null);
    setErrorResumen(null);
    setCargandoResumen(true);
    try {
      const data = await clienteDescuentoClient.obtenerDescuentos(clienteId);
      if (version !== request.current) return;
      setResumen(data);
      onTotalDescuentosChange?.(data.regiones.length + data.categorias.length + data.productos.length);
    } catch (err) {
      if (version !== request.current) return;
      setResumen(null);
      setErrorResumen(err instanceof Error ? err.message : 'No se pudieron cargar los descuentos del cliente.');
      onTotalDescuentosChange?.(0);
      if (err instanceof CatalogoApiError && (err.code === 'RECURSO_NO_DISPONIBLE' || err.status === 404)) {
        void Promise.resolve(onRecursoNoDisponible?.({ clienteId, sucursalId: sucursalIdActual.current, generation: nuevaGeneracionNotificacionListaCliente(), origen: 'descuentos' })).catch(() => undefined);
      }
    } finally {
      if (version === request.current) setCargandoResumen(false);
    }
  }, [clienteId, onRecursoNoDisponible, onTotalDescuentosChange]);

  useEffect(() => {
    if (!clienteId) return;
    let vigente = true;
    void Promise.resolve().then(() => (vigente ? cargar() : undefined));
    return () => { vigente = false; request.current += 1; };
  }, [clienteId, cargar]);

  const recargarLista = lista.recargar;
  const alCambiar = useCallback(async () => {
    await Promise.all([cargar(), recargarLista().catch(() => undefined)]);
  }, [cargar, recargarLista]);

  const alternar = (seccion: Seccion) => setAbiertas(prev => {
    const next = new Set(prev);
    if (next.has(seccion)) next.delete(seccion); else next.add(seccion);
    return next;
  });

  if (cargandoResumen && !resumen) {
    return <div className={styles.cargando}>Cargando descuentos del cliente…</div>;
  }
  if (!resumen) {
    return <div className={styles.resumenError} role="alert">
      <p>{errorResumen ?? 'No se pudieron cargar los descuentos del cliente.'}</p>
      <button type="button" className={styles.bannerBoton} onClick={() => void cargar()} disabled={cargandoResumen}>
        {cargandoResumen ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>;
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
          {habitual > 0 && ` Además, el descuento habitual de ${formatPorcentaje(habitual)} se aplica al final, también sobre el saldo (se cambia en Información del cliente).`}
        </p>
        {clienteActivo && sucursales.length > 1 && (
          <div className={styles.sucursalPrecios}>
            <Select id="descuentos-sucursal" label="Ver precios de" value={lista.sucursalId} onChange={(e) => lista.setSucursalId(e.target.value)}>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </div>
        )}
      </div>
      {!clienteActivo && (
        <div className={styles.avisoPrecios} role="status">
          El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios. Los descuentos configurados se conservan y pueden administrarse.
        </div>
      )}
      {lista.cargando && clienteActivo && (
        <div className={styles.avisoPrecios} role="status">Calculando la lista de precios para mostrar simulaciones…</div>
      )}
      {lista.error && clienteActivo && !lista.cargando && (
        <div className={styles.avisoPrecios} role="status">
          <p>{lista.error} Los descuentos configurados siguen visibles y administrables.</p>
          <button type="button" className={styles.bannerBoton} onClick={() => void lista.recargar().catch(() => undefined)} disabled={lista.cargando}>
            {lista.cargando ? 'Reintentando…' : 'Reintentar lista'}
          </button>
        </div>
      )}

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
