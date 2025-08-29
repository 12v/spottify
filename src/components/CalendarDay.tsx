import type { Measurement } from '../types';

interface CalendarDayProps {
  day: Date;
  currentMonth: Date;
  measurements: Measurement[];
  isPredPeriod: boolean;
  isPredOvulation: boolean;
  inFertileWindow: boolean;
  isToday: boolean;
  onClick: () => void;
}

export default function CalendarDay({
  day,
  currentMonth,
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
      const flow = (periodMeasurement.value as any).option;
      switch (flow) {
        case 'heavy': return '#d32f2f';
        case 'medium': return '#f57c00';
        case 'light': return '#fbc02d';
        case 'spotting': return '#ffb74d';
        default: 
          console.error(`Unknown period flow type: ${flow}`);
          return 'transparent';
      }
    }

    // Check for other measurements
    if (measurements.length > 0) {
      return '#e1bee7'; // Light purple for other data
    }

    return 'transparent';
  }

  function getDayData() {
    const period = measurements.find(m => m.type === 'period');
    const bbt = measurements.find(m => m.type === 'bbt');
    const symptoms = measurements.filter(m => m.type === 'cramps' || m.type === 'sore_breasts');

    return {
      period: period ? (period.value as any).option : null,
      bbt: bbt ? (bbt.value as any).celsius : null,
      symptoms: symptoms.length
    };
  }

  const dayData = getDayData();
  const backgroundColor = getDayColor();
  const hasData = measurements.length > 0;

  let dayBackgroundColor = 'white';

  // Fertile window (only if no period data)
  if (inFertileWindow && !hasData && !dayData.period && !isPredPeriod) {
    dayBackgroundColor = '#F0FFF0';
  }

  // Predicted period (light pink)
  if (isPredPeriod && !dayData.period) {
    dayBackgroundColor = '#FFE4E1';
  }

  // Actual period days (color coded by flow intensity, except spotting)
  if (dayData.period) {
    switch (dayData.period) {
      case 'heavy':
        dayBackgroundColor = '#ff3535ff'; // Bright dark red
        break;
      case 'medium':
        dayBackgroundColor = '#f75555ff'; // Bright medium red
        break;
      case 'light':
        dayBackgroundColor = '#f89090ff'; // Darker light red
        break;
      case 'spotting':
        // No background color for spotting
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
          (dayData.period === 'heavy' || dayData.period === 'medium') ? 'white' : 'inherit'
      }}>
        {day.getDate()}
      </div>

      <div style={{ fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {/* Predictions */}
        {isPredOvulation && (
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '1'
          }}>
            🥚
          </div>
        )}

        {/* Actual Data */}
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
                backgroundColor: '#2196f3',
                color: 'white',
                padding: '1px 3px',
                borderRadius: '2px',
                textAlign: 'center'
              }}>
                {dayData.bbt}°
              </div>
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