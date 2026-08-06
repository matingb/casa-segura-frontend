import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import ProductoForm from '../../_components/ProductoForm';
import { apiUrl } from '../../../../../lib/api';
import { Producto } from '../../../../../lib/types/Producto';

interface EditarProductoPageProps {
  params: Promise<{ id: string }>;
}

function mapApiProductoToProducto(apiProd: any): Producto {
  return {
    id: apiProd.id,
    subtipoId: apiProd.subtipo_id ?? '',
    codigo: apiProd.codigo ?? '',
    codigoBarraProveedor: apiProd.codigo_barra_proveedor ?? '',
    nombre: apiProd.nombre ?? '',
    marca: apiProd.marca ?? '',
    modelo: apiProd.modelo ?? '',
    color: apiProd.color ?? '',
    presentacion: apiProd.presentacion ?? '',
    alto: apiProd.alto ?? 0,
    ancho: apiProd.ancho ?? 0,
    profundidad: apiProd.profundidad ?? 0,
    pesoUnitario: apiProd.peso_unitario ?? 0,
    imagenUrl: apiProd.imagen_url ?? '',
    descripcion: apiProd.descripcion ?? '',
    activo: apiProd.activo ?? false,
  };
}

export default async function EditarProductoPage({ params }: EditarProductoPageProps) {
  const { id } = await params;

  let producto: Producto | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');
    const cookieString = token ? `access_token=${token.value}` : '';

    const res = await fetch(apiUrl(`/api/productos/${id}`), {
      cache: 'no-store',
      headers: { Cookie: cookieString },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        producto = mapApiProductoToProducto(json.data);
      }
    }
  } catch (err) {
    console.error('[EditarProductoPage] Error loading product:', err);
  }

  if (!producto) {
    notFound();
  }

  return <ProductoForm title="Editar producto" producto={producto} />;
}

