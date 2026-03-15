import ReactDOM from 'react-dom/client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast, Toaster } from 'sonner';
import * as Sentry from '@sentry/react';
import { AppRouter } from './app/router';
import { Launch } from './pages/launch/Launch';
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
    queries: { staleTime: 30_000, retry: 1 },
    mutations: {
      onError: (error: any) => {
        const msg =
          error?.response?.data?.detail ??
          error?.response?.data?.message ??
          error?.message ??
          'Произошла ошибка';
        toast.error(msg);
      },
    },
  },
});

// Versioned key — never collides with test-repo or stale builds
const INTRO_KEY = 'kort.workspace:intro-v1';

function hasSeenIntro(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function App() {
  const [introDone, setIntroDone] = useState(hasSeenIntro);

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        AppRouter (full workspace) renders unconditionally beneath the overlay.
        Launch is position:fixed on top — when the curtain lifts the real
        UI is already there. No route switch, no flash, no freeze.

        NOTE: React.StrictMode intentionally double-invokes effects in dev.
        This destroys the imperative WebGL+GSAP animation on the forced
        remount (startedRef prevents re-init). StrictMode is intentionally
        omitted here so the intro works correctly in both dev and prod.
      */}
      <AppRouter />
      <Toaster position="bottom-right" richColors />

      {!introDone && (
        <Launch
          introSessionKey={INTRO_KEY}
          onComplete={() => setIntroDone(true)}
        />
      )}
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

const nav = getNavigator();
const win = getWindow();
if (isBrowser && nav && 'serviceWorker' in nav && import.meta.env.PROD && win) {
  win.addEventListener('load', () => {
    nav.serviceWorker.register('/sw.js').catch(() => {});
  });
}
