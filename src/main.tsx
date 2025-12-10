import { setupGlobalErrorHandler, setErrorLogger } from './services/errorInterceptor';

// Initialize error interception
setupGlobalErrorHandler();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { logErrorToSupabase } from './services/errorLogger';

// Connect the logger to the interceptor
setErrorLogger(logErrorToSupabase);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
