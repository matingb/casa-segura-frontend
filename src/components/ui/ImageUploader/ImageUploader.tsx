'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Button from '../Button/Button';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  label?: string;
  initialImageUrl?: string;
  productoId?: string;
  onUpload?: (url: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function ImageUploader({
  label = 'Imagen',
  initialImageUrl,
  productoId,
  onUpload,
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialImageUrl);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview local inmediatamente
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewUrl(localUrl);
    setErrorMsg(null);

    // Si no hay productoId, no se puede subir (ej: producto nuevo aún no creado)
    if (!productoId) {
      console.warn('[ImageUploader] productoId no provisto, imagen no subida al servidor');
      return;
    }

    // Subir al backend
    setUploadState('uploading');

    try {
      const formData = new FormData();
      formData.append('imagen', file);

      const response = await fetch(`/api/productos/${productoId}/imagen`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include', // envía la cookie de auth
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? 'Error al subir la imagen');
      }

      const signedUrl: string = json.data.imagen_url;

      // Reemplazar el preview local por la signed URL del servidor
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(signedUrl);
      setUploadState('success');
      onUpload?.(signedUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setErrorMsg(msg);
      setUploadState('error');
      console.error('[ImageUploader] Error al subir imagen:', err);
    }

    // Limpiar el input para permitir re-subir el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploading = uploadState === 'uploading';

  return (
    <div className={styles.uploader}>
      {label && <span className={styles.label}>{label}</span>}

      <div className={styles.preview}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Vista previa del producto"
            className={`${styles.previewImage} ${isUploading ? styles.uploading : ''}`}
          />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className={styles.emptyIcon}>
            <path
              d="M4 16.5V6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5M4 16.5A1.75 1.75 0 0 0 5.75 18h12.5A1.75 1.75 0 0 0 20 16.5M4 16.5l4.72-4.72a1.5 1.5 0 0 1 2.12 0L13 13.94m7-2.94-2.72-2.72a1.5 1.5 0 0 0-2.12 0L13 13.94m0 0 1.5 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Overlay de carga */}
        {isUploading && (
          <div className={styles.uploadingOverlay}>
            <svg
              className={styles.spinner}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="31.4 31.4"
              />
            </svg>
            <span>Subiendo...</span>
          </div>
        )}
      </div>

      {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className={styles.hiddenInput}
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Subiendo...' : previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
      </Button>
    </div>
  );
}
