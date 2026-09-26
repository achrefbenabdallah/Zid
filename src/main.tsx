import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
// Registers the beforeinstallprompt listener before any screen mounts.
import './lib/useInstallPrompt';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
