import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { BookTransaction } from '../../types/database';
import { calculateOverdueFine, formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

export function MyBorrowedBooksPage() {
  const [borrows, setBorrows] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('book_transaction')
        .select('*, book(isbn, title, publisher, publication_year)')
        .is('return_date', null)
        .order('due_date', { ascending: true });
      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setBorrows((data as BookTransaction[]) ?? []);
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
          <h1 className="page-title">My Borrowed Books &amp; Due Dates</h1>
          <p className="page-subtitle">
            Books currently checked out to you. Please return books to the librarian by their due
            date to avoid the ₹5/day overdue fine.
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <LoadingSpinner label="Loading your borrowed books..." />
      ) : borrows.length === 0 ? (
        <EmptyState
          title="No active borrowed books"
          description="You do not have any unreturned books at the moment."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>ISBN</th>
                <th>Title</th>
                <th>Publisher</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {borrows.map((tx) => {
                const isOverdue = tx.due_date < today;
                const est = calculateOverdueFine(tx.due_date, today);
                return (
                  <tr key={tx.transaction_id}>
                    <td>#{tx.transaction_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{tx.isbn}</td>
                    <td style={{ fontWeight: 500 }}>{tx.book?.title || '—'}</td>
                    <td>{tx.book?.publisher || '—'}</td>
                    <td>{tx.issue_date}</td>
                    <td style={{ fontWeight: 600 }}>{tx.due_date}</td>
                    <td>
                      {isOverdue ? (
                        <StatusBadge
                          label={`Overdue ${est.overdueDays}d (Est. ${formatCurrencyInr(est.fineAmount)} upon return)`}
                          variant="solid"
                        />
                      ) : (
                        <StatusBadge label="Active" variant="muted" />
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
