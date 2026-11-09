import { SelectHTMLAttributes, ReactNode, useId } from 'react';
import MarcaObligatoria from '../MarcaObligatoria/MarcaObligatoria';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export default function Select({ label, id, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const obligatorio = rest.required || String(rest['aria-required']) === 'true';
  return (
    <div className={styles.selectGroup}>
      {label && <label htmlFor={selectId}>{label}{obligatorio && <MarcaObligatoria />}</label>}
      <select id={selectId} {...rest}>
        {children}
      </select>
    </div>
  );
}
