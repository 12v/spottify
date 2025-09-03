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
        period: periodData ? (periodData.value as { option: string }).option : PERIOD_OPTIONS.NONE,
        bbt: bbtData ? String((bbtData.value as { temperature: number }).temperature) : '',
        cramps: crampsData ? (crampsData.value as { severity: string }).severity : SYMPTOM_SEVERITY.NONE,
        soreBreasts: soreBreastsData ? (soreBreastsData.value as { severity: string }).severity : SYMPTOM_SEVERITY.NONE
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
          <h3 className="modal-title">
            Log Data - {formattedDate}
          </h3>
          <button onClick={handleClose} className="modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Period Flow</label>
            <div className="period-flow-selector">
              <button
                type="button"
                className={`period-rectangle ${measurements.period === PERIOD_OPTIONS.NONE ? 'selected' : ''}`}
                onClick={() => setMeasurements(prev => ({ ...prev, period: PERIOD_OPTIONS.NONE }))}
              >
                <div className="period-preview period-none"></div>
                <span>None</span>
              </button>
              <button
                type="button"
                className={`period-rectangle ${measurements.period === PERIOD_OPTIONS.SPOTTING ? 'selected' : ''}`}
                onClick={() => setMeasurements(prev => ({ ...prev, period: PERIOD_OPTIONS.SPOTTING }))}
              >
                <div className="period-preview period-spotting"></div>
                <span>Spotting</span>
              </button>
              <button
                type="button"
                className={`period-rectangle ${measurements.period === PERIOD_OPTIONS.LIGHT ? 'selected' : ''}`}
                onClick={() => setMeasurements(prev => ({ ...prev, period: PERIOD_OPTIONS.LIGHT }))}
              >
                <div className="period-preview period-light"></div>
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`period-rectangle ${measurements.period === PERIOD_OPTIONS.MEDIUM ? 'selected' : ''}`}
                onClick={() => setMeasurements(prev => ({ ...prev, period: PERIOD_OPTIONS.MEDIUM }))}
              >
                <div className="period-preview period-medium"></div>
                <span>Medium</span>
              </button>
              <button
                type="button"
                className={`period-rectangle ${measurements.period === PERIOD_OPTIONS.HEAVY ? 'selected' : ''}`}
                onClick={() => setMeasurements(prev => ({ ...prev, period: PERIOD_OPTIONS.HEAVY }))}
              >
                <div className="period-preview period-heavy"></div>
                <span>Heavy</span>
              </button>
            </div>
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