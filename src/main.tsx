import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Unregister any legacy service workers and purge obsolete caches (V43 - no reload loop)
if ('caches' in window) {
  window.caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
    .catch(() => {});
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((reg) => {
        reg.unregister().catch(() => {});
      });
    })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
