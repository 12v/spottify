import { useState, useEffect } from 'react';
import { CycleService } from '../services/cycleService';
import { DataService } from '../services/dataService';
import type { Measurement, CycleInfo } from '../types';

interface CycleManagementModalProps {
  show: boolean;
  measurements: Measurement[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function CycleManagementModal({ show, measurements, onClose, onUpdate }: CycleManagementModalProps) {
  const [cycles, setCycles] = useState<CycleInfo[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      loadCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, measurements]);

  function loadCycles() {
    const cycleData = CycleService.getCycleDataWithExclusions(measurements);
    setCycles(cycleData);
  }

  async function toggleExclusion(cycle: CycleInfo) {
    if (updatingId) return;

    setUpdatingId(cycle.firstMeasurementId);
    try {
      await DataService.getInstance().toggleCycleExclusion(
        cycle.firstMeasurementId,
        !cycle.isExcluded
      );
      onUpdate();
    } catch (error) {
      console.error('Error toggling cycle exclusion:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  function getCyclesByYear() {
    const grouped = cycles.reduce((acc, cycle) => {
      if (!acc[cycle.year]) {
        acc[cycle.year] = [];
      }
      acc[cycle.year].push(cycle);
      return acc;
    }, {} as Record<number, CycleInfo[]>);

    return Object.entries(grouped)
      .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
      .map(([year, yearCycles]) => ({
        year: parseInt(year),
        cycles: yearCycles,
        excludedCount: yearCycles.filter(c => c.isExcluded).length
      }));
  }

  if (!show) return null;

  const cyclesByYear = getCyclesByYear();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Manage Cycles</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {cycles.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No cycles available</p>
        ) : (
          <div>
            {cyclesByYear.map(({ year, cycles: yearCycles, excludedCount }) => (
              <div key={year} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  marginBottom: '0.75rem',
                  color: '#8B0000',
                  borderBottom: '1px solid #eee',
                  paddingBottom: '0.5rem'
                }}>
                  {year}
                  {excludedCount > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                      ({excludedCount} excluded)
                    </span>
                  )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {yearCycles.map(cycle => {
                    const isUpdating = updatingId === cycle.firstMeasurementId;

                    return (
                      <div
                        key={cycle.firstMeasurementId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: cycle.isExcluded ? '#f5f5f5' : 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          opacity: cycle.isExcluded ? 0.6 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <div style={{
                          flex: 1,
                          color: cycle.isExcluded ? '#999' : '#333'
                        }}>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                            {new Date(cycle.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {' → '}
                            {new Date(cycle.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div style={{ fontSize: '0.875rem' }}>
                            Cycle: {cycle.cycleLength} days • Period: {cycle.periodLength} days
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={cycle.isExcluded}
                              disabled={isUpdating}
                              onChange={() => toggleExclusion(cycle)}
                              style={{
                                marginRight: '0.5rem',
                                cursor: 'pointer'
                              }}
                            />
                            <span style={{ fontSize: '0.875rem' }}>
                              {isUpdating ? 'Updating...' : 'Exclude'}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
