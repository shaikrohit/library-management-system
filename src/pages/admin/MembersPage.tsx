import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BookTransaction, Member, MembershipType } from '../../types/database';
import { formatCurrencyInr } from '../../utils/fine';
import { isValidEmail } from '../../utils/validation';
import {
  Alert,
  ConfirmModal,
  EmptyState,
  LoadingSpinner,
  Modal,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MembershipType>('ALL');

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType>('Student');
  const [saving, setSaving] = useState(false);

  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<BookTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('member')
        .select('*')
        .order('member_id', { ascending: false });
      if (fetchError) throw fetchError;
      setMembers((data as Member[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (typeFilter !== 'ALL' && m.membership_type !== typeFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        String(m.member_id).includes(q)
      );
    });
  }, [members, search, typeFilter]);

  function openEditModal(member: Member) {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone || '');
    setMembershipType(member.membership_type);
    setError('');
  }

  async function openDetailsModal(member: Member) {
    setViewingMember(member);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const { data, error: txError } = await supabase
        .from('book_transaction')
        .select('*, book(isbn, title), fine(*)')
        .eq('member_id', member.member_id)
        .order('transaction_id', { ascending: false });
      if (txError) throw txError;
      setHistory((data as BookTransaction[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member transaction history.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Member name is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Valid email is required.');
      return;
    }

    setSaving(true);
    try {
      const { error: updError } = await supabase
        .from('member')
        .update({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          membership_type: membershipType,
        })
        .eq('member_id', editingMember.member_id);

      if (updError) throw updError;
      setEditingMember(null);
      setSuccess('Member updated successfully.');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMember() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const { error: delError } = await supabase
        .from('member')
        .delete()
        .eq('member_id', deleteTarget.member_id);
      if (delError) {
        if (delError.code === '23503') {
          throw new Error(
            'Cannot delete this member because they have linked transaction history or an active user account.'
          );
        }
        throw delError;
      }
      setSuccess(`Deleted member "${deleteTarget.name}".`);
      setDeleteTarget(null);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Management</h1>
          <p className="page-subtitle">
            View registered library members, membership types, and borrowing history
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by ID, name, email, or phone..."
        />
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '160px' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'ALL' | MembershipType)}
          aria-label="Filter by membership type"
        >
          <option value="ALL">All Types</option>
          <option value="Student">Student</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading members..." />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          title="No registered members found"
          description="Members appear here automatically when they register via the Member Registration page."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Membership Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.member_id}>
                  <td>#{member.member_id}</td>
                  <td style={{ fontWeight: 500 }}>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone || '—'}</td>
                  <td>
                    <StatusBadge
                      label={member.membership_type}
                      variant={member.membership_type === 'Staff' ? 'solid' : 'muted'}
                    />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDetailsModal(member)}
                        aria-label={`View history for ${member.name}`}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(member)}
                        aria-label={`Edit ${member.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(member)}
                        aria-label={`Delete ${member.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editingMember)}
        title="Edit Member Details"
        onClose={() => setEditingMember(null)}
      >
        <form onSubmit={handleSaveMember}>
          <div className="form-group">
            <label htmlFor="edit-member-name" className="form-label">
              Name
            </label>
            <input
              id="edit-member-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-member-email" className="form-label">
              Email
            </label>
            <input
              id="edit-member-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-member-phone" className="form-label">
                Phone
              </label>
              <input
                id="edit-member-phone"
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-member-type" className="form-label">
                Membership Type
              </label>
              <select
                id="edit-member-type"
                className="form-control"
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value as MembershipType)}
              >
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditingMember(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewingMember)}
        title={viewingMember ? `Member Details: ${viewingMember.name}` : 'Member Details'}
        onClose={() => setViewingMember(null)}
      >
        {viewingMember && (
          <div>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div><strong>Member ID:</strong> #{viewingMember.member_id}</div>
              <div><strong>Email:</strong> {viewingMember.email}</div>
              <div><strong>Phone:</strong> {viewingMember.phone || '—'}</div>
              <div><strong>Membership Type:</strong> {viewingMember.membership_type}</div>
            </div>

            <h3 style={{ fontSize: '0.925rem', marginBottom: '0.6rem' }}>Transaction History</h3>
            {historyLoading ? (
              <LoadingSpinner label="Loading borrowing history..." />
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No borrowing transactions for this member.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>TX</th>
                      <th>Book</th>
                      <th>Issue / Due</th>
                      <th>Return</th>
                      <th>Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => (
                      <tr key={tx.transaction_id}>
                        <td>#{tx.transaction_id}</td>
                        <td>{tx.book?.title || tx.isbn}</td>
                        <td>
                          <div>{tx.issue_date}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Due: {tx.due_date}
                          </div>
                        </td>
                        <td>{tx.return_date || 'Active'}</td>
                        <td>
                          {tx.fine
                            ? `${formatCurrencyInr(tx.fine.fine_amount)} (${tx.fine.payment_status})`
                            : '₹0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Member"
        message={`Attempt to delete member "${deleteTarget?.name}"? Members with borrowing history cannot be deleted to preserve audit integrity.`}
        confirmLabel="Delete Member"
        busy={deleting}
        onConfirm={handleDeleteMember}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
