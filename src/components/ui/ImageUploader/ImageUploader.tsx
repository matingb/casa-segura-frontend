'use client';

import { ImageIcon, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import Button from '../Button/Button';
import styles from './ImageUploader.module.css';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LIMITE_IMAGEN = 5 * 1024 * 1024;

interface ImageUploaderProps {
  imagenUrl?: string;
  disabled?: boolean;
  onSeleccionar: (archivo: File) => void;
  onEliminar: () => void;
}

export default function ImageUploader({ imagenUrl: previewUrl, disabled, onSeleccionar, onEliminar }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const seleccionar = (file?: File) => {
    if (!file || disabled) return;
    if (!TIPOS_IMAGEN.includes(file.type)) {
      setError('Elegí una imagen JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > LIMITE_IMAGEN) {
      setError('La imagen debe pesar hasta 5 MB.');
      return;
    }
    setError(null);
    onSeleccionar(file);
  };

  return (
    <div className={styles.uploader}>
      <button
        type="button"
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''} ${previewUrl ? styles.hasImage : ''}`}
        aria-label={previewUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          seleccionar(e.dataTransfer.files[0]);
        }}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa del producto" className={styles.previewImage} />
            <span className={styles.hoverOverlay}>Cambiar imagen</span>
          </>
        ) : (
          <span className={styles.emptyState}>
            <ImageIcon size={32} className={styles.emptyIcon} aria-hidden="true" />
            <span className={styles.emptyText}>Arrastrá una imagen o hacé clic para subir</span>
          </span>
        )}
      </button>

      {previewUrl && (
        <Button
          type="button"
          variant="dangerOutline"
          disabled={disabled}
          onClick={() => {
            setError(null);
            onEliminar();
          }}
        >
          <Trash2 size={15} aria-hidden="true" />
          Eliminar imagen
        </Button>
      )}
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={TIPOS_IMAGEN.join(',')}
        onChange={(e) => {
          seleccionar(e.currentTarget.files?.[0]);
          e.currentTarget.value = '';
        }}
        className={styles.hiddenInput}
        disabled={disabled}
      />
    </div>
  );
}
