import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast, Toaster } from 'sonner';
import * as Sentry from '@sentry/react';
import { AppRouter } from './app/router';
import './shared/design/globals.css';
import { getNavigator, getWindow, isBrowser } from './shared/lib/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      onError: (error: any) => {
        const msg = error?.response?.data?.detail
          ?? error?.response?.data?.message
          ?? error?.message
          ?? 'Произошла ошибка';
        toast.error(msg);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>,
);


const nav = getNavigator();
const win = getWindow();
if (isBrowser && nav && 'serviceWorker' in nav && import.meta.env.PROD && win) {
  win.addEventListener('load', () => {
    nav.serviceWorker.register('/sw.js').catch(() => {});
  });
}
