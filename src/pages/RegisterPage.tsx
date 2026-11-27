import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { MembershipType } from '../types/database';
import { isValidEmail } from '../utils/validation';
import { Alert } from '../components/ui';

export function RegisterPage() {
  const { registerMember, appUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType>('Student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (appUser) {
    return <Navigate to={appUser.role === 'ADMIN' ? '/admin' : '/member'} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerMember({
        name,
        email,
        phone,
        membershipType,
        password,
      });

      if (result.requiresEmailConfirmation) {
        setSuccessMsg(
          'Registration successful! Please check your email inbox to confirm your account before signing in.'
        );
      } else {
        navigate('/member', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
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
            <Link to="/login/member" className="btn btn-secondary btn-sm">
              Member Login
            </Link>
            <Link to="/login/admin" className="btn btn-secondary btn-sm">
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <UserPlus size={20} />
              <h1 className="auth-card-title">Member Registration</h1>
            </div>
            <p className="auth-card-subtitle">
              Create a library member account. Public registration always creates a Member role.
            </p>
          </div>

          <Alert type="error" message={error} />
          <Alert type="success" message={successMsg} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shaik Rohit"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@mits.ac.in"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-type" className="form-label">
                  Membership Type
                </label>
                <select
                  id="reg-type"
                  className="form-control"
                  value={membershipType}
                  onChange={(e) => setMembershipType(e.target.value as MembershipType)}
                >
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm" className="form-label">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Register as Member'}
            </button>
          </form>

          <div className="auth-footer-links">
            <Link to="/">Back to Home</Link>
            <Link to="/login/member">Already registered? Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
