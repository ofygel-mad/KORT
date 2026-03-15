import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '../layout/AppShell';
import { PageLoader } from '../../shared/ui/PageLoader';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';

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

/* ─── Pages ─────────────────────────────────────────────────── */
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

/* ─── Outlet wrapper ─────────────────────────────────────────── */
function PassThrough() { return <Outlet />; }

const router = createBrowserRouter([
  /* ── Main app ─────────────────────────────────────────────── */
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
      { path: 'imports',           element: <ImportsPage /> },
      { path: 'automations',       element: <AutomationsPage /> },
      { path: 'audit',             element: <AuditPage /> },
      { path: 'settings',          element: <SettingsPage /> },
      { path: 'settings/:section', element: <SettingsPage /> },
    ],
  },

  /* ── Admin ────────────────────────────────────────────────── */
  {
    path: '/admin',
    element: <AppShell />,
    children: [
      { index: true,      element: <AdminPage /> },
      { path: ':section', element: <AdminPage /> },
    ],
  },

  /* ── Catch-all → home ─────────────────────────────────────── */
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
