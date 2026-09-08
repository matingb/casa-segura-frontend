'use client';

import Modal from '../Modal/Modal';
import Button from '../Button/Button';

interface ConfirmActionModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Diálogo reutilizable para confirmar acciones irreversibles en la interfaz. */
export default function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const closeIfIdle = () => {
    if (!isConfirming) onClose();
  };

  return (
    <Modal
      title={title}
      onClose={closeIfIdle}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={closeIfIdle} disabled={isConfirming}>
            Volver
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? 'Procesando…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p>{description}</p>
    </Modal>
  );
}
