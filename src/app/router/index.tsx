import { createBrowserRouter, Navigate, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '../layout/AppShell';
import { PageLoader } from '../../shared/ui/PageLoader';
import { useAuthStore } from '../../shared/stores/auth';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { LaunchScreen } from '../../pages/launch';

function makePage(imp: () => Promise<{ default: ComponentType }>) {
  const Comp = lazy(imp);
  return function LazyPage() {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Comp />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

/** Redirect unauthenticated users to /launch instead of /auth/login */
function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const org   = useAuthStore((s) => s.org);
  const { pathname } = useLocation();
  if (!token) return <Navigate to="/launch" replace />;
  if (org && !org.onboarding_completed && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function RequireCapability({ capability, redirectTo = '/' }: { capability: string; redirectTo?: string }) {
  const token    = useAuthStore((s) => s.token);
  const { can } = useCapabilities();
  if (!token) return <Navigate to="/launch" replace />;
  if (!can(capability)) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const role  = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/launch" replace />;
  if (role !== 'owner' && role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

const OnboardingPage  = makePage(() => import('../../pages/onboarding'));
const DashboardPage   = makePage(() => import('../../pages/dashboard'));
const CustomersPage   = makePage(() => import('../../pages/customers'));
const CustomerProfile = makePage(() => import('../../pages/customers/profile'));
const DealsPage       = makePage(() => import('../../pages/deals'));
const DealProfile     = makePage(() => import('../../pages/deals/profile'));
const TasksPage       = makePage(() => import('../../pages/tasks'));
const ReportsPage     = makePage(() => import('../../pages/reports'));
const AutomationsPage = makePage(() => import('../../pages/automations'));
const ImportsPage     = makePage(() => import('../../pages/imports'));
const SettingsPage    = makePage(() => import('../../pages/settings'));
const AuditPage       = makePage(() => import('../../pages/audit'));
const AdminPage       = makePage(() => import('../../pages/admin'));
const FeedPage        = makePage(() => import('../../pages/feed'));

const router = createBrowserRouter([
  /* ─────────────────────────────────────────────────────────
     PUBLIC — Launch Screen (replaces old /auth/login)
  ───────────────────────────────────────────────────────── */
  {
    path: '/launch',
    element: <LaunchScreen />,
  },

  /* ─────────────────────────────────────────────────────────
     PROTECTED — Onboarding
  ───────────────────────────────────────────────────────── */
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     PROTECTED — Admin panel
  ───────────────────────────────────────────────────────── */
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [
          { index: true,       element: <AdminPage /> },
          { path: ':section',  element: <AdminPage /> },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     PROTECTED — Main application
  ───────────────────────────────────────────────────────── */
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true,               element: <DashboardPage /> },
          { path: 'customers',         element: <CustomersPage /> },
          { path: 'customers/:id',     element: <CustomerProfile /> },
          { path: 'deals',             element: <DealsPage /> },
          { path: 'deals/:id',         element: <DealProfile /> },
          { path: 'feed',              element: <FeedPage /> },
          { path: 'tasks',             element: <TasksPage /> },
          { path: 'reports',           element: <ReportsPage /> },
          {
            element: <RequireCapability capability="customers.import" />,
            children: [{ path: 'imports', element: <ImportsPage /> }],
          },
          {
            element: <RequireCapability capability="automations.manage" />,
            children: [{ path: 'automations', element: <AutomationsPage /> }],
          },
          {
            element: <RequireCapability capability="audit.read" />,
            children: [{ path: 'audit', element: <AuditPage /> }],
          },
          { path: 'settings',          element: <SettingsPage /> },
          { path: 'settings/:section', element: <SettingsPage /> },
        ],
      },
    ],
  },

  /* Catch-all → launch screen */
  { path: '*', element: <Navigate to="/launch" replace /> },
]);

export function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
