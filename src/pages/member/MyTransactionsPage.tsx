import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { BookTransaction } from '../../types/database';
import { formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

export function MyTransactionsPage() {
  const [txns, setTxns] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('book_transaction')
        .select('*, book(isbn, title), fine(*)')
        .order('transaction_id', { ascending: false });
      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTxns((data as BookTransaction[]) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const today = getTodayIsoDate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Transaction History</h1>
          <p className="page-subtitle">Complete history of your library issues and returns</p>
        </div>
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <LoadingSpinner label="Loading transaction history..." />
      ) : txns.length === 0 ? (
        <EmptyState
          title="No transaction history"
          description="Your borrowing and return records will appear here once a book is issued to you."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>ISBN</th>
                <th>Book Title</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th>Fine</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((tx) => {
                const isReturned = Boolean(tx.return_date);
                const isOverdue = !isReturned && tx.due_date < today;
                return (
                  <tr key={tx.transaction_id}>
                    <td>#{tx.transaction_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{tx.isbn}</td>
                    <td style={{ fontWeight: 500 }}>{tx.book?.title || '—'}</td>
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
                      {tx.fine
                        ? `${formatCurrencyInr(tx.fine.fine_amount)} (${tx.fine.payment_status})`
                        : '₹0'}
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
