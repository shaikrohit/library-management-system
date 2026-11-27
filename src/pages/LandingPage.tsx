import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckSquare, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const { appUser } = useAuth();
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc('has_admin').then(({ data }) => {
      if (typeof data === 'boolean') setHasAdmin(data);
    });
  }, []);

  return (
    <div>
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand">
            <BookOpen size={20} />
            <span>LIBRARY MANAGEMENT SYSTEM</span>
          </Link>
          <nav className="public-nav">
            {appUser ? (
              <Link to={appUser.role === 'ADMIN' ? '/admin' : '/member'} className="btn btn-primary btn-sm">
                Go to Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login/member" className="btn btn-secondary btn-sm">
                  Member Login
                </Link>
                <Link to="/login/admin" className="btn btn-secondary btn-sm">
                  Admin Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Register Member
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-grid">
          <div>
            <span className="hero-tag">MITS · B.Tech CSE (Cyber Security) · DBMS Lab</span>
            <h1 className="hero-title">LIBRARY MANAGEMENT SYSTEM</h1>
            <p className="hero-desc">
              An integrated relational library automation system built with React, TypeScript, and
              Supabase PostgreSQL. Supports book cataloguing, many-to-many author mapping, member
              registration, librarian-controlled issue and return workflows, and atomic ₹5/day
              overdue fine calculation.
            </p>
            <div className="hero-actions">
              <Link to="/login/member" className="btn btn-primary">
                Member Portal <ArrowRight size={16} />
              </Link>
              <Link to="/login/admin" className="btn btn-secondary">
                <ShieldCheck size={16} /> Librarian / Admin Login
              </Link>
              <Link to="/register" className="btn btn-secondary">
                <UserPlus size={16} /> Member Registration
              </Link>
              {hasAdmin === false && (
                <Link to="/admin-setup" className="btn btn-secondary">
                  Initial Admin Setup
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>
              Academic Project Specification
            </h2>
            <table className="data-table" style={{ fontSize: '0.84rem' }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-secondary)', width: '42%' }}>Student</td>
                  <td><strong>Shaik Rohit</strong></td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)' }}>Roll Number</td>
                  <td>26MLA08010</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)' }}>Institution</td>
                  <td>Madanapalle Institute of Technology &amp; Science</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)' }}>Department</td>
                  <td>CSE (Cyber Security)</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)' }}>Database Engine</td>
                  <td>Supabase PostgreSQL 17 + RLS</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-secondary)' }}>Overdue Fine Rate</td>
                  <td>₹5 per overdue calendar day</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="feature-grid">
          <div className="card">
            <BookOpen size={20} style={{ marginBottom: '0.6rem' }} />
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Books &amp; Authors</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              ISBN-keyed book catalog with many-to-many author mapping and real-time availability derived
              from active borrowing transactions.
            </p>
          </div>
          <div className="card">
            <CheckSquare size={20} style={{ marginBottom: '0.6rem' }} />
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Issue &amp; Atomic Return</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Partial unique index prevents double issuing. Returning an overdue book atomically
              updates Return_Date and records a Pending fine at ₹5/day.
            </p>
          </div>
          <div className="card">
            <ShieldCheck size={20} style={{ marginBottom: '0.6rem' }} />
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Row Level Security</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              PostgreSQL RLS policies enforce strict isolation: members view only their own records
              while librarians administer the complete library.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
