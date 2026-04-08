import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import NewRepair from './pages/NewRepair';
import RepairsList from './pages/RepairsList';
import Dashboard from './pages/Dashboard';
import StatusManager from './pages/StatusManager';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-brand-500 font-medium">טוען...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isSuperadmin ? '/settings' : '/repairs'} replace /> : <Login />} />

      {/* Superadmin: only settings */}
      <Route path="/settings" element={
        <PrivateRoute><Layout><Settings /></Layout></PrivateRoute>
      } />

      {/* Regular users */}
      <Route path="/repairs" element={
        <PrivateRoute>
          {isSuperadmin ? <Navigate to="/settings" replace /> : <Layout><RepairsList /></Layout>}
        </PrivateRoute>
      } />
      <Route path="/new" element={
        <PrivateRoute>
          {isSuperadmin ? <Navigate to="/settings" replace /> : <Layout><NewRepair /></Layout>}
        </PrivateRoute>
      } />
      <Route path="/dashboard" element={
        <PrivateRoute>
          {isSuperadmin ? <Navigate to="/settings" replace /> : <Layout><Dashboard /></Layout>}
        </PrivateRoute>
      } />
      <Route path="/statuses" element={
        <PrivateRoute>
          {isSuperadmin ? <Navigate to="/settings" replace /> : <Layout><StatusManager /></Layout>}
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to={user ? (isSuperadmin ? '/settings' : '/repairs') : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
