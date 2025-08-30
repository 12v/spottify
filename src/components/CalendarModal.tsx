import { useState, useEffect } from 'react';
import { PERIOD_OPTIONS, SYMPTOM_SEVERITY } from '../utils/constants';
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
    period: PERIOD_OPTIONS.NONE as string,
    bbt: '',
    cramps: SYMPTOM_SEVERITY.NONE as string,
    soreBreasts: SYMPTOM_SEVERITY.NONE as string
  });

  useEffect(() => {
    if (show && existingData) {
      const periodData = existingData.find(m => m.type === 'period');
      const bbtData = existingData.find(m => m.type === 'bbt');
      const crampsData = existingData.find(m => m.type === 'cramps');
      const soreBreastsData = existingData.find(m => m.type === 'sore_breasts');

      setMeasurements({
        period: periodData ? (periodData.value as any).option : PERIOD_OPTIONS.NONE,
        bbt: bbtData ? String((bbtData.value as any).celsius) : '',
        cramps: crampsData ? (crampsData.value as any).severity : SYMPTOM_SEVERITY.NONE,
        soreBreasts: soreBreastsData ? (soreBreastsData.value as any).severity : SYMPTOM_SEVERITY.NONE
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
      period: PERIOD_OPTIONS.NONE as string,
      bbt: '',
      cramps: SYMPTOM_SEVERITY.NONE as string,
      soreBreasts: SYMPTOM_SEVERITY.NONE as string
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>
            Log Data - {formattedDate}
          </h3>
          <button onClick={handleClose} className="modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="modal-period">Period Flow</label>
            <select
              id="modal-period"
              value={measurements.period}
              onChange={(e) => setMeasurements(prev => ({ ...prev, period: e.target.value }))}
              className="form-input"
            >
              <option value={PERIOD_OPTIONS.NONE}>None</option>
              <option value={PERIOD_OPTIONS.SPOTTING}>Spotting</option>
              <option value={PERIOD_OPTIONS.LIGHT}>Light</option>
              <option value={PERIOD_OPTIONS.MEDIUM}>Medium</option>
              <option value={PERIOD_OPTIONS.HEAVY}>Heavy</option>
            </select>
          </div>

          <div className="form-group">
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
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-cramps">Cramps</label>
            <select
              id="modal-cramps"
              value={measurements.cramps}
              onChange={(e) => setMeasurements(prev => ({ ...prev, cramps: e.target.value }))}
              className="form-input"
            >
              <option value={SYMPTOM_SEVERITY.NONE}>None</option>
              <option value={SYMPTOM_SEVERITY.MILD}>Mild</option>
              <option value={SYMPTOM_SEVERITY.MODERATE}>Moderate</option>
              <option value={SYMPTOM_SEVERITY.SEVERE}>Severe</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="modal-soreBreasts">Sore Breasts</label>
            <select
              id="modal-soreBreasts"
              value={measurements.soreBreasts}
              onChange={(e) => setMeasurements(prev => ({ ...prev, soreBreasts: e.target.value }))}
              className="form-input"
            >
              <option value={SYMPTOM_SEVERITY.NONE}>None</option>
              <option value={SYMPTOM_SEVERITY.MILD}>Mild</option>
              <option value={SYMPTOM_SEVERITY.MODERATE}>Moderate</option>
              <option value={SYMPTOM_SEVERITY.SEVERE}>Severe</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}