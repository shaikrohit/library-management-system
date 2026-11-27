import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Fine } from '../../types/database';
import { formatCurrencyInr } from '../../utils/fine';
import { Alert, EmptyState, LoadingSpinner, StatusBadge } from '../../components/ui';

export function MyFinesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('fine')
        .select('*, book_transaction(transaction_id, isbn, due_date, return_date, book(title))')
        .order('fine_id', { ascending: false });
      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setFines((data as Fine[]) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Fines</h1>
          <p className="page-subtitle">
            Personal fine records calculated at ₹5 per overdue day upon return. Payment status is
            updated by the librarian.
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <LoadingSpinner label="Loading fine records..." />
      ) : fines.length === 0 ? (
        <EmptyState
          title="No fines on your account"
          description="You have no overdue fines recorded."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fine ID</th>
                <th>Transaction ID</th>
                <th>Book</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Fine Amount</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((f) => (
                <tr key={f.fine_id}>
                  <td>#{f.fine_id}</td>
                  <td>#{f.transaction_id}</td>
                  <td style={{ fontWeight: 500 }}>
                    {f.book_transaction?.book?.title || f.book_transaction?.isbn || '—'}
                  </td>
                  <td>{f.book_transaction?.due_date || '—'}</td>
                  <td>{f.book_transaction?.return_date || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrencyInr(f.fine_amount)}</td>
                  <td>
                    <StatusBadge
                      label={f.payment_status}
                      variant={f.payment_status === 'Pending' ? 'solid' : 'muted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
