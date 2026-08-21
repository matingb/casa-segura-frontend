import { ReactNode } from 'react';
import styles from './DetailField.module.css';

interface DetailFieldProps {
  label: ReactNode;
  children: ReactNode;
}

export default function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}
