import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Add some global error handling with more detailed logging
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

// Log initial state and environment
console.log('Environment:', {
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL
});

console.log('Initial localStorage:', Object.keys(localStorage));
console.log('Initial sessionStorage:', Object.keys(sessionStorage));

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('Rendering app...');
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  console.log('Initial render complete');
} catch (error) {
  console.error('Fatal error during app initialization:', error);
  // Try to render a minimal error message
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>Something went wrong</h1>
      <p>The application failed to initialize. Please try refreshing the page.</p>
      <pre style="text-align: left; background: #f0f0f0; padding: 10px; margin-top: 20px;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `;
}
