import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppDataProvider } from './state/AppDataContext';
import './styles.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Avoid stale-asset white screens on GitHub Pages by removing old SW/caches.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister()));
    });
    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </BrowserRouter>
  </StrictMode>
);
