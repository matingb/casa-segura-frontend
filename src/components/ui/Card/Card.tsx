import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function Card({ children, title, actions }: CardProps) {
  return (
    <div className={styles.card}>
      {(title || actions) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
