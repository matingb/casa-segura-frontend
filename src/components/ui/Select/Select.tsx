import { SelectHTMLAttributes, ReactNode } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export default function Select({ label, id, children, ...rest }: SelectProps) {
  return (
    <div className={styles.selectGroup}>
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} {...rest}>
        {children}
      </select>
    </div>
  );
}
