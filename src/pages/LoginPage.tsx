import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/ui';

export function LoginPage({ mode }: { mode: 'ADMIN' | 'MEMBER' }) {
  const { signIn, appUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (appUser) {
    return <Navigate to={appUser.role === 'ADMIN' ? '/admin' : '/member'} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const profile = await signIn(email, password, mode);
      navigate(profile.role === 'ADMIN' ? '/admin' : '/member', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  const isAdmin = mode === 'ADMIN';

  return (
    <div>
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand">
            <BookOpen size={20} />
            <span>LIBRARY MANAGEMENT SYSTEM</span>
          </Link>
          <nav className="public-nav">
            <Link to={isAdmin ? '/login/member' : '/login/admin'} className="btn btn-secondary btn-sm">
              {isAdmin ? 'Member Login' : 'Admin Login'}
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register Member
            </Link>
          </nav>
        </div>
      </header>

      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
              <h1 className="auth-card-title">
                {isAdmin ? 'Administrator / Librarian Login' : 'Library Member Login'}
              </h1>
            </div>
            <p className="auth-card-subtitle">
              {isAdmin
                ? 'Sign in with your administrator credentials to manage catalog, issues, returns, and fines.'
                : 'Sign in to browse books, check due dates, and view your borrowing history and fines.'}
            </p>
          </div>

          <Alert type="error" message={error} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Signing in...' : isAdmin ? 'Sign In as Administrator' : 'Sign In as Member'}
            </button>
          </form>

          <div className="auth-footer-links">
            <Link to="/">Back to Home</Link>
            {isAdmin ? (
              <Link to="/login/member">Member Login</Link>
            ) : (
              <Link to="/register">New member? Register</Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
