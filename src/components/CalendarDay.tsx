import { memo } from 'react';
import { PERIOD_OPTIONS } from '../utils/constants';
import type { Measurement } from '../types';

interface CalendarDayProps {
  day: Date;
  measurements: Measurement[];
  isPredPeriod: boolean;
  isPredOvulation: boolean;
  inFertileWindow: boolean;
  isToday: boolean;
  onClick: () => void;
}

function CalendarDay({
  day,
  measurements,
  isPredPeriod,
  isPredOvulation,
  inFertileWindow,
  isToday: todayMarker,
  onClick
}: CalendarDayProps) {
  
  function getDayColor() {
    const periodMeasurement = measurements.find(m => m.type === 'period');

    if (periodMeasurement) {
      const flow = (periodMeasurement.value as { option: string }).option;
      switch (flow) {
        case PERIOD_OPTIONS.HEAVY: return '#d32f2f';
        case PERIOD_OPTIONS.MEDIUM: return '#f57c00';
        case PERIOD_OPTIONS.LIGHT: return '#fbc02d';
        case PERIOD_OPTIONS.SPOTTING: return '#ffb74d';
        default: 
          console.error(`Unknown period flow type: ${flow}`);
          return 'transparent';
      }
    }

    if (measurements.length > 0) {
      return '#e1bee7'; // Light purple for other data
    }

    return 'transparent';
  }

  function getDayData() {
    const period = measurements.find(m => m.type === 'period');
    const bbt = measurements.find(m => m.type === 'bbt');
    const symptoms = measurements.filter(m => m.type === 'cramps' || m.type === 'sore_breasts');
    const lhSurge = measurements.find(m => m.type === 'lh_surge');

    let lhSurgeStatus = null;
    if (lhSurge) {
      const value = lhSurge.value as { detected?: boolean; status?: string };
      if (typeof value.detected === 'boolean') {
        // Old format migration
        lhSurgeStatus = value.detected ? 'positive' : 'negative';
      } else if (typeof value.status === 'string') {
        // New format
        lhSurgeStatus = value.status;
      }
    }

    return {
      period: period ? (period.value as { option: string }).option : null,
      bbt: bbt ? (bbt.value as { temperature: number }).temperature : null,
      symptoms: symptoms.length,
      lhSurge: lhSurgeStatus
    };
  }

  const dayData = getDayData();
  const backgroundColor = getDayColor();
  const hasData = measurements.length > 0;

  let dayBackgroundColor = 'white';

  if (inFertileWindow && !hasData && !dayData.period && !isPredPeriod) {
    dayBackgroundColor = '#F0FFF0';
  }

  if (isPredPeriod && !dayData.period) {
    dayBackgroundColor = '#FFE4E1';
  }

  if (dayData.period) {
    switch (dayData.period) {
      case PERIOD_OPTIONS.HEAVY:
        dayBackgroundColor = '#ff3535ff'; // Bright dark red
        break;
      case PERIOD_OPTIONS.MEDIUM:
        dayBackgroundColor = '#f75555ff'; // Bright medium red
        break;
      case PERIOD_OPTIONS.LIGHT:
        dayBackgroundColor = '#f89090ff'; // Darker light red
        break;
      case PERIOD_OPTIONS.SPOTTING:
        break;
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.5rem',
        backgroundColor: dayBackgroundColor,
        border: todayMarker ? '3px solid #4169E1' :
          (hasData && !dayData.period) ? `2px solid ${backgroundColor}` : 'none',
        minHeight: '60px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: 1,
        cursor: 'pointer'
      }}
    >
      <div style={{
        fontSize: '0.8rem',
        fontWeight: todayMarker ? 'bold' : 'normal',
        marginBottom: '0.25rem',
        color: todayMarker ? '#4169E1' :
          (dayData.period === PERIOD_OPTIONS.HEAVY || dayData.period === PERIOD_OPTIONS.MEDIUM) ? 'white' : 'inherit'
      }}>
        {day.getDate()}
      </div>

      <div style={{ fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {isPredOvulation && (
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '1'
          }}>
            🥚
          </div>
        )}

        {dayData.lhSurge === 'positive' && (
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            lineHeight: '1',
            marginBottom: '2px'
          }}>
            ↑
          </div>
        )}

        {dayData.lhSurge === 'negative' && (
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            lineHeight: '1',
            marginBottom: '2px',
            color: '#999'
          }}>
            —
          </div>
        )}

        {hasData && (
          <>
            {dayData.period && (
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                lineHeight: '1'
              }}>
                🩸
              </div>
            )}
            {dayData.bbt && (
              <div style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#2196f3',
                borderRadius: '50%',
                margin: '0 auto'
              }} />
            )}
            {dayData.symptoms > 0 && (
              <div style={{
                backgroundColor: '#ff9800',
                color: 'white',
                padding: '1px 3px',
                borderRadius: '2px',
                textAlign: 'center',
                fontSize: '0.5rem'
              }}>
                {dayData.symptoms}⚠
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(CalendarDay);