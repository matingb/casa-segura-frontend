import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import StockForm from '../../_components/StockForm';
import { apiUrl } from '../../../../../lib/api';
import { StockItem } from '../../../../../lib/types/Stock';
import { mapApiProductoSucursalToStockItem } from '../../../../../lib/api/stock.client';

interface EditarStockPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarStockPage({ params }: EditarStockPageProps) {
  const { id } = await params;

  let stockItem: StockItem | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');
    const cookieString = token ? `access_token=${token.value}` : '';

    const res = await fetch(apiUrl(`/api/producto-sucursal/${id}`), {
      cache: 'no-store',
      headers: { Cookie: cookieString },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        stockItem = mapApiProductoSucursalToStockItem(json.data);
      } else {
        console.error('[EditarStockPage] res.ok but invalid json:', json);
      }
    } else {
      console.error('[EditarStockPage] res not ok:', res.status, res.statusText, await res.text());
    }
  } catch (err) {
    console.error('[EditarStockPage] Fetch error:', err);
  }

  if (!stockItem) {
    notFound();
  }

  return <StockForm title="Editar stock" stockItem={stockItem} />;
}
