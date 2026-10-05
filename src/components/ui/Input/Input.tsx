import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, id, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={styles.inputGroup}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input ref={ref} id={inputId} {...rest} />
    </div>
  );
});

export default Input;
