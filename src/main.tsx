import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register service worker for offline PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isRefreshing) {
      isRefreshing = true;
      window.location.reload();
    }
  });

  // Purge any obsolete caches immediately on client startup
  if ('caches' in window) {
    window.caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== 'seafood-pwa-v40').map((key) => window.caches.delete(key))
      );
    }).catch(() => {});
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=40`, { updateViaCache: 'none' })
      .then((reg) => {
        // If a new worker is waiting, activate immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available, activate without waiting
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        // Force check for updated service worker bundle on page load
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.log('SW registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
