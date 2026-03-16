import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import NewOrderPage from './pages/NewOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import EditOrderPage from './pages/EditOrderPage';
import WorkflowPage from './pages/WorkflowPage';

// __BASE_PATH__ is injected at build time by vite.config.ts define.
// It is '/' in local dev and '/<repo-name>/' for GitHub Pages builds.
declare const __BASE_PATH__: string;

const routerBaseName = (() => {
  const base = __BASE_PATH__?.trim() ?? '/';
  if (!base || base === '/') return '/';
  return base.endsWith('/') ? base.slice(0, -1) : base;
})();

function App() {
  return (
    <BrowserRouter basename={routerBaseName}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/new" element={<NewOrderPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/orders/:id/edit" element={<EditOrderPage />} />
                    <Route path="/workflow" element={<WorkflowPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
