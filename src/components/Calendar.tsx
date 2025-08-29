import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useCycleData } from '../hooks/useCycleData';
import { useCyclePredictions } from '../hooks/useCyclePredictions';
import { formatLocalDate } from '../utils/dateUtils';
import CalendarModal from './CalendarModal';
import CalendarDay from './CalendarDay';

export default function Calendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { measurements, groupedMeasurements, stats, loading, saveMeasurement } = useCycleData();
  
  // Initialize currentDate from URL parameters or default to now
  const [currentDate, setCurrentDate] = useState(() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    if (yearParam && monthParam) {
      return new Date(parseInt(yearParam), parseInt(monthParam), 1);
    }
    return new Date();
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState('');

  const predictions = useCyclePredictions(measurements, stats);

  // Auto-open modal if requested via URL parameter
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    const dateParam = searchParams.get('date');
    
    if (openModal === 'true' && dateParam && !showModal && !loading) {
      handleDayClick(dateParam);
      
      // Clean up URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('openModal');
      newSearchParams.delete('date');
      const newUrl = newSearchParams.toString() ? 
        `/calendar?${newSearchParams.toString()}` : '/calendar';
      navigate(newUrl, { replace: true });
    }
  }, [searchParams, showModal, loading, navigate]);


  function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // Last day of current month

    // Adjust for Monday-first week: Sunday=0 becomes 6, Monday=1 becomes 0, etc.
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const lastDayOfWeek = (lastDay.getDay() + 6) % 7;

    const days = [];

    // Add partial week from previous month (only the days needed to complete the first row)
    const prevMonth = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i);
      days.push(day);
    }

    // Add all days of current month
    for (let date = 1; date <= lastDay.getDate(); date++) {
      days.push(new Date(year, month, date));
    }

    // Add partial week from next month (only the days needed to complete the last row)
    const daysToAdd = 6 - lastDayOfWeek;
    for (let i = 1; i <= daysToAdd; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  function navigateMonth(direction: number) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  }

  function goToCurrentMonth() {
    setCurrentDate(new Date());
  }

  function handleDayClick(dateStr: string) {
    setModalDate(dateStr);
    setShowModal(true);
  }

  async function handleModalSave(modalMeasurements: {
    period: string;
    bbt: string;
    cramps: string;
    soreBreasts: string;
  }) {
    // Save each measurement type individually
    await saveMeasurement(modalDate, 'period', modalMeasurements.period);
    await saveMeasurement(modalDate, 'bbt', modalMeasurements.bbt);
    await saveMeasurement(modalDate, 'cramps', modalMeasurements.cramps);
    await saveMeasurement(modalDate, 'sore_breasts', modalMeasurements.soreBreasts);
  }

  const calendarDays = generateCalendar();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Check if we're viewing the current month
  const now = new Date();
  const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>📅 Calendar</h2>
          <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #ddd',
            borderTop: '4px solid #8B0000',
            borderRadius: '50%',
            margin: '0 auto 1.5rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading calendar data...</p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>📅 Calendar</h2>
        <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </div>

      {/* Month/Year Display */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, textAlign: 'center' }}>{monthYear}</h3>
      </div>

      {/* Calendar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => navigateMonth(-1)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ← Previous
        </button>
        <button
          onClick={goToCurrentMonth}
          disabled={isCurrentMonth}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isCurrentMonth ? '#ccc' : '#4682B4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isCurrentMonth) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#5A9BD4';
            }
          }}
          onMouseOut={(e) => {
            if (!isCurrentMonth) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#4682B4';
            }
          }}
        >
          Today
        </button>
        <button
          onClick={() => navigateMonth(1)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        backgroundColor: '#ddd',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} style={{
            padding: '0.5rem',
            backgroundColor: '#f5f5f5',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}>
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const dateStr = formatLocalDate(day);
          const dayMeasurements = groupedMeasurements[dateStr] || [];
          
          return (
            <CalendarDay
              key={`${dateStr}-${index}`}
              day={day}
              measurements={dayMeasurements}
              isPredPeriod={predictions.isPredictedPeriod(dateStr)}
              isPredOvulation={predictions.isPredictedOvulation(dateStr)}
              inFertileWindow={predictions.isInFertileWindow(dateStr)}
              isToday={predictions.isToday(dateStr)}
              onClick={() => handleDayClick(dateStr)}
            />
          );
        })}
      </div>

      {measurements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No data recorded yet.</p>
          <button
            onClick={() => handleDayClick(formatLocalDate(new Date()))}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              backgroundColor: '#8B0000',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add First Measurement
          </button>
        </div>
      )}

      <CalendarModal
        show={showModal}
        date={modalDate}
        existingData={groupedMeasurements[modalDate] || []}
        onClose={() => setShowModal(false)}
        onSave={handleModalSave}
      />
    </div>
  );
}