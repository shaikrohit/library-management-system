import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { BookTransaction } from '../../types/database';
import { formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import {
  Alert,
  EmptyState,
  LoadingSpinner,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function TransactionsPage() {
  const [txns, setTxns] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');

  const loadTxns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('book_transaction')
        .select('*, book(isbn, title), member(member_id, name, email), fine(*)')
        .order('transaction_id', { ascending: false });
      if (fetchError) throw fetchError;
      setTxns((data as BookTransaction[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTxns();
  }, [loadTxns]);

  const today = getTodayIsoDate();

  const filteredTxns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter((tx) => {
      const isReturned = Boolean(tx.return_date);
      const isOverdue = !isReturned && tx.due_date < today;
      if (statusFilter === 'ACTIVE' && isReturned) return false;
      if (statusFilter === 'OVERDUE' && !isOverdue) return false;
      if (statusFilter === 'RETURNED' && !isReturned) return false;

      if (!q) return true;
      return (
        String(tx.transaction_id).includes(q) ||
        tx.isbn.toLowerCase().includes(q) ||
        (tx.book?.title || '').toLowerCase().includes(q) ||
        (tx.member?.name || '').toLowerCase().includes(q)
      );
    });
  }, [txns, search, statusFilter, today]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Management</h1>
          <p className="page-subtitle">Complete borrowing and return ledger</p>
        </div>
      </div>

      <Alert type="error" message={error} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by TX ID, ISBN, title, or member..."
        />
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '170px' }}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED')
          }
          aria-label="Filter transactions by status"
        >
          <option value="ALL">All Transactions</option>
          <option value="ACTIVE">Currently Issued</option>
          <option value="OVERDUE">Overdue</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading transactions..." />
      ) : filteredTxns.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Transactions appear here when books are issued to members."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>ISBN</th>
                <th>Book Title</th>
                <th>Member</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th>Fine</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map((tx) => {
                const isReturned = Boolean(tx.return_date);
                const isOverdue = !isReturned && tx.due_date < today;
                return (
                  <tr key={tx.transaction_id}>
                    <td>#{tx.transaction_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{tx.isbn}</td>
                    <td style={{ fontWeight: 500 }}>{tx.book?.title || '—'}</td>
                    <td>{tx.member?.name || `Member #${tx.member_id}`}</td>
                    <td>{tx.issue_date}</td>
                    <td>{tx.due_date}</td>
                    <td>{tx.return_date || '—'}</td>
                    <td>
                      {isReturned ? (
                        <StatusBadge label="Returned" variant="muted" />
                      ) : isOverdue ? (
                        <StatusBadge label="Overdue" variant="solid" />
                      ) : (
                        <StatusBadge label="Issued" variant="dashed" />
                      )}
                    </td>
                    <td>
                      {tx.fine ? (
                        <span>
                          {formatCurrencyInr(tx.fine.fine_amount)} ({tx.fine.payment_status})
                        </span>
                      ) : (
                        '₹0'
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
  );
}
