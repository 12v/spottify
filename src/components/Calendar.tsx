import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';
import { CycleService } from '../services/cycleService';
import type { Measurement, Prediction, MeasurementType } from '../types';

const dataService = new DataService();

export default function Calendar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [groupedMeasurements, setGroupedMeasurements] = useState<Record<string, Measurement[]>>({});
  
  // Initialize currentDate from URL parameters or default to now
  const [currentDate, setCurrentDate] = useState(() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    if (yearParam && monthParam) {
      return new Date(parseInt(yearParam), parseInt(monthParam), 1);
    }
    return new Date();
  });
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalMeasurements, setModalMeasurements] = useState({
    period: 'none',
    bbt: '',
    cramps: 'none',
    soreBreasts: 'none'
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Update currentDate when URL parameters change
  useEffect(() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    if (yearParam && monthParam) {
      const newDate = new Date(parseInt(yearParam), parseInt(monthParam), 1);
      setCurrentDate(newDate);
    }
  }, [searchParams]);

  async function loadData() {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const data = await dataService.getMeasurements(currentUser.uid);
      setMeasurements(data);
      
      const grouped = data.reduce((acc, measurement) => {
        if (!acc[measurement.date]) {
          acc[measurement.date] = [];
        }
        acc[measurement.date].push(measurement);
        return acc;
      }, {} as Record<string, Measurement[]>);
      
      setGroupedMeasurements(grouped);
      
      // Calculate predictions
      const pred = CycleService.predictNextCycle(data);
      setPrediction(pred);
      
      // Calculate stats for multiple period predictions
      const cycleStats = CycleService.calculateCycleStats(data);
      setStats(cycleStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDayColor(dateStr: string) {
    const dayMeasurements = groupedMeasurements[dateStr] || [];
    const periodMeasurement = dayMeasurements.find(m => m.type === 'period');
    
    if (periodMeasurement) {
      const flow = (periodMeasurement.value as any).option;
      switch (flow) {
        case 'heavy': return '#d32f2f';
        case 'medium': return '#f57c00';
        case 'light': return '#fbc02d';
        default: return '#e0e0e0';
      }
    }
    
    // Check for other measurements
    if (dayMeasurements.length > 0) {
      return '#e1bee7'; // Light purple for other data
    }
    
    return 'transparent';
  }

  function getDayData(dateStr: string) {
    const dayMeasurements = groupedMeasurements[dateStr] || [];
    const period = dayMeasurements.find(m => m.type === 'period');
    const bbt = dayMeasurements.find(m => m.type === 'bbt');
    const symptoms = dayMeasurements.filter(m => m.type === 'cramps' || m.type === 'sore_breasts');
    
    return {
      period: period ? (period.value as any).option : null,
      bbt: bbt ? (bbt.value as any).celsius : null,
      symptoms: symptoms.length
    };
  }

  function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }

  function navigateMonth(direction: number) {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  }

  function goToCurrentMonth() {
    setCurrentDate(new Date());
  }

  function isPredictedPeriod(dateStr: string) {
    if (!prediction || !stats) return false;
    
    const checkDate = new Date(dateStr);
    const firstPeriodDate = new Date(prediction.nextPeriod);
    const averageCycleLength = Math.round(stats.averageCycleLength);
    const averagePeriodLength = Math.round(stats.averagePeriodLength);
    
    // Only calculate predictions if the date is in the future
    if (checkDate < firstPeriodDate) return false;
    
    // Calculate which cycle this date might belong to
    const daysSinceFirstPrediction = Math.floor((checkDate.getTime() - firstPeriodDate.getTime()) / (1000 * 60 * 60 * 24));
    const cycleNumber = Math.floor(daysSinceFirstPrediction / averageCycleLength);
    
    // Only calculate predictions for dates within a reasonable range (e.g., 3 years ahead)
    if (cycleNumber > 36) return false;
    
    const periodStartDate = new Date(firstPeriodDate);
    periodStartDate.setDate(periodStartDate.getDate() + (cycleNumber * averageCycleLength));
    
    const daysDiff = Math.floor((checkDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if date falls within this predicted period
    return daysDiff >= 0 && daysDiff < averagePeriodLength;
  }

  function isPredictedOvulation(dateStr: string) {
    if (!prediction) return false;
    return dateStr === prediction.ovulation;
  }

  function isInFertileWindow(dateStr: string) {
    if (!prediction) return false;
    const date = new Date(dateStr);
    const fertileStart = new Date(prediction.fertileWindow.start);
    const fertileEnd = new Date(prediction.fertileWindow.end);
    return date >= fertileStart && date <= fertileEnd;
  }

  function isToday(dateStr: string) {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  function handleDayClick(dateStr: string) {
    setModalDate(dateStr);
    
    // Load existing data for this date if it exists
    const existingData = groupedMeasurements[dateStr] || [];
    const periodData = existingData.find(m => m.type === 'period');
    const bbtData = existingData.find(m => m.type === 'bbt');
    const crampsData = existingData.find(m => m.type === 'cramps');
    const soreBreastsData = existingData.find(m => m.type === 'sore_breasts');
    
    setModalMeasurements({
      period: periodData ? (periodData.value as any).option : 'none',
      bbt: bbtData ? String((bbtData.value as any).celsius) : '',
      cramps: crampsData ? (crampsData.value as any).severity : 'none',
      soreBreasts: soreBreastsData ? (soreBreastsData.value as any).severity : 'none'
    });
    
    setShowModal(true);
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const promises = [];

      if (modalMeasurements.period !== 'none') {
        promises.push(dataService.addMeasurement(currentUser.uid, {
          type: 'period' as MeasurementType,
          date: modalDate,
          value: { option: modalMeasurements.period as any }
        }));
      }

      if (modalMeasurements.bbt) {
        promises.push(dataService.addMeasurement(currentUser.uid, {
          type: 'bbt' as MeasurementType,
          date: modalDate,
          value: { celsius: parseFloat(modalMeasurements.bbt) }
        }));
      }

      if (modalMeasurements.cramps !== 'none') {
        promises.push(dataService.addMeasurement(currentUser.uid, {
          type: 'cramps' as MeasurementType,
          date: modalDate,
          value: { severity: modalMeasurements.cramps as any }
        }));
      }

      if (modalMeasurements.soreBreasts !== 'none') {
        promises.push(dataService.addMeasurement(currentUser.uid, {
          type: 'sore_breasts' as MeasurementType,
          date: modalDate,
          value: { severity: modalMeasurements.soreBreasts as any }
        }));
      }

      await Promise.all(promises);
      
      // Reload data to update the calendar
      await loadData();
      
      // Close modal and reset form
      setShowModal(false);
      setModalMeasurements({
        period: 'none',
        bbt: '',
        cramps: 'none',
        soreBreasts: 'none'
      });
      
      alert('Data saved!');
    } catch (error) {
      alert('Error saving data');
    }
  }

  function handleModalClose() {
    setShowModal(false);
    setModalMeasurements({
      period: 'none',
      bbt: '',
      cramps: 'none',
      soreBreasts: 'none'
    });
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
          <h2>📅 Calendar</h2>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>📅 Calendar</h2>
        <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </div>

      {/* Calendar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button 
          onClick={() => navigateMonth(-1)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ← Previous
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>{monthYear}</h3>
          {!isCurrentMonth && (
            <button 
              onClick={goToCurrentMonth}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#4682B4', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#5A9BD4'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#4682B4'}
            >
              Go to Today
            </button>
          )}
        </div>
        <button 
          onClick={() => navigateMonth(1)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Next →
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#d32f2f', borderRadius: '2px' }}></div>
          Heavy Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#f57c00', borderRadius: '2px' }}></div>
          Medium Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#fbc02d', borderRadius: '2px' }}></div>
          Light Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#e1bee7', borderRadius: '2px' }}></div>
          Other Data
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FF69B4', borderRadius: '2px', border: '2px dashed #8B0000' }}></div>
          Predicted Period
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#32CD32', borderRadius: '50%' }}></div>
          Ovulation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FFE4E1', borderRadius: '2px', border: '1px solid #90EE90' }}></div>
          Fertile Window
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4169E1', borderRadius: '50%', border: '2px solid #000080' }}></div>
          Today
        </div>
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
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
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
        {calendarDays.map(day => {
          const dateStr = formatDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dayData = getDayData(dateStr);
          const backgroundColor = getDayColor(dateStr);
          const hasData = Object.keys(groupedMeasurements).includes(dateStr);
          const isPredPeriod = isPredictedPeriod(dateStr);
          const isPredOvulation = isPredictedOvulation(dateStr);
          const inFertileWindow = isInFertileWindow(dateStr);
          const todayMarker = isToday(dateStr);
          
          let dayBackgroundColor = isCurrentMonth ? 'white' : '#f9f9f9';
          if (inFertileWindow && !hasData) {
            dayBackgroundColor = '#FFE4E1';
          }
          // Today uses border only, no background override
          
          return (
            <div 
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              style={{
                padding: '0.5rem',
                backgroundColor: dayBackgroundColor,
                border: todayMarker ? '3px solid #4169E1' :
                        hasData ? `2px solid ${backgroundColor}` : 
                        inFertileWindow ? '1px solid #90EE90' : 'none',
                minHeight: '60px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                opacity: isCurrentMonth ? 1 : 0.6,
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                fontSize: '0.8rem', 
                fontWeight: todayMarker ? 'bold' : (isCurrentMonth ? 'normal' : '300'),
                marginBottom: '0.25rem',
                color: todayMarker ? '#4169E1' : 'inherit'
              }}>
                {day.getDate()}
                {todayMarker && <span style={{ fontSize: '0.6rem' }}> 📅</span>}
              </div>
              
              <div style={{ fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {/* Predictions */}
                {isPredPeriod && (
                  <div style={{ 
                    backgroundColor: '#FF69B4', 
                    color: 'white', 
                    padding: '1px 3px', 
                    borderRadius: '2px',
                    textAlign: 'center',
                    border: '1px dashed #8B0000'
                  }}>
                    Period
                  </div>
                )}
                {isPredOvulation && (
                  <div style={{ 
                    backgroundColor: '#32CD32', 
                    color: 'white', 
                    padding: '1px 3px', 
                    borderRadius: '2px',
                    textAlign: 'center'
                  }}>
                    🥚 Ovulation
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
                        {dayData.period === 'heavy' ? '🩸🩸🩸' : 
                         dayData.period === 'medium' ? '🩸🩸' : '🩸'}
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
        })}
      </div>

      {measurements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No data recorded yet.</p>
          <button 
            onClick={() => handleDayClick(new Date().toISOString().split('T')[0])}
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

      {/* Daily Input Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>
                Log Data - {new Date(modalDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button 
                onClick={handleModalClose}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="modal-period">Period Flow</label>
                <select
                  id="modal-period"
                  value={modalMeasurements.period}
                  onChange={(e) => setModalMeasurements(prev => ({ ...prev, period: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                >
                  <option value="none">None</option>
                  <option value="light">Light 🩸</option>
                  <option value="medium">Medium 🩸🩸</option>
                  <option value="heavy">Heavy 🩸🩸🩸</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="modal-bbt">Basal Body Temperature (°C)</label>
                <input
                  type="number"
                  id="modal-bbt"
                  step="0.01"
                  min="35"
                  max="40"
                  value={modalMeasurements.bbt}
                  onChange={(e) => setModalMeasurements(prev => ({ ...prev, bbt: e.target.value }))}
                  placeholder="36.50"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="modal-cramps">Cramps</label>
                <select
                  id="modal-cramps"
                  value={modalMeasurements.cramps}
                  onChange={(e) => setModalMeasurements(prev => ({ ...prev, cramps: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                >
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="modal-soreBreasts">Sore Breasts</label>
                <select
                  id="modal-soreBreasts"
                  value={modalMeasurements.soreBreasts}
                  onChange={(e) => setModalMeasurements(prev => ({ ...prev, soreBreasts: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                >
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button"
                  onClick={handleModalClose}
                  style={{ 
                    flex: 1,
                    padding: '0.75rem', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ 
                    flex: 2,
                    padding: '0.75rem', 
                    backgroundColor: '#8B0000', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Save Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}