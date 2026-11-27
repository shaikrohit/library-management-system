import React, { useCallback, useEffect, useState } from 'react';
import { BookPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BookCatalogItem, Member } from '../../types/database';
import { addDaysToIsoDate, getTodayIsoDate } from '../../utils/fine';
import { isDueDateValid } from '../../utils/validation';
import { Alert, LoadingSpinner } from '../../components/ui';

export function IssueBooksPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [availableBooks, setAvailableBooks] = useState<BookCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = getTodayIsoDate();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedIsbn, setSelectedIsbn] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDaysToIsoDate(today, 14));
  const [submitting, setSubmitting] = useState(false);

  const loadFormOptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, booksRes] = await Promise.all([
        supabase.from('member').select('*').order('name'),
        supabase.rpc('get_books_catalog'),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (booksRes.error) throw booksRes.error;

      setMembers((membersRes.data as Member[]) ?? []);
      const catalog = (booksRes.data as BookCatalogItem[]) ?? [];
      setAvailableBooks(catalog.filter((b) => !b.is_issued));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members and available books.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMemberId) {
      setError('Please select a library member.');
      return;
    }
    if (!selectedIsbn) {
      setError('Please select an available book.');
      return;
    }
    if (!isDueDateValid(issueDate, dueDate)) {
      setError('Due Date cannot be earlier than Issue Date.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('issue_book', {
        p_isbn: selectedIsbn,
        p_member_id: Number(selectedMemberId),
        p_issue_date: issueDate,
        p_due_date: dueDate,
      });

      if (rpcError) throw rpcError;

      const created = data as { transaction_id: number; isbn: string };
      setSuccess(
        `Book (${created.isbn}) issued successfully under Transaction #${created.transaction_id}.`
      );
      setSelectedIsbn('');
      await loadFormOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading issue form..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Issue Book</h1>
          <p className="page-subtitle">
            Create a new borrowing transaction for an available book and registered member
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="card" style={{ maxWidth: '640px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="issue-member" className="form-label">
              Select Member
            </label>
            <select
              id="issue-member"
              className="form-control"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">-- Choose a registered member --</option>
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  #{m.member_id} — {m.name} ({m.membership_type}) · {m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="issue-book" className="form-label">
              Select Available Book
            </label>
            <select
              id="issue-book"
              className="form-control"
              value={selectedIsbn}
              onChange={(e) => setSelectedIsbn(e.target.value)}
              required
            >
              <option value="">-- Choose an available book --</option>
              {availableBooks.map((b) => (
                <option key={b.isbn} value={b.isbn}>
                  {b.title} ({b.isbn})
                </option>
              ))}
            </select>
            <span className="form-hint">
              {availableBooks.length} available book(s). Currently issued books cannot be issued
              again until returned.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="issue-date" className="form-label">
                Issue Date
              </label>
              <input
                id="issue-date"
                type="date"
                className="form-control"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due-date" className="form-label">
                Due Date
              </label>
              <input
                id="due-date"
                type="date"
                className="form-control"
                value={dueDate}
                min={issueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || availableBooks.length === 0 || members.length === 0}
          >
            <BookPlus size={16} />
            <span>{submitting ? 'Issuing Book...' : 'Issue Book'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
