import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HostDashboardPage from './pages/HostDashboardPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import PublicStatementPage from './pages/PublicStatementPage.jsx';
import InviteAcceptPage from './pages/InviteAcceptPage.jsx';
import FriendDashboardPage from './pages/FriendDashboardPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

import Calculator from './components/calculator/Calculator.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center transition-colors">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Level 1: Public Read-Only Share Link */}
        <Route path="/s/:token" element={<PublicStatementPage />} />

        {/* Level 2: Single-Use Claim Invite Link */}
        <Route path="/invite/:code" element={<InviteAcceptPage />} />

        {/* Protected Host & Friend Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HostDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friend"
          element={
            <ProtectedRoute>
              <FriendDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Built-in Floating Safe Calculator (available on every page) */}
      <Calculator />
    </>
  );
}
