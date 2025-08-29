import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { importMeasurements } from '../utils/importData';

export default function ImportData() {
  const { currentUser } = useAuth();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleImport() {
    if (!currentUser || !selectedFile) return;
    
    setImporting(true);
    setError('');
    setResult(null);
    
    try {
      const importResult = await importMeasurements(currentUser.uid, selectedFile);
      setResult(importResult);
    } catch (err) {
      setError('Failed to import data. Please check that your JSON file is valid.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setError('');
    } else {
      setSelectedFile(null);
      setError('Please select a valid JSON file.');
    }
  }

  return (
    <div className="page-container" style={{ 
      maxWidth: '500px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>📥 Import Historical Data</h3>
        <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </div>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem' }}>
        Upload a JSON file containing your period and BBT data. 
        Other data types will be skipped during import.
      </p>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="file-upload" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Choose JSON File:
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '2px dashed #8B0000',
            borderRadius: '4px',
            backgroundColor: selectedFile ? '#f0f8f0' : '#fafafa',
            cursor: 'pointer'
          }}
        />
        {selectedFile && (
          <div style={{ 
            marginTop: '0.5rem', 
            color: '#2E8B57', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ✅ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>
      
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '0.75rem', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      {result && (
        <div style={{ 
          color: 'green', 
          backgroundColor: '#e8f5e8', 
          padding: '0.75rem', 
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ✅ Import complete! <br/>
          Imported: {result.imported} records<br/>
          Skipped: {result.skipped} records
        </div>
      )}
      
      <button
        onClick={handleImport}
        disabled={importing || !currentUser || !selectedFile}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: (importing || !selectedFile) ? '#ccc' : '#8B0000',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: (importing || !selectedFile) ? 'not-allowed' : 'pointer'
        }}
      >
        {importing ? '📥 Importing...' : !selectedFile ? '📄 Select File First' : '🚀 Import Data Now'}
      </button>
    </div>
  );
}