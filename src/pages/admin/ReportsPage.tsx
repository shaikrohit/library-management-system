import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AdminDashboardStats, BookTransaction, Member } from '../../types/database';
import { formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (val: string | number | null) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [txns, setTxns] = useState<BookTransaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, txnsRes, membersRes] = await Promise.all([
          supabase.rpc('get_admin_dashboard_stats'),
          supabase
            .from('book_transaction')
            .select('*, book(isbn, title), member(member_id, name, email), fine(*)')
            .order('transaction_id', { ascending: false }),
          supabase.from('member').select('*').order('name'),
        ]);
        if (statsRes.error) throw statsRes.error;
        if (txnsRes.error) throw txnsRes.error;
        if (membersRes.error) throw membersRes.error;
        if (!active) return;

        setStats(statsRes.data as AdminDashboardStats);
        setTxns((txnsRes.data as BookTransaction[]) ?? []);
        setMembers((membersRes.data as Member[]) ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load reports.');
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

  const activeBorrowings = useMemo(
    () => txns.filter((tx) => !tx.return_date),
    [txns]
  );

  const overdueBorrowings = useMemo(
    () => activeBorrowings.filter((tx) => tx.due_date < today),
    [activeBorrowings, today]
  );

  const memberSummary = useMemo(() => {
    return members.map((m) => {
      const mTxns = txns.filter((tx) => tx.member_id === m.member_id);
      const activeCount = mTxns.filter((tx) => !tx.return_date).length;
      const pendingFine = mTxns
        .filter((tx) => tx.fine?.payment_status === 'Pending')
        .reduce((sum, tx) => sum + Number(tx.fine?.fine_amount || 0), 0);
      const paidFine = mTxns
        .filter((tx) => tx.fine?.payment_status === 'Paid')
        .reduce((sum, tx) => sum + Number(tx.fine?.fine_amount || 0), 0);
      return {
        member: m,
        totalBorrows: mTxns.length,
        activeCount,
        pendingFine,
        paidFine,
      };
    });
  }, [members, txns]);

  function exportTransactionsCsv() {
    downloadCsv(
      `library-transactions-${today}.csv`,
      [
        'Transaction_ID',
        'ISBN',
        'Book_Title',
        'Member_ID',
        'Member_Name',
        'Issue_Date',
        'Due_Date',
        'Return_Date',
        'Fine_Amount',
        'Fine_Status',
      ],
      txns.map((tx) => [
        tx.transaction_id,
        tx.isbn,
        tx.book?.title || '',
        tx.member_id,
        tx.member?.name || '',
        tx.issue_date,
        tx.due_date,
        tx.return_date || 'Active',
        tx.fine?.fine_amount ?? 0,
        tx.fine?.payment_status ?? 'None',
      ])
    );
  }

  function exportMemberSummaryCsv() {
    downloadCsv(
      `member-borrowing-history-${today}.csv`,
      [
        'Member_ID',
        'Name',
        'Email',
        'Membership_Type',
        'Total_Borrows',
        'Currently_Borrowed',
        'Pending_Fines_INR',
        'Paid_Fines_INR',
      ],
      memberSummary.map((row) => [
        row.member.member_id,
        row.member.name,
        row.member.email,
        row.member.membership_type,
        row.totalBorrows,
        row.activeCount,
        row.pendingFine,
        row.paidFine,
      ])
    );
  }

  if (loading) return <LoadingSpinner label="Generating reports..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Library Reports</h1>
          <p className="page-subtitle">
            Academic summary of books, active borrowings, overdue items, fines, and member history
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportTransactionsCsv}>
            <Download size={14} />
            <span>Export Transactions CSV</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={exportMemberSummaryCsv}>
            <Download size={14} />
            <span>Export Member History CSV</span>
          </button>
        </div>
      </div>

      <Alert type="error" message={error} />

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-top">Total Books</div>
            <div className="stat-value">{stats.total_books}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">Total Members</div>
            <div className="stat-value">{stats.total_members}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">Active Borrowings</div>
            <div className="stat-value">{stats.currently_issued}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">Overdue Transactions</div>
            <div className="stat-value">{stats.overdue_books}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">Pending Fines</div>
            <div className="stat-value">{formatCurrencyInr(stats.pending_fine_amount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-top">Paid Fines</div>
            <div className="stat-value">{formatCurrencyInr(stats.paid_fine_amount)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h2 className="card-title">Overdue Borrowing Transactions ({overdueBorrowings.length})</h2>
        </div>
        {overdueBorrowings.length === 0 ? (
          <EmptyState
            title="No overdue borrowings"
            description="There are currently no overdue unreturned books."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {overdueBorrowings.map((tx) => (
                  <tr key={tx.transaction_id}>
                    <td>#{tx.transaction_id}</td>
                    <td>{tx.book?.title || tx.isbn}</td>
                    <td>{tx.member?.name || `Member #${tx.member_id}`}</td>
                    <td>{tx.issue_date}</td>
                    <td>
                      <StatusBadge label={tx.due_date} variant="solid" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Member Borrowing History Summary</h2>
        </div>
        {memberSummary.length === 0 ? (
          <EmptyState
            title="No members registered"
            description="Member borrowing statistics will appear here once members register."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Total Borrows</th>
                  <th>Active Borrows</th>
                  <th>Pending Fines</th>
                  <th>Paid Fines</th>
                </tr>
              </thead>
              <tbody>
                {memberSummary.map((row) => (
                  <tr key={row.member.member_id}>
                    <td>#{row.member.member_id}</td>
                    <td style={{ fontWeight: 500 }}>{row.member.name}</td>
                    <td>{row.member.membership_type}</td>
                    <td>{row.totalBorrows}</td>
                    <td>{row.activeCount}</td>
                    <td>{formatCurrencyInr(row.pendingFine)}</td>
                    <td>{formatCurrencyInr(row.paidFine)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
