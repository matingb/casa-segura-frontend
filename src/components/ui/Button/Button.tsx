import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function Button({ children, variant = 'primary', className, ...rest }: ButtonProps) {
  const variantClass = styles[variant];
  const combinedClassName = className ? `${styles.button} ${variantClass} ${className}` : `${styles.button} ${variantClass}`;

  return (
    <button className={combinedClassName} {...rest}>
      {children}
    </button>
  );
}
