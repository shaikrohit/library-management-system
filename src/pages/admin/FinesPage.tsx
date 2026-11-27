import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Fine, PaymentStatus } from '../../types/database';
import { formatCurrencyInr } from '../../utils/fine';
import {
  Alert,
  ConfirmModal,
  EmptyState,
  LoadingSpinner,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function FinesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');

  const [markTarget, setMarkTarget] = useState<Fine | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadFines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('fine')
        .select(
          '*, book_transaction(transaction_id, isbn, member_id, issue_date, due_date, return_date, book(title), member(name, email))'
        )
        .order('fine_id', { ascending: false });
      if (fetchError) throw fetchError;
      setFines((data as Fine[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fines.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFines();
  }, [loadFines]);

  const filteredFines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fines.filter((f) => {
      if (statusFilter !== 'ALL' && f.payment_status !== statusFilter) return false;
      if (!q) return true;
      const tx = f.book_transaction;
      return (
        String(f.fine_id).includes(q) ||
        String(f.transaction_id).includes(q) ||
        (tx?.book?.title || '').toLowerCase().includes(q) ||
        (tx?.isbn || '').toLowerCase().includes(q) ||
        (tx?.member?.name || '').toLowerCase().includes(q)
      );
    });
  }, [fines, search, statusFilter]);

  async function handleMarkPaid() {
    if (!markTarget) return;
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('mark_fine_paid', {
        p_fine_id: markTarget.fine_id,
      });
      if (rpcError) throw rpcError;
      setSuccess(`Fine #${markTarget.fine_id} marked as Paid.`);
      setMarkTarget(null);
      await loadFines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark fine as paid.');
      setMarkTarget(null);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fine Management</h1>
          <p className="page-subtitle">
            Track overdue fines (₹5/day) and mark pending fines as Paid
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by Fine ID, TX ID, member, or book..."
        />
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
          aria-label="Filter fines by payment status"
        >
          <option value="ALL">All Fines</option>
          <option value="Pending">Pending Only</option>
          <option value="Paid">Paid Only</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading fines..." />
      ) : filteredFines.length === 0 ? (
        <EmptyState
          title="No fine records found"
          description="Fines are generated automatically when an overdue book is returned."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fine ID</th>
                <th>Transaction ID</th>
                <th>Member</th>
                <th>Book</th>
                <th>Due / Return</th>
                <th>Fine Amount</th>
                <th>Payment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFines.map((fine) => {
                const tx = fine.book_transaction;
                return (
                  <tr key={fine.fine_id}>
                    <td>#{fine.fine_id}</td>
                    <td>#{fine.transaction_id}</td>
                    <td>{tx?.member?.name || `Member #${tx?.member_id ?? '—'}`}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx?.book?.title || tx?.isbn || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {tx?.isbn}
                      </div>
                    </td>
                    <td>
                      <div>Due: {tx?.due_date || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Ret: {tx?.return_date || '—'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrencyInr(fine.fine_amount)}</td>
                    <td>
                      <StatusBadge
                        label={fine.payment_status}
                        variant={fine.payment_status === 'Pending' ? 'solid' : 'muted'}
                      />
                    </td>
                    <td>
                      {fine.payment_status === 'Pending' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setMarkTarget(fine)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(markTarget)}
        title="Confirm Fine Payment"
        message={`Mark Fine #${markTarget?.fine_id} (${formatCurrencyInr(markTarget?.fine_amount ?? 0)}) as Paid?`}
        confirmLabel="Mark as Paid"
        busy={updating}
        danger={false}
        onConfirm={handleMarkPaid}
        onClose={() => setMarkTarget(null)}
      />
    </div>
  );
}
