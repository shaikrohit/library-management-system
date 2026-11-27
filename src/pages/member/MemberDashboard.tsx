import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, BookCheck, IndianRupee } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { BookTransaction, MemberDashboardStats } from '../../types/database';
import { formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

export function MemberDashboard() {
  const { memberProfile } = useAuth();
  const [stats, setStats] = useState<MemberDashboardStats | null>(null);
  const [activeBorrows, setActiveBorrows] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, borrowsRes] = await Promise.all([
          supabase.rpc('get_member_dashboard_stats'),
          supabase
            .from('book_transaction')
            .select('*, book(isbn, title, publisher)')
            .is('return_date', null)
            .order('due_date', { ascending: true }),
        ]);
        if (statsRes.error) throw statsRes.error;
        if (borrowsRes.error) throw borrowsRes.error;
        if (!active) return;

        setStats(statsRes.data as MemberDashboardStats);
        setActiveBorrows((borrowsRes.data as BookTransaction[]) ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayIsoDate();

  if (loading) return <LoadingSpinner label="Loading member dashboard..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome{memberProfile?.name ? `, ${memberProfile.name}` : ''}
          </h1>
          <p className="page-subtitle">
            Personal library overview · Membership Type: {memberProfile?.membership_type || 'Member'}
          </p>
        </div>
        <Link to="/member/books" className="btn btn-primary btn-sm">
          Browse Library Catalog
        </Link>
      </div>

      <Alert type="error" message={error} />

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <span>Active Borrowed Books</span>
              <BookCheck size={16} />
            </div>
            <div className="stat-value">{stats.active_borrows}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Overdue Books</span>
              <AlertTriangle size={16} />
            </div>
            <div className="stat-value">{stats.overdue_borrows}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Total Transactions</span>
              <ArrowLeftRight size={16} />
            </div>
            <div className="stat-value">{stats.total_borrows}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Pending Fines</span>
              <IndianRupee size={16} />
            </div>
            <div className="stat-value">{formatCurrencyInr(stats.pending_fine_amount)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">My Current Borrowed Books &amp; Due Dates</h2>
          <Link to="/member/borrowed" className="btn btn-secondary btn-sm">
            View Details
          </Link>
        </div>

        {activeBorrows.length === 0 ? (
          <EmptyState
            title="No books currently borrowed"
            description="Books issued to you by the librarian will appear here with their due dates."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Book Title</th>
                  <th>ISBN</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBorrows.map((tx) => {
                  const isOverdue = tx.due_date < today;
                  return (
                    <tr key={tx.transaction_id}>
                      <td>#{tx.transaction_id}</td>
                      <td style={{ fontWeight: 500 }}>{tx.book?.title || tx.isbn}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{tx.isbn}</td>
                      <td>{tx.issue_date}</td>
                      <td>{tx.due_date}</td>
                      <td>
                        {isOverdue ? (
                          <StatusBadge label="Overdue" variant="solid" />
                        ) : (
                          <StatusBadge label="On Time" variant="muted" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
