'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge/Badge';
import BotonConMotivo from '@/components/ui/Button/BotonConMotivo';
import Button from '@/components/ui/Button/Button';
import Combobox from '@/components/ui/Combobox/Combobox';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal/ConfirmActionModal';
import Input from '@/components/ui/Input/Input';
import Pagination from '@/components/ui/Pagination/Pagination';
import Select from '@/components/ui/Select/Select';
import CeldaTexto from '@/components/ui/Table/CeldaTexto';
import Table, { type TableColumn } from '@/components/ui/Table/Table';
import { useSucursales } from '@/context/SucursalContext';
import { useToast } from '@/context/ToastContext';
import { aumentoPreciosClient, type CampoAumento, type CriteriosAumento,
  type ImportesAumento, type VistaPreviaAumento } from '@/lib/api/aumento-precios.client';
import { CatalogoApiError } from '@/lib/api/apiError';
import { productoClient } from '@/lib/api/producto.client';
import { proveedorClient, type Proveedor } from '@/lib/api/proveedor.client';
import { useClasificacion } from '@/lib/hooks/useClasificacion';
import type { Moneda } from '@/lib/types/Moneda';
import { formatARS, formatUSD } from '@/lib/utils/formatters';
import { Dinero } from '@/lib/utils/precio';
import styles from './AumentoMasivo.module.css';

const TAMANO_PAGINA = 15;

function normalizarImporte(texto: string) {
  const valor = texto.trim().replace(/^(?:(?:USD?\s*)?\$)\s*/i, '');
  return /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(valor)
    ? valor.replaceAll('.', '').replace(',', '.')
    : valor.replace(',', '.');
}

function formatoImporte(moneda: Moneda, valor: string | null) {
  return moneda === 'USD' ? formatUSD(valor, true) : formatARS(valor);
}

function valorEditable(moneda: Moneda, valor: string | null) {
  if (valor === null) return '';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: moneda === 'USD' ? 4 : 2,
  }).format(Number(valor));
}

function importeValido(moneda: Moneda, valor: string) {
  return (moneda === 'USD' ? /^\d{1,10}(\.\d{1,4})?$/ : /^\d{1,12}(\.\d{1,2})?$/).test(valor);
}

type Resultado = { grupo: string; clave: string; datos?: VistaPreviaAumento; error?: string };

export default function AumentoMasivo({ alcanceInicial }: { alcanceInicial: CriteriosAumento['alcance'] }) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const { sucursales, isLoading: cargandoSucursales, error: errorSucursales } = useSucursales();
  const { tipos, loading: cargandoCategorias, error: errorCategorias } = useClasificacion();
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [errorMarcas, setErrorMarcas] = useState<string>();
  const [errorProveedores, setErrorProveedores] = useState<string>();
  const [alcance, setAlcance] = useState(alcanceInicial);
  const [seleccion, setSeleccion] = useState<CriteriosAumento['seleccion']>('todos');
  const [campo, setCampo] = useState<CampoAumento>('precio');
  const [sucursalId, setSucursalId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marca, setMarca] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [incluirHeredados, setIncluirHeredados] = useState(false);
  const [masOpciones, setMasOpciones] = useState(false);
  const [excluidos, setExcluidos] = useState(new Set<string>());
  const [excepciones, setExcepciones] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado>();
  const [revision, setRevision] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAplicar, setErrorAplicar] = useState<string>();
  const aplicando = useRef(false);

  useEffect(() => {
    let activo = true;
    void productoClient.obtenerValoresUnicos('marca').then(
      (datos) => { if (activo) setMarcas(datos); },
      (error: Error) => { if (activo) setErrorMarcas(error.message); },
    );
    void proveedorClient.obtenerTodos().then(
      (datos) => { if (activo) setProveedores(datos); },
      (error: Error) => { if (activo) setErrorProveedores(error.message); },
    );
    return () => { activo = false; };
  }, []);

  const stock = alcance === 'stock';
  const esPrecio = campo === 'precio';
  const nombreCampo = esPrecio ? 'precio' : 'costo';
  const filtrados = seleccion === 'filtrados';
  const porcentajeDecimal = porcentaje.trim().replace(',', '.');
  const sucursal = sucursales.find((item) => item.id === sucursalId && item.activo);
  const motivo = stock && !sucursalId ? 'Elegí una sucursal para ver sus productos.'
    : filtrados && !categoriaId && !marca && !proveedorId ? 'Elegí una categoría, una marca o un proveedor.'
      : !/^\d{1,4}(\.\d{1,2})?$/.test(porcentajeDecimal) ? 'Ingresá un porcentaje válido para ver el aumento.'
        : '';
  const grupo = useMemo(() => ({
    alcance, seleccion,
    sucursalId: stock ? sucursalId : null,
    categoriaId: filtrados ? categoriaId || null : null,
    marca: filtrados ? marca || null : null,
    proveedorId: filtrados ? proveedorId || null : null,
    incluirHeredados: stock && esPrecio && incluirHeredados,
  }), [alcance, seleccion, stock, sucursalId, filtrados, categoriaId, marca, proveedorId, esPrecio, incluirHeredados]);
  const criterios = useMemo<CriteriosAumento | null>(() => motivo ? null : ({
    ...grupo, ajustes: [{ campo, modo: 'porcentaje', porcentaje: porcentajeDecimal }],
  }), [motivo, grupo, campo, porcentajeDecimal]);
  const claveGrupo = JSON.stringify([grupo, campo, revision]);
  const clave = JSON.stringify([claveGrupo, porcentajeDecimal]);

  useEffect(() => {
    if (!criterios) return;
    const abort = new AbortController();
    const espera = setTimeout(() => {
      void aumentoPreciosClient.previsualizar(criterios, abort.signal).then(
        (datos) => { if (!abort.signal.aborted) setResultado({ grupo: claveGrupo, clave, datos }); },
        (error: Error) => { if (!abort.signal.aborted) setResultado({ grupo: claveGrupo, clave, error: error.message }); },
      );
    }, 180);
    return () => { clearTimeout(espera); abort.abort(); };
  }, [criterios, clave, claveGrupo]);

  const vista = criterios && resultado?.clave === clave ? resultado.datos : undefined;
  const errorVista = criterios && resultado?.clave === clave ? resultado.error : undefined;
  const cargando = Boolean(criterios && !vista && !errorVista);
  const datosVisibles = criterios && resultado?.grupo === claveGrupo ? resultado.datos : undefined;

  const filas = useMemo(() => {
    const factor = cargando ? new Dinero(porcentajeDecimal).div(100).plus(1) : null;
    return (datosVisibles?.filas ?? []).flatMap((fila) => {
      const importe = fila.campos[campo];
      if (!importe) return [];
      const incluida = importe.editable && !excluidos.has(fila.id);
      const excepcion = excepciones[fila.id];
      const manual = excepcion === undefined ? undefined : normalizarImporte(excepcion);
      const propuesta = factor && importe.editable && importe.anterior !== null
        ? factor.mul(importe.anterior).toFixed(importe.moneda === 'USD' ? 4 : 2)
        : importe.propuesta;
      const error = incluida && manual !== undefined && !importeValido(importe.moneda, manual);
      const cambia = incluida && !error && (manual === undefined
        ? !fila.motivo && !importe.motivo
        : importe.anterior === null || !new Dinero(manual).eq(importe.anterior));
      return [{ ...fila, importe, incluida, excepcion, manual, propuesta, cambia, error }];
    });
  }, [cargando, porcentajeDecimal, datosVisibles, campo, excluidos, excepciones]);

  const afectados = filas.filter((fila) => fila.cambia).length;
  const hayErrores = filas.some((fila) => fila.error);
  const filtroBusqueda = busqueda.trim().toLocaleLowerCase();
  const filasFiltradas = filas.filter((fila) => `${fila.nombre} ${fila.codigo}`.toLocaleLowerCase().includes(filtroBusqueda));
  const paginas = Math.max(1, Math.ceil(filasFiltradas.length / TAMANO_PAGINA));
  const paginaVisible = Math.min(pagina, paginas);
  const motivoAplicar = motivo || errorVista || (cargando ? 'Esperá a que se valide la vista previa.'
    : hayErrores ? 'Revisá los importes editados.' : !afectados ? 'Elegí al menos un producto con cambios.' : '');
  const etiquetaAplicar = `Aplicar ${Number(porcentajeDecimal) > 0 ? 'aumento' : 'cambios'}${afectados && !cargando ? ` a ${afectados}` : ''}`;

  function cambiarGrupo(cambiar: () => void) {
    cambiar();
    setPagina(1);
    setBusqueda('');
    setExcluidos(new Set());
    setExcepciones({});
    setErrorAplicar(undefined);
  }

  function editarImporte(id: string, valor?: string) {
    setExcepciones((actual) => {
      const siguientes = { ...actual };
      if (valor === undefined) delete siguientes[id];
      else siguientes[id] = valor;
      return siguientes;
    });
    setErrorAplicar(undefined);
  }

  async function aplicar() {
    if (!criterios || !vista || motivoAplicar || aplicando.current) return;
    aplicando.current = true;
    setGuardando(true);
    setErrorAplicar(undefined);
    try {
      const importes: ImportesAumento = {};
      for (const fila of filas) {
        if (fila.incluida && fila.manual !== undefined) importes[fila.id] = { [campo]: fila.manual };
      }
      const { actualizados } = await aumentoPreciosClient.aplicar(criterios, vista.version, { excluidos: [...excluidos] }, importes);
      showSuccess(actualizados === 1 ? 'Se actualizó 1 producto.' : `Se actualizaron ${actualizados} productos.`);
      router.push(stock ? '/stock' : '/productos');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo aplicar el aumento.';
      if (error instanceof CatalogoApiError && error.status === 409) {
        setResultado(undefined);
        setRevision((actual) => actual + 1);
        setErrorAplicar(Object.keys(excepciones).length
          ? `${mensaje} Volvé a ingresar los importes editados.` : mensaje);
        setExcepciones({});
      } else {
        setErrorAplicar(mensaje);
      }
    } finally {
      aplicando.current = false;
      setGuardando(false);
      setConfirmar(false);
    }
  }

  const columnas: TableColumn<(typeof filas)[number]>[] = [
    {
      key: 'incluir', header: 'Incluir', width: '1%', align: 'center',
      render: (fila) => (
        <input type="checkbox" aria-label={`Incluir ${fila.codigo} ${fila.nombre}`}
          checked={fila.incluida} disabled={guardando || !fila.importe.editable}
          onChange={(event) => {
            const incluir = event.target.checked;
            setExcluidos((actual) => {
              const siguiente = new Set(actual);
              if (incluir) siguiente.delete(fila.id);
              else siguiente.add(fila.id);
              return siguiente;
            });
            setErrorAplicar(undefined);
          }}
        />
      ),
    },
    {
      key: 'producto', header: 'Producto',
      render: (fila) => <CeldaTexto principal={fila.nombre} secundarias={[fila.codigo]} />,
    },
    { key: 'marca', header: 'Marca', render: (fila) => fila.marca || '—' },
    {
      key: 'actual', header: esPrecio ? 'Precio actual' : 'Costo actual',
      render: ({ importe }) => formatoImporte(importe.monedaAnterior, importe.anterior),
    },
    {
      key: 'nuevo', header: esPrecio ? 'Precio nuevo' : 'Costo nuevo',
      render: (fila) => fila.importe.editable ? (
        <div className={styles.editor}>
          <span aria-hidden="true">{fila.importe.moneda === 'USD' ? 'USD $' : '$'}</span>
          <Input inputMode="decimal" aria-label={`${esPrecio ? 'Precio' : 'Costo'} nuevo de ${fila.codigo} en ${fila.importe.moneda}`}
            aria-invalid={fila.error || undefined} value={fila.excepcion ?? valorEditable(fila.importe.moneda, fila.propuesta)}
            disabled={guardando || !fila.incluida}
            onChange={(event) => editarImporte(fila.id, event.target.value)}
            onBlur={() => {
              if (fila.manual !== undefined && importeValido(fila.importe.moneda, fila.manual)) {
                const formateado = valorEditable(fila.importe.moneda, fila.manual);
                if (formateado !== fila.excepcion) editarImporte(fila.id, formateado);
              }
            }} />
          {fila.incluida && fila.excepcion !== undefined && (
            <button type="button" className={styles.enlace} disabled={guardando} onClick={() => editarImporte(fila.id)}
              aria-label={`Restablecer ${nombreCampo} propuesto de ${fila.codigo}`}>Restablecer</button>
          )}
        </div>
      ) : '—',
    },
    {
      key: 'resultado', header: 'Resultado',
      render: (fila) => {
        if (!fila.importe.editable) {
          const heredado = fila.importe.motivo === 'Precio heredado';
          return <Badge variant={heredado ? 'warning' : 'neutral'}>{heredado ? 'Heredado · excluido' : fila.importe.motivo}</Badge>;
        }
        if (!fila.incluida) return <Badge variant="neutral">Excluido</Badge>;
        if (fila.error) return <Badge variant="danger">Importe inválido</Badge>;
        if (cargando) return <Badge variant="neutral">Recalculando</Badge>;
        if (fila.cambia) {
          return <Badge variant="success">{fila.excepcion !== undefined ? 'Editado' : fila.importe.heredado ? 'Precio propio' : 'Se actualiza'}</Badge>;
        }
        const bloqueo = fila.motivo ?? (fila.excepcion === undefined ? fila.importe.motivo : null);
        return <Badge variant={bloqueo && bloqueo !== 'Sin cambio' ? 'warning' : 'neutral'}>{bloqueo ?? 'Sin cambio'}</Badge>;
      },
    },
  ];

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <Link href={stock ? '/stock' : '/productos'}>{stock ? 'Stock por sucursal' : 'Productos'}</Link>
        <span aria-hidden="true"> / </span>
        <span>Ajuste de {esPrecio ? 'precios' : 'costos'}</span>
        <h1>Aumento masivo de {esPrecio ? 'precios' : 'costos'}</h1>
      </header>

      <section className={styles.panel} aria-label="Configurar el aumento">
        <div className={styles.configuracion}>
          <div className={styles.alcances} role="group" aria-label="Dónde aplicar">
            <Button variant="secondary" aria-pressed={!stock} disabled={guardando}
              onClick={() => { if (stock) cambiarGrupo(() => setAlcance('productos')); }}>
              {esPrecio ? 'Precio base de Productos' : 'Costo base de Productos'}
            </Button>
            <Button variant="secondary" aria-pressed={stock} disabled={guardando}
              onClick={() => { if (!stock) cambiarGrupo(() => { setAlcance('stock'); setIncluirHeredados(false); }); }}>
              Stock por sucursal
            </Button>
          </div>

          <div className={styles.alcance}>
            <Select label="Aplicar a" value={seleccion} disabled={guardando}
              onChange={(event) => cambiarGrupo(() => setSeleccion(event.target.value as CriteriosAumento['seleccion']))}>
              <option value="todos">Todos los productos</option>
              <option value="filtrados">Solo los que coincidan con los filtros</option>
            </Select>
            <span className={styles.nota} role="status">
              {cargando ? 'Calculando alcance…' : vista ? `${afectados} ${afectados === 1 ? 'producto a actualizar' : 'productos a actualizar'}` : ''}
            </span>
          </div>

          <div className={styles.campos}>
            {stock && <Combobox label="Sucursal" placeholder="Elegí una sucursal" required value={sucursalId}
              options={sucursales.filter((item) => item.activo).map(({ id, nombre }) => ({ value: id, label: nombre }))}
              loading={cargandoSucursales} disabled={guardando}
              onChange={(id) => cambiarGrupo(() => { setSucursalId(id); setIncluirHeredados(false); })}
            />}
            {filtrados && <>
              <Combobox label="Categoría" placeholder="Todas" value={categoriaId}
                options={[{ value: '', label: 'Todas' }, ...tipos.map(({ id, nombre }) => ({ value: id, label: nombre }))]}
                loading={cargandoCategorias} disabled={guardando}
                onChange={(id) => cambiarGrupo(() => setCategoriaId(id))}
              />
              <Combobox label="Marca" placeholder="Todas" value={marca}
                options={[{ value: '', label: 'Todas' }, ...marcas.map((nombre) => ({ value: nombre, label: nombre }))]}
                disabled={guardando} onChange={(valor) => cambiarGrupo(() => setMarca(valor))}
              />
            </>}
            <div className={styles.porcentaje}>
              <Input label="Aumento (%)" required inputMode="decimal" placeholder="Ej. 5" value={porcentaje} disabled={guardando}
                onChange={(event) => { setPorcentaje(event.target.value); setErrorAplicar(undefined); }} />
            </div>
          </div>

          <div className={styles.opciones}>
            {stock && esPrecio && <label className={styles.check}>
              <input type="checkbox" checked={incluirHeredados} disabled={guardando}
                onChange={(event) => cambiarGrupo(() => setIncluirHeredados(event.target.checked))} />
              Incluir precios heredados
            </label>}
            {filtrados && proveedorId && !masOpciones && (
              <span className={styles.nota}>Proveedor · {proveedores.find(({ id }) => id === proveedorId)?.nombre}</span>
            )}
            <button type="button" className={styles.enlace} disabled={guardando} aria-expanded={masOpciones}
              onClick={() => setMasOpciones((actual) => !actual)}>{masOpciones ? 'Ocultar opciones' : 'Más opciones'}</button>
          </div>
          {masOpciones && (
            <div className={styles.campos}>
              <Select label="Qué ajustar" value={campo} disabled={guardando}
                onChange={(event) => cambiarGrupo(() => setCampo(event.target.value as CampoAumento))}>
                <option value="precio">Precio de venta</option>
                <option value="costo">Costo de reposición</option>
              </Select>
              {filtrados && <Combobox label="Proveedor" placeholder="Todos" value={proveedorId}
                options={[{ value: '', label: 'Todos' }, ...proveedores.map(({ id, nombre }) => ({ value: id, label: nombre }))]}
                disabled={guardando} onChange={(id) => cambiarGrupo(() => setProveedorId(id))}
              />}
            </div>
          )}
          {stock && errorSucursales && <p className={styles.error} role="alert">{errorSucursales}</p>}
          {filtrados && (errorCategorias || errorMarcas || (masOpciones && errorProveedores)) && (
            <p className={styles.error} role="alert">{errorCategorias || errorMarcas || errorProveedores}</p>
          )}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="titulo-vista-previa">
        <div className={styles.cabeceraTabla}>
          <h2 id="titulo-vista-previa">Vista previa</h2>
          <span className={styles.nota} aria-live="polite">
            {datosVisibles ? `${filas.length} ${filas.length === 1 ? 'encontrado' : 'encontrados'}` : ''}
            {vista ? ` · ${afectados} ${afectados === 1 ? 'se actualizaría' : 'se actualizarían'}` : ''}
          </span>
        </div>
        {filas.length > TAMANO_PAGINA && (
          <div className={styles.busqueda}>
            <Input aria-label="Buscar en la vista previa" placeholder="Buscar por código o nombre…" value={busqueda}
              onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} />
            {filtroBusqueda && <span className={styles.nota}>Mostrando {filasFiltradas.length} de {filas.length} filas de la vista previa.</span>}
          </div>
        )}
        {errorAplicar && <p className={styles.aviso} role="alert">{errorAplicar}</p>}
        {errorVista && <div className={styles.aviso}>
          <p role="alert">{errorVista}</p>
          <Button variant="secondary" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</Button>
        </div>}
        <Table columns={columnas} getRowKey={(fila) => fila.id}
          data={filasFiltradas.slice((paginaVisible - 1) * TAMANO_PAGINA, paginaVisible * TAMANO_PAGINA)}
          emptyMessage={motivo || (cargando ? 'Calculando la vista previa…' : errorVista ? 'Vista previa no disponible.'
            : filas.length ? 'No hay coincidencias en esta vista previa.' : 'No se encontraron productos para este alcance.')}
        />
        <Pagination page={paginaVisible} totalPages={paginas} onPageChange={setPagina} disabled={guardando} />
        <div className={styles.pie}>
          <p className={styles.nota}>Importes en su moneda de referencia.</p>
          <BotonConMotivo tooltip motivo={motivoAplicar || undefined} disabled={guardando} onClick={() => setConfirmar(true)}>
            {etiquetaAplicar}
          </BotonConMotivo>
        </div>
      </section>

      {confirmar && <ConfirmActionModal title={`Confirmar ajuste de ${esPrecio ? 'precios' : 'costos'}`}
        confirmLabel="Confirmar cambios" isConfirming={guardando}
        description={`Se actualizarán los ${esPrecio ? 'precios' : 'costos'} de ${afectados} ${afectados === 1 ? 'producto' : 'productos'} en ${stock ? sucursal?.nombre ?? 'la sucursal seleccionada' : 'el catálogo de Productos'} con los importes de la vista previa.${esPrecio && !stock ? ' Las sucursales que heredan el precio base recibirán el nuevo precio.' : ''}${esPrecio && stock && incluirHeredados ? ' Los precios heredados seleccionados quedarán como precios propios de la sucursal.' : ''}`}
        onConfirm={() => void aplicar()} onClose={() => setConfirmar(false)} />}
    </div>
  );
}
