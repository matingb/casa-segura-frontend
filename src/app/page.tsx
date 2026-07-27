import { styles } from './styles';
import { cookies } from 'next/headers';
import LogoutButton from '../components/LogoutButton';
import { apiUrl } from '../lib/api';

async function getProductos(cookieString: string) {
  const res = await fetch(apiUrl('/api/productos'), {
    cache: 'no-store',
    headers: { Cookie: cookieString },
  });

  if (!res.ok) {
    throw new Error(`Error al obtener productos: ${res.status}`);
  }

  const data = await res.json();
  return data.status === 'success' ? (data.data as Producto[]) : [];
}

interface Producto {
  id: string;
  nombre: string;
  precio_venta: number;
}

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');

  const cookieString = token ? `access_token=${token.value}` : '';

  let productos: Producto[] = [];
  let errorMsg: string | null = null;

  try {
    productos = await getProductos(cookieString);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Error al cargar los productos';
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={styles.headerTitle}>CasaSegura Frontend</h1>
        <LogoutButton />
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Productos</h2>

        {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

        {productos.length === 0 && !errorMsg ? (
          <p style={styles.emptyText}>No hay productos.</p>
        ) : (
          <ul style={styles.list}>
            {productos.map((prod) => (
              <li key={prod.id} style={styles.listItem}>
                <span style={styles.productName}>{prod.nombre}</span>
                <span style={styles.productPrice}>${prod.precio_venta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
