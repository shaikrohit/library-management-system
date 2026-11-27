import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/database';
import { LoadingSpinner } from './ui';

export function ProtectedRoute({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: React.ReactNode;
}) {
  const { loading, session, appUser } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Verifying session..." />;
  }

  if (!session || !appUser) {
    return <Navigate to={allowedRole === 'ADMIN' ? '/login/admin' : '/login/member'} replace />;
  }

  if (appUser.role !== allowedRole) {
    return <Navigate to={appUser.role === 'ADMIN' ? '/admin' : '/member'} replace />;
  }

  return <>{children}</>;
}
