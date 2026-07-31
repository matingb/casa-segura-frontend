import { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, id, ...rest }: InputProps) {
  return (
    <div className={styles.inputGroup}>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...rest} />
    </div>
  );
}
