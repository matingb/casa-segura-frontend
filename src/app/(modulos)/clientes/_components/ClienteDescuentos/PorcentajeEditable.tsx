'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import InputPorcentaje, { validarPorcentaje } from '../../../../../components/ui/InputPorcentaje/InputPorcentaje';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './ClienteDescuentos.module.css';

interface Props {
  id: string;
  valor: number;
  etiqueta: string;
  onGuardar: (valor: number) => Promise<void>;
  disabled?: boolean;
}

/** Porcentaje que se edita en la misma tabla: clic, escribir y Enter (Esc cancela). */
export default function PorcentajeEditable({ id, valor, etiqueta, onGuardar, disabled }: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { valor: nuevo, error } = validarPorcentaje(texto);

  const abrir = () => { setTexto(String(valor).replace('.', ',')); setEditando(true); };
  const guardar = async () => {
    if (guardando) return;
    if (nuevo == null || nuevo === Number(valor)) { setEditando(false); return; }
    setGuardando(true);
    try {
      await onGuardar(nuevo);
      setEditando(false);
    } catch {
      // El error ya se informó con un toast; queda en edición para corregir.
    } finally {
      setGuardando(false);
    }
  };

  if (!editando) {
    return (
      <button type="button" className={styles.porcentajeBoton} onClick={abrir} disabled={disabled} title={`Cambiar ${etiqueta}`}>
        {formatPorcentaje(valor)}
        <Pencil size={12} aria-hidden />
      </button>
    );
  }
  return (
    <InputPorcentaje
      id={id}
      compacto
      autoFocus
      value={texto}
      onChange={setTexto}
      error={texto.trim() === '' ? 'Escribí un porcentaje.' : error}
      aria-label={etiqueta}
      disabled={guardando}
      onBlur={() => void guardar()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); void guardar(); }
        if (e.key === 'Escape') { e.stopPropagation(); setEditando(false); }
      }}
    />
  );
}
