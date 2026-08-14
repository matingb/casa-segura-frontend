import CuentasCatalogo from './_components/CuentasCatalogo/CuentasCatalogo';
import styles from './cuentas-financieras.module.css';

export const metadata = {
  title: 'Cuentas Financieras | CasaSegura',
  description: 'Gestión de cuentas financieras: saldos, porcentajes y movimientos.',
};

export default function CuentasFinancierasPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Cuentas financieras</h1>
      <CuentasCatalogo />
    </div>
  );
}
