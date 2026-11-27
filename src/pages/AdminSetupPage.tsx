import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import { Alert, LoadingSpinner } from '../components/ui';

export function AdminSetupPage() {
  const { refreshProfile, appUser } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [setupDisabled, setSetupDisabled] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.rpc('has_admin').then(({ data, error: rpcError }) => {
      if (!rpcError && data === true) {
        setSetupDisabled(true);
      }
      setChecking(false);
    });
  }, []);

  if (appUser?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid administrator email.');
      return;
    }
    if (password.length < 8) {
      setError('Administrator password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!setupToken.trim()) {
      setError('One-time setup token is required.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: 'Library Administrator',
            membership_type: 'Staff',
          },
        },
      });

      if (signUpError || !signUpData.user) {
        throw new Error(signUpError?.message || 'Failed to create administrator user.');
      }

      const { error: promoteError } = await supabase.rpc('complete_initial_admin_setup', {
        p_user_id: signUpData.user.id,
        p_email: cleanEmail,
        p_token: setupToken.trim(),
      });

      if (promoteError) {
        throw new Error(promoteError.message);
      }

      if (signUpData.session) {
        await refreshProfile();
        navigate('/admin', { replace: true });
      } else {
        setSetupDisabled(true);
        setSuccessMsg(
          'Initial administrator account created! Please confirm your email address from your inbox, then sign in on the Administrator Login page.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator setup failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand">
            <BookOpen size={20} />
            <span>LIBRARY MANAGEMENT SYSTEM</span>
          </Link>
          <nav className="public-nav">
            <Link to="/login/admin" className="btn btn-secondary btn-sm">
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="auth-page">
        <div className="auth-card">
          {checking ? (
            <LoadingSpinner label="Checking setup status..." />
          ) : setupDisabled && !successMsg ? (
            <div>
              <div className="auth-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <ShieldAlert size={20} />
                  <h1 className="auth-card-title">Setup Permanently Disabled</h1>
                </div>
                <p className="auth-card-subtitle">
                  An administrator account already exists in the database. One-time initial setup is
                  no longer available.
                </p>
              </div>
              <Link to="/login/admin" className="btn btn-primary btn-block">
                Go to Administrator Login
              </Link>
            </div>
          ) : (
            <div>
              <div className="auth-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <ShieldCheck size={20} />
                  <h1 className="auth-card-title">Initial Administrator Setup</h1>
                </div>
                <p className="auth-card-subtitle">
                  One-time bootstrap to create the library administrator account. Once completed,
                  this route is permanently disabled.
                </p>
              </div>

              <Alert type="error" message={error} />
              <Alert type="success" message={successMsg} />

              {!successMsg && (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="setup-token" className="form-label">
                      One-Time Setup Token
                    </label>
                    <input
                      id="setup-token"
                      type="password"
                      className="form-control"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      placeholder="Paste one-time setup token"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="setup-email" className="form-label">
                      Administrator Email
                    </label>
                    <input
                      id="setup-email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="librarian@mits.ac.in"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="setup-password" className="form-label">
                      Password
                    </label>
                    <input
                      id="setup-password"
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="setup-confirm" className="form-label">
                      Confirm Password
                    </label>
                    <input
                      id="setup-confirm"
                      type="password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                    {submitting ? 'Creating Administrator...' : 'Create Initial Administrator'}
                  </button>
                </form>
              )}

              {successMsg && (
                <Link to="/login/admin" className="btn btn-primary btn-block">
                  Proceed to Administrator Login
                </Link>
              )}

              <div className="auth-footer-links">
                <Link to="/">Back to Home</Link>
                <Link to="/login/admin">Admin Login</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
