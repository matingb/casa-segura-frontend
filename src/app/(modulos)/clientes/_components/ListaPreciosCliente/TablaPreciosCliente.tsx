'use client';
import Link from 'next/link';
import { AlertTriangle, Info, Search } from 'lucide-react';
import Select from '../../../../../components/ui/Select/Select';
import { formatARS, formatPorcentaje, formatUSD } from '../../../../../lib/utils/formatters';
import { ajustadoAlMinimo, esPendienteRevision, ListaPreciosClienteEstado } from './useListaPreciosCliente';
import { detalleCorto, detalleLargo } from './nivelesDescuento';
import styles from './TablaPreciosCliente.module.css';

const MOTIVO_PENDIENTE =
  'Precio sin confirmar: tiene un precio en pesos y otro en dólares, y falta elegir cuál vale. ' +
  'Por ahora se usa el de pesos.';

interface Props {
  lista: ListaPreciosClienteEstado;
  sucursales: Array<{ id: string; nombre: string }>;
  /** Lleva a la sección donde se asigna la región del cliente. */
  onAsignarRegion?: () => void;
  className?: string;
}

export default function TablaPreciosCliente({ lista, sucursales, onAsignarRegion, className }: Props) {
  const { datos, items, itemsFiltrados, cargando, error, pendientes, soloPendientes, preciosEnCero, hayCotizacion, sinDescuentos } = lista;
  const mostrarUsd = hayCotizacion && items.some(item => item.precioFinalUsd != null);
  const mostrarDescuento = !sinDescuentos;
  const columnas = 4 + (mostrarDescuento ? 2 : 0) + (mostrarUsd ? 1 : 0);
  const region = datos?.cliente.regionNombre;
  const habitual = Number(datos?.cliente.descuento_porcentaje ?? 0);
  const cotizacion = datos?.contexto_monetario.cotizacion_usd_ars;

  return (
    <div className={`${styles.vista} ${className ?? ''}`}>
      <div className={styles.toolbar}>
        {sucursales.length > 1 ? (
          <div className={styles.sucursal}>
            <Select id="lista-cliente-sucursal" label="Punto de venta" value={lista.sucursalId}
              onChange={(e) => lista.setSucursalId(e.target.value)} disabled={cargando}>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </div>
        ) : (
          <div className={styles.dato}>
            <span className={styles.datoLabel}>Punto de venta</span>
            <span className={styles.datoValor}>{datos?.sucursal.nombre ?? sucursales[0]?.nombre ?? '—'}</span>
          </div>
        )}
        <div className={styles.dato}>
          <span className={styles.datoLabel}>Región</span>
          {region ? (
            <span className={styles.datoValor}>{region} ({formatPorcentaje(Number(datos?.cliente.regionDescuento ?? 0))})</span>
          ) : onAsignarRegion ? (
            <button type="button" className={styles.link} onClick={onAsignarRegion}
              title="La región define un descuento que se aplica a todos los productos de este punto de venta">
              Sin región · Asignar región
            </button>
          ) : <span className={styles.muted}>Sin región asignada</span>}
        </div>
        {habitual > 0 && (
          <div className={styles.dato}>
            <span className={styles.datoLabel}>Descuento habitual</span>
            <span className={styles.datoValor}>{formatPorcentaje(habitual)}</span>
          </div>
        )}
        {cotizacion && (
          <div className={styles.dato}>
            <span className={styles.datoLabel}>Dólar</span>
            <span className={styles.datoValor}>{formatARS(cotizacion)}</span>
          </div>
        )}
        <label className={styles.buscador}>
          <Search size={15} className={styles.buscadorIcono} aria-hidden />
          <input type="search" placeholder="Buscá por código, producto, marca o categoría" aria-label="Buscar productos"
            value={lista.busqueda} onChange={(e) => lista.setBusqueda(e.target.value)} />
        </label>
      </div>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
          <AlertTriangle size={16} aria-hidden />
          <span className={styles.bannerTexto}>{error} Se siguen mostrando los precios de la última carga.</span>
          <button type="button" className={styles.bannerBoton} onClick={() => void lista.recargar().catch(() => {})}>Reintentar</button>
        </div>
      )}
      {preciosEnCero > 0 && (
        <div className={styles.banner} role="status">
          <AlertTriangle size={16} aria-hidden />
          <span className={styles.bannerTexto}>
            <strong>{preciosEnCero === 1 ? '1 producto tiene' : `${preciosEnCero} productos tienen`} precio $ 0.</strong>{' '}
            Así se exportan, porque no tienen un precio cargado al que aplicarle el mínimo. Cargales el precio en Stock.
          </span>
        </div>
      )}
      {datos && !hayCotizacion && (
        <div className={styles.banner} role="status">
          <AlertTriangle size={16} aria-hidden />
          <span className={styles.bannerTexto}><strong>Sin cotización del dólar configurada.</strong> Por eso no se muestran precios en dólares.</span>
          <Link href="/configuracion?tab=cotizacion" className={styles.bannerBoton}>Configurar</Link>
        </div>
      )}
      {pendientes > 0 && (
        <div className={styles.banner} role="status">
          <AlertTriangle size={16} aria-hidden />
          <span className={styles.bannerTexto}>
            <strong>{pendientes === 1 ? '1 producto' : `${pendientes} productos`} con precio sin confirmar.</strong>{' '}
            Tienen un precio en pesos y otro en dólares, y falta elegir cuál vale. Por ahora se usa el de pesos.
            Para confirmarlo, en Stock editá el producto, elegí la moneda y tocá «Confirmar referencia».
          </span>
          <button type="button" className={styles.bannerBoton} onClick={() => lista.setSoloPendientes(!soloPendientes)}>
            {soloPendientes ? 'Ver todos' : 'Ver solo estos'}
          </button>
        </div>
      )}
      {sinDescuentos && (
        <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
          <Info size={16} aria-hidden />
          <span className={styles.bannerTexto}>Este cliente no tiene descuentos: se muestran precios de lista.</span>
        </div>
      )}

      <div className={styles.tablaScroll}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              {mostrarDescuento && <th className={styles.num}>Precio de lista</th>}
              {mostrarDescuento && <th className={styles.num} title={detalleLargo([])}>Descuento</th>}
              <th className={styles.num}>Precio cliente</th>
              {mostrarUsd && <th className={styles.num}>Precio cliente USD</th>}
            </tr>
          </thead>
          <tbody>
            {cargando && items.length === 0 ? (
              <tr><td colSpan={columnas} className={styles.vacio}>Calculando la lista de precios…</td></tr>
            ) : itemsFiltrados.length === 0 ? (
              <tr><td colSpan={columnas} className={styles.vacio}>
                {!lista.sucursalId ? 'Asigná un punto de venta al cliente para ver su lista de precios.'
                  : lista.filtroActivo ? 'Ningún producto coincide con la búsqueda.'
                  : 'No hay productos habilitados en este punto de venta.'}
              </td></tr>
            ) : itemsFiltrados.map(item => {
              const conDescuento = item.descuentoTotalPorcentaje > 0;
              const pendiente = esPendienteRevision(item);
              const detalle = detalleCorto(item.descuentosAportes);
              return (
                <tr key={item.id}>
                  <td className={styles.codigo}>{item.codigo}</td>
                  <td className={styles.producto}>
                    <div className={styles.nombre} title={item.nombre}>{item.nombre}</div>
                    {(item.marca || item.modelo) && <div className={styles.secundario}>{[item.marca, item.modelo].filter(Boolean).join(' · ')}</div>}
                  </td>
                  <td>{item.subtipoNombre ? item.subtipoNombre : <span className={styles.muted}>Sin categoría</span>}</td>
                  {mostrarDescuento && <td className={`${styles.num} ${conDescuento ? styles.tachado : ''}`}>{formatARS(item.precioListaArs)}</td>}
                  {mostrarDescuento && (
                    <td className={styles.num} title={detalleLargo(item.descuentosAportes)}>
                      {conDescuento ? (
                        <>
                          <div className={styles.descuento}>{formatPorcentaje(item.descuentoTotalPorcentaje)}</div>
                          {detalle && <div className={styles.secundario}>{detalle}</div>}
                          {ajustadoAlMinimo(item) && (
                            <div className={styles.ajustado} title={`Con los descuentos quedaba en ${formatARS(item.precioSinTope)}. Se cobra el mínimo para no perder margen: ${formatARS(item.precioMinimo)}.`}>
                              Ajustado al precio mínimo
                            </div>
                          )}
                        </>
                      ) : <span className={styles.ceroDescuento}>0%</span>}
                    </td>
                  )}
                  <td className={`${styles.num} ${conDescuento ? styles.precioDestacado : ''}`}>
                    {pendiente && (
                      <span className={styles.pendiente} title={MOTIVO_PENDIENTE} aria-label={`Precio pendiente de revisión. ${MOTIVO_PENDIENTE}`}>
                        <AlertTriangle size={13} aria-hidden />
                      </span>
                    )}
                    {formatARS(item.precioFinalArs)}
                  </td>
                  {mostrarUsd && <td className={`${styles.num} ${styles.muted}`}>{formatUSD(item.precioFinalUsd)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.pie}>
        {lista.filtroActivo ? `${itemsFiltrados.length} de ${items.length} productos` : `${items.length} productos`}
        {cargando && items.length > 0 && <span className={styles.muted}> · actualizando…</span>}
      </div>
    </div>
  );
}
