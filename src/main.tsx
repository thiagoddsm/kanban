import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatic cache purger for legacy mock data
const STORAGE_CLEAN_VERSION = 'v4_clean_production_2026';
try {
  if (typeof window !== 'undefined' && localStorage.getItem('oiko_app_version') !== STORAGE_CLEAN_VERSION) {
    // Clear all legacy storage keys
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('oiko_app_version', STORAGE_CLEAN_VERSION);
  }
} catch (e) {
  console.warn('Cache purge notice:', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
