import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Feather,
  IndianRupee,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AdminDashboardStats, BookTransaction } from '../../types/database';
import { formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, txnsRes] = await Promise.all([
          supabase.rpc('get_admin_dashboard_stats'),
          supabase
            .from('book_transaction')
            .select('*, book(isbn, title), member(member_id, name, email), fine(*)')
            .order('transaction_id', { ascending: false })
            .limit(8),
        ]);

        if (statsRes.error) throw statsRes.error;
        if (txnsRes.error) throw txnsRes.error;
        if (!active) return;

        setStats(statsRes.data as AdminDashboardStats);
        setRecentTxns((txnsRes.data as BookTransaction[]) ?? []);
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

  if (loading) return <LoadingSpinner label="Loading administrator dashboard..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Administrator Dashboard</h1>
          <p className="page-subtitle">Real-time overview of books, members, issues, and fines</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link to="/admin/issue" className="btn btn-primary btn-sm">
            Issue Book
          </Link>
          <Link to="/admin/return" className="btn btn-secondary btn-sm">
            Record Return
          </Link>
        </div>
      </div>

      <Alert type="error" message={error} />

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <span>Total Books</span>
              <BookOpen size={16} />
            </div>
            <div className="stat-value">{stats.total_books}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Total Authors</span>
              <Feather size={16} />
            </div>
            <div className="stat-value">{stats.total_authors}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Registered Members</span>
              <Users size={16} />
            </div>
            <div className="stat-value">{stats.total_members}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Currently Issued</span>
              <ArrowLeftRight size={16} />
            </div>
            <div className="stat-value">{stats.currently_issued}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Overdue Books</span>
              <AlertTriangle size={16} />
            </div>
            <div className="stat-value">{stats.overdue_books}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Pending Fine Amount</span>
              <IndianRupee size={16} />
            </div>
            <div className="stat-value">{formatCurrencyInr(stats.pending_fine_amount)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Transactions</h2>
          <Link to="/admin/transactions" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {recentTxns.length === 0 ? (
          <EmptyState
            title="No transactions recorded yet"
            description="Issue an available book to a registered member to create the first transaction."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((tx) => {
                  const isReturned = Boolean(tx.return_date);
                  const isOverdue = !isReturned && tx.due_date < today;
                  return (
                    <tr key={tx.transaction_id}>
                      <td>#{tx.transaction_id}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{tx.book?.title || tx.isbn}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {tx.isbn}
                        </div>
                      </td>
                      <td>{tx.member?.name || `Member #${tx.member_id}`}</td>
                      <td>{tx.issue_date}</td>
                      <td>{tx.due_date}</td>
                      <td>
                        {isReturned ? (
                          <StatusBadge label={`Returned (${tx.return_date})`} variant="muted" />
                        ) : isOverdue ? (
                          <StatusBadge label="Overdue" variant="solid" />
                        ) : (
                          <StatusBadge label="Issued" variant="dashed" />
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
