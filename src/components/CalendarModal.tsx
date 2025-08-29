import { useState, useEffect } from 'react';
import type { Measurement } from '../types';

interface CalendarModalProps {
  show: boolean;
  date: string;
  existingData: Measurement[];
  onClose: () => void;
  onSave: (measurements: {
    period: string;
    bbt: string;
    cramps: string;
    soreBreasts: string;
  }) => Promise<void>;
}

export default function CalendarModal({ show, date, existingData, onClose, onSave }: CalendarModalProps) {
  const [measurements, setMeasurements] = useState({
    period: 'none',
    bbt: '',
    cramps: 'none',
    soreBreasts: 'none'
  });

  useEffect(() => {
    if (show && existingData) {
      const periodData = existingData.find(m => m.type === 'period');
      const bbtData = existingData.find(m => m.type === 'bbt');
      const crampsData = existingData.find(m => m.type === 'cramps');
      const soreBreastsData = existingData.find(m => m.type === 'sore_breasts');

      setMeasurements({
        period: periodData ? (periodData.value as any).option : 'none',
        bbt: bbtData ? String((bbtData.value as any).celsius) : '',
        cramps: crampsData ? (crampsData.value as any).severity : 'none',
        soreBreasts: soreBreastsData ? (soreBreastsData.value as any).severity : 'none'
      });
    }
  }, [show, existingData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(measurements);
    handleClose();
  }

  function handleClose() {
    setMeasurements({
      period: 'none',
      bbt: '',
      cramps: 'none',
      soreBreasts: 'none'
    });
    onClose();
  }

  if (!show) return null;

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
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
            Log Data - {formattedDate}
          </h3>
          <button
            onClick={handleClose}
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="modal-period">Period Flow</label>
            <select
              id="modal-period"
              value={measurements.period}
              onChange={(e) => setMeasurements(prev => ({ ...prev, period: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            >
              <option value="none">None</option>
              <option value="spotting">Spotting</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
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
              value={measurements.bbt}
              onChange={(e) => setMeasurements(prev => ({ ...prev, bbt: e.target.value }))}
              placeholder="36.50"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="modal-cramps">Cramps</label>
            <select
              id="modal-cramps"
              value={measurements.cramps}
              onChange={(e) => setMeasurements(prev => ({ ...prev, cramps: e.target.value }))}
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
              value={measurements.soreBreasts}
              onChange={(e) => setMeasurements(prev => ({ ...prev, soreBreasts: e.target.value }))}
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
              onClick={handleClose}
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
  );
}