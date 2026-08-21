import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, id, ...rest }, ref) {
  return (
    <div className={styles.inputGroup}>
      {label && <label htmlFor={id}>{label}</label>}
      <input ref={ref} id={id} {...rest} />
    </div>
  );
});

export default Input;
