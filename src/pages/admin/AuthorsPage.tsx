import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Author, Book } from '../../types/database';
import {
  Alert,
  ConfirmModal,
  EmptyState,
  LoadingSpinner,
  Modal,
  SearchBar,
} from '../../components/ui';

interface AuthorWithBooks extends Author {
  book_author?: { book: Book | null }[];
}

export function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorWithBooks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorWithBooks | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AuthorWithBooks | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAuthors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('author')
        .select('author_id, name, book_author(book(isbn, title, publication_year))')
        .order('name');
      if (fetchError) throw fetchError;
      setAuthors((data as unknown as AuthorWithBooks[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load authors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  const filteredAuthors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((a) => {
      const bookTitles = (a.book_author || [])
        .map((ba) => ba.book?.title?.toLowerCase() || '')
        .join(' ');
      return a.name.toLowerCase().includes(q) || bookTitles.includes(q);
    });
  }, [authors, search]);

  function openAddModal() {
    setEditingAuthor(null);
    setName('');
    setError('');
    setModalOpen(true);
  }

  function openEditModal(author: AuthorWithBooks) {
    setEditingAuthor(author);
    setName(author.name);
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Author name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingAuthor) {
        const { error: updError } = await supabase
          .from('author')
          .update({ name: name.trim() })
          .eq('author_id', editingAuthor.author_id);
        if (updError) throw updError;
        setSuccess('Author updated successfully.');
      } else {
        const { error: insError } = await supabase
          .from('author')
          .insert({ name: name.trim() });
        if (insError) throw insError;
        setSuccess('Author added successfully.');
      }
      setModalOpen(false);
      await loadAuthors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save author.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const { error: delError } = await supabase
        .from('author')
        .delete()
        .eq('author_id', deleteTarget.author_id);
      if (delError) {
        if (delError.code === '23503') {
          throw new Error(
            'Cannot delete this author while they remain linked to one or more books.'
          );
        }
        throw delError;
      }
      setSuccess(`Deleted author "${deleteTarget.name}".`);
      setDeleteTarget(null);
      await loadAuthors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete author.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Author Management</h1>
          <p className="page-subtitle">Manage authors and view their associated books</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          <span>Add Author</span>
        </button>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search authors or associated book titles..."
        />
      </div>

      {loading ? (
        <LoadingSpinner label="Loading authors..." />
      ) : filteredAuthors.length === 0 ? (
        <EmptyState
          title="No authors found"
          description="Add authors so they can be linked to books in the catalog."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Author ID</th>
                <th>Author Name</th>
                <th>Associated Books</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuthors.map((author) => {
                const books = (author.book_author || [])
                  .map((ba) => ba.book)
                  .filter((b): b is Book => Boolean(b));
                return (
                  <tr key={author.author_id}>
                    <td>#{author.author_id}</td>
                    <td style={{ fontWeight: 500 }}>{author.name}</td>
                    <td>
                      {books.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>No books linked</span>
                      ) : (
                        books.map((b) => b.title).join(', ')
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(author)}
                          aria-label={`Edit ${author.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(author)}
                          aria-label={`Delete ${author.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingAuthor ? 'Edit Author' : 'Add New Author'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="author-name" className="form-label">
              Author Name
            </label>
            <input
              id="author-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Abraham Silberschatz"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingAuthor ? 'Update Author' : 'Create Author'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Author"
        message={`Delete author "${deleteTarget?.name}"? Authors currently linked to books cannot be deleted.`}
        confirmLabel="Delete Author"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
