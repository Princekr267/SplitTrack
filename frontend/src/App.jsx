import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { m, AnimatePresence } from 'motion/react';
import { durations, easings } from './motion/tokens.js';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HostDashboardPage from './pages/HostDashboardPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import PublicStatementPage from './pages/PublicStatementPage.jsx';
import InviteAcceptPage from './pages/InviteAcceptPage.jsx';
import FriendDashboardPage from './pages/FriendDashboardPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PasswordChangedBanner from './components/common/PasswordChangedBanner.jsx';
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
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <>
      <AnimatePresence mode="wait">
        <m.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{
            duration: durations.base,
            ease: easings.premium,
          }}
          className="w-full min-h-screen flex flex-col"
        >
          <PasswordChangedBanner />
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

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

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </m.div>
      </AnimatePresence>

      {/* Built-in Floating Safe Calculator (available on every page) */}
      <Calculator />
    </>
  );
}
