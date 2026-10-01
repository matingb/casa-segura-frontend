'use client';

import { AnalisisMargen } from '../../../../../lib/utils/cascada-descuentos';
import { formatARS } from '../../../../../lib/utils/formatters';

interface Props {
  analisis: AnalisisMargen;
  showText?: boolean;
  showDescuentoTag?: boolean;
}

export default function MargenStatusBadge({
  analisis,
  showText = true,
  showDescuentoTag = false,
}: Props) {
  if (analisis.estado === 'sin_datos') return null;

  let badgeColor = '';
  let badgeBg = '';
  let badgeBorder = '';
  let icon = '';
  let shortLabel = '';

  switch (analisis.estado) {
    case 'en_perdida':
      badgeColor = '#b91c1c';
      badgeBg = 'rgba(239, 68, 68, 0.12)';
      badgeBorder = '1px solid rgba(239, 68, 68, 0.3)';
      icon = '🚨';
      shortLabel = `En pérdida (${formatARS(analisis.gananciaUnitaria ?? 0)})`;
      break;

    case 'perforado':
      badgeColor = '#c2410c';
      badgeBg = 'rgba(249, 115, 22, 0.12)';
      badgeBorder = '1px solid rgba(249, 115, 22, 0.3)';
      icon = '⚠️';
      shortLabel = `Margen perforado (${analisis.margenEfectivo ?? 0}%)`;
      break;

    case 'tope_aplicado':
      badgeColor = '#b45309';
      badgeBg = 'rgba(245, 158, 11, 0.12)';
      badgeBorder = '1px solid rgba(245, 158, 11, 0.3)';
      icon = '🛡️';
      shortLabel = `Tope de margen aplicado (${formatARS(analisis.precioMinimo ?? 0)})`;
      break;

    case 'ajustado':
      badgeColor = '#d97706';
      badgeBg = 'rgba(251, 191, 36, 0.12)';
      badgeBorder = '1px solid rgba(251, 191, 36, 0.3)';
      icon = '⚡';
      shortLabel = `Margen ajustado (${analisis.margenEfectivo ?? 0}%)`;
      break;

    case 'optimo':
    default:
      badgeColor = '#15803d';
      badgeBg = 'rgba(34, 197, 94, 0.12)';
      badgeBorder = '1px solid rgba(34, 197, 94, 0.25)';
      icon = '✓';
      shortLabel = `Margen +${analisis.margenEfectivo}% (${formatARS(analisis.gananciaUnitaria ?? 0)})`;
      break;
  }

  const primaryAlert = analisis.alertas.find(
    (a) => a.severidad === 'critica' || a.severidad === 'advertencia'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: badgeColor,
            background: badgeBg,
            border: badgeBorder,
            width: 'fit-content',
          }}
          title={primaryAlert?.mensaje || shortLabel}
        >
          <span>{icon}</span>
          <span>{shortLabel}</span>
        </div>

        {showDescuentoTag && (analisis.descuentoEfectivoPorcentaje ?? 0) > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#4f46e5',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              width: 'fit-content',
            }}
            title={`Descuento total aplicado en cadena: ${analisis.descuentoEfectivoPorcentaje}%`}
          >
            <span>🏷️</span>
            <span>-{analisis.descuentoEfectivoPorcentaje}% desc.</span>
          </div>
        )}
      </div>

      {showText && primaryAlert && (
        <span
          style={{
            fontSize: '0.72rem',
            lineHeight: '1.2',
            color: badgeColor,
            fontWeight: 500,
          }}
        >
          {primaryAlert.mensaje}
        </span>
      )}
    </div>
  );
}
