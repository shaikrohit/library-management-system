import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BookTransaction } from '../../types/database';
import { calculateOverdueFine, formatCurrencyInr, getTodayIsoDate } from '../../utils/fine';
import { isReturnDateValid } from '../../utils/validation';
import {
  Alert,
  EmptyState,
  LoadingSpinner,
  Modal,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function ReturnBooksPage() {
  const [activeTxns, setActiveTxns] = useState<BookTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [returningTx, setReturningTx] = useState<BookTransaction | null>(null);
  const [returnDate, setReturnDate] = useState(getTodayIsoDate());
  const [submitting, setSubmitting] = useState(false);

  const loadActiveTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('book_transaction')
        .select('*, book(isbn, title), member(member_id, name, email, membership_type)')
        .is('return_date', null)
        .order('due_date', { ascending: true });
      if (fetchError) throw fetchError;
      setActiveTxns((data as BookTransaction[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active issues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveTransactions();
  }, [loadActiveTransactions]);

  const filteredTxns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeTxns;
    return activeTxns.filter(
      (tx) =>
        String(tx.transaction_id).includes(q) ||
        tx.isbn.toLowerCase().includes(q) ||
        (tx.book?.title || '').toLowerCase().includes(q) ||
        (tx.member?.name || '').toLowerCase().includes(q)
    );
  }, [activeTxns, search]);

  function openReturnModal(tx: BookTransaction) {
    setReturningTx(tx);
    const today = getTodayIsoDate();
    setReturnDate(today >= tx.issue_date ? today : tx.issue_date);
    setError('');
  }

  const finePreview = useMemo(() => {
    if (!returningTx || !returnDate || !isReturnDateValid(returningTx.issue_date, returnDate)) {
      return null;
    }
    return calculateOverdueFine(returningTx.due_date, returnDate);
  }, [returningTx, returnDate]);

  async function handleConfirmReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returningTx) return;
    setError('');
    setSuccess('');

    if (!isReturnDateValid(returningTx.issue_date, returnDate)) {
      setError('Return Date cannot be earlier than Issue Date.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('return_book', {
        p_transaction_id: returningTx.transaction_id,
        p_return_date: returnDate,
      });

      if (rpcError) throw rpcError;

      const result = data as {
        transaction_id: number;
        days_overdue: number;
        fine_amount: number;
        fine_id: number | null;
      };

      setReturningTx(null);
      if (result.fine_id) {
        setSuccess(
          `Book returned (Transaction #${result.transaction_id}). Overdue by ${result.days_overdue} day(s): Fine #${result.fine_id} of ${formatCurrencyInr(result.fine_amount)} created as Pending.`
        );
      } else {
        setSuccess(
          `Book returned on time (Transaction #${result.transaction_id}). No fine applied (₹0).`
        );
      }
      await loadActiveTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process book return.');
    } finally {
      setSubmitting(false);
    }
  }

  const today = getTodayIsoDate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Return Books</h1>
          <p className="page-subtitle">
            Record returns and automatically calculate overdue fines at ₹5 per calendar day
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search active issues by TX ID, ISBN, book title, or member..."
        />
      </div>

      {loading ? (
        <LoadingSpinner label="Loading currently issued books..." />
      ) : filteredTxns.length === 0 ? (
        <EmptyState
          title="No active borrowed books"
          description="All issued books have been returned."
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
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map((tx) => {
                const isOverdue = tx.due_date < today;
                const preview = calculateOverdueFine(tx.due_date, today);
                return (
                  <tr key={tx.transaction_id}>
                    <td>#{tx.transaction_id}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx.book?.title || tx.isbn}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {tx.isbn}
                      </div>
                    </td>
                    <td>
                      <div>{tx.member?.name || `Member #${tx.member_id}`}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {tx.member?.email}
                      </div>
                    </td>
                    <td>{tx.issue_date}</td>
                    <td>{tx.due_date}</td>
                    <td>
                      {isOverdue ? (
                        <StatusBadge
                          label={`Overdue ${preview.overdueDays}d (${formatCurrencyInr(preview.fineAmount)})`}
                          variant="solid"
                        />
                      ) : (
                        <StatusBadge label="On Time" variant="muted" />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openReturnModal(tx)}
                      >
                        <BookCheck size={14} />
                        <span>Record Return</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(returningTx)}
        title={returningTx ? `Return Book — Transaction #${returningTx.transaction_id}` : 'Return Book'}
        onClose={() => setReturningTx(null)}
      >
        {returningTx && (
          <form onSubmit={handleConfirmReturn}>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div><strong>Book:</strong> {returningTx.book?.title || returningTx.isbn}</div>
              <div><strong>Member:</strong> {returningTx.member?.name}</div>
              <div><strong>Issue Date:</strong> {returningTx.issue_date}</div>
              <div><strong>Due Date:</strong> {returningTx.due_date}</div>
            </div>

            <div className="form-group">
              <label htmlFor="return-date" className="form-label">
                Return Date
              </label>
              <input
                id="return-date"
                type="date"
                className="form-control"
                value={returnDate}
                min={returningTx.issue_date}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>

            {finePreview && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <div>
                  <strong>Fine Preview (₹5/day):</strong>{' '}
                  {finePreview.overdueDays > 0
                    ? `${finePreview.overdueDays} overdue day(s) → ${formatCurrencyInr(finePreview.fineAmount)} (Pending)`
                    : 'Returned on or before due date → ₹0'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReturningTx(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Processing Return...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
