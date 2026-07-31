'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Button from '../Button/Button';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  label?: string;
  initialImageUrl?: string;
}

export default function ImageUploader({ label = 'Imagen', initialImageUrl }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialImageUrl);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    console.log('Imagen seleccionada', file.name);
  };

  return (
    <div className={styles.uploader}>
      {label && <span className={styles.label}>{label}</span>}

      <div className={styles.preview}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Vista previa del producto" className={styles.previewImage} />
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
      <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
        {previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
      </Button>
    </div>
  );
}
