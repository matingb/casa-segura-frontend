'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import ImageUploader from '../../../../components/ui/ImageUploader/ImageUploader';
import { Producto } from '../../../../lib/types/Producto';
import { tiposMock } from '../../../../lib/mocks/tipos';
import { getSubtiposPorTipo, getTipoIdDeSubtipo } from '../../../../lib/mocks/clasificacionProducto';
import styles from './ProductoForm.module.css';

interface ProductoFormProps {
  title: string;
  producto?: Producto;
}

export default function ProductoForm({ title, producto }: ProductoFormProps) {
  const router = useRouter();
  const [tipoId, setTipoId] = useState(producto ? getTipoIdDeSubtipo(producto.subtipoId) ?? '' : '');
  const subtipos = tipoId ? getSubtiposPorTipo(tipoId) : [];
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(producto?.imagenUrl);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const body = {
      codigo:                formData.get('codigo'),
      codigo_barra_proveedor: formData.get('codigoBarraProveedor'),
      nombre:                formData.get('nombre'),
      marca:                 formData.get('marca'),
      modelo:                formData.get('modelo'),
      color:                 formData.get('color'),
      presentacion:          formData.get('presentacion'),
      subtipo_id:            formData.get('subtipoId') || null,
      alto:                  formData.get('alto') ? Number(formData.get('alto')) : null,
      ancho:                 formData.get('ancho') ? Number(formData.get('ancho')) : null,
      profundidad:           formData.get('profundidad') ? Number(formData.get('profundidad')) : null,
      peso_unitario:         formData.get('pesoUnitario') ? Number(formData.get('pesoUnitario')) : null,
      descripcion:           formData.get('descripcion'),
      activo:                formData.get('activo') === 'true',
      imagen_url:            imagenUrl ?? null,
    };

    try {
      const isEditing = Boolean(producto?.id);
      const url = isEditing ? `/api/productos/${producto!.id}` : '/api/productos';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Error al guardar producto:', err.message);
        return;
      }

      router.push('/productos');
    } catch (err) {
      console.error('Error de red al guardar producto:', err);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.topSection}>
            <ImageUploader
              initialImageUrl={imagenUrl}
              productoId={producto?.id}
              onUpload={(url) => setImagenUrl(url)}
            />

            <div className={styles.topFields}>
              <div className={styles.grid}>
                <Input label="Código" name="codigo" defaultValue={producto?.codigo} placeholder="Ej: CAM-001" />
                <Input
                  label="Código de barra proveedor"
                  name="codigoBarraProveedor"
                  defaultValue={producto?.codigoBarraProveedor}
                  placeholder="Ej: 7791234560011"
                />
                <Input label="Nombre" name="nombre" defaultValue={producto?.nombre} placeholder="Ej: Cámara domo 4MP" />
                <Input label="Marca" name="marca" defaultValue={producto?.marca} placeholder="Ej: Hikvision" />
                <Input label="Modelo" name="modelo" defaultValue={producto?.modelo} placeholder="Ej: DS-2CE56" />
                <Input label="Color" name="color" defaultValue={producto?.color} placeholder="Ej: Blanco" />
                <Input
                  label="Presentación"
                  name="presentacion"
                  defaultValue={producto?.presentacion}
                  placeholder="Ej: Unidad, Kit, Caja x10"
                />

                <Select label="Tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
                  <option value="">Seleccionar tipo</option>
                  {tiposMock.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </Select>
                <Select label="Subtipo" name="subtipoId" defaultValue={producto?.subtipoId} disabled={!tipoId}>
                  <option value="">Seleccionar subtipo</option>
                  {subtipos.map((subtipo) => (
                    <option key={subtipo.id} value={subtipo.id}>
                      {subtipo.nombre}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Alto (cm)"
                  name="alto"
                  type="number"
                  step="0.1"
                  defaultValue={producto?.alto}
                  placeholder="Ej: 9.5"
                />
                <Input
                  label="Ancho (cm)"
                  name="ancho"
                  type="number"
                  step="0.1"
                  defaultValue={producto?.ancho}
                  placeholder="Ej: 9.5"
                />
                <Input
                  label="Profundidad (cm)"
                  name="profundidad"
                  type="number"
                  step="0.1"
                  defaultValue={producto?.profundidad}
                  placeholder="Ej: 7.2"
                />
                <Input
                  label="Peso unitario (kg)"
                  name="pesoUnitario"
                  type="number"
                  step="0.01"
                  defaultValue={producto?.pesoUnitario}
                  placeholder="Ej: 0.45"
                />

                <Select label="Estado" name="activo" defaultValue={producto ? String(producto.activo) : 'true'}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Select>
              </div>

              <div className={styles.descriptionField}>
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  defaultValue={producto?.descripcion}
                  placeholder="Descripción del producto"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/productos')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
