import { styles } from './styles';

async function getProductos() {
  try {
    const res = await fetch('http://localhost:8080/api/productos', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener productos');
    const data = await res.json();
    if (data.status === 'success') {
      return data.data;
    }
    return [];
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export default async function Home() {
  let productos = [];
  let errorMsg = null;

  try {
    productos = await getProductos();
  } catch (err: any) {
    errorMsg = err.message;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.headerTitle}>CasaSegura Frontend</h1>
      
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Productos</h2>
        
        {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
        
        {productos.length === 0 && !errorMsg ? (
          <p style={styles.emptyText}>No hay productos.</p>
        ) : (
          <ul style={styles.list}>
            {productos.map((prod: any) => (
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
