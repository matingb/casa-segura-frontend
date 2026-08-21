import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'danger';
}

export default function IconButton({ icon, label, variant = 'default', className, ...rest }: IconButtonProps) {
  const variantClass = styles[variant];
  const combinedClassName = className
    ? `${styles.iconButton} ${variantClass} ${className}`
    : `${styles.iconButton} ${variantClass}`;

  return (
    <button type="button" className={combinedClassName} title={label} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}
