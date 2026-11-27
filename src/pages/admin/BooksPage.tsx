import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Author, BookCatalogItem } from '../../types/database';
import { isValidIsbn, isValidYear } from '../../utils/validation';
import {
  Alert,
  ConfirmModal,
  EmptyState,
  LoadingSpinner,
  Modal,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function BooksPage() {
  const [books, setBooks] = useState<BookCatalogItem[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'ISSUED'>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookCatalogItem | null>(null);
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BookCatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [booksRes, authorsRes] = await Promise.all([
        supabase.rpc('get_books_catalog'),
        supabase.from('author').select('*').order('name'),
      ]);
      if (booksRes.error) throw booksRes.error;
      if (authorsRes.error) throw authorsRes.error;
      setBooks((booksRes.data as BookCatalogItem[]) ?? []);
      setAuthors((authorsRes.data as Author[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (availabilityFilter === 'AVAILABLE' && b.is_issued) return false;
      if (availabilityFilter === 'ISSUED' && !b.is_issued) return false;
      if (!q) return true;
      const authorText = b.authors.map((a) => a.name.toLowerCase()).join(' ');
      return (
        b.isbn.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q) ||
        authorText.includes(q)
      );
    });
  }, [books, search, availabilityFilter]);

  function openAddModal() {
    setEditingBook(null);
    setIsbn('');
    setTitle('');
    setPublisher('');
    setPublicationYear('');
    setSelectedAuthorIds([]);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(book: BookCatalogItem) {
    setEditingBook(book);
    setIsbn(book.isbn);
    setTitle(book.title);
    setPublisher(book.publisher || '');
    setPublicationYear(book.publication_year ? String(book.publication_year) : '');
    setSelectedAuthorIds(book.authors.map((a) => a.author_id));
    setError('');
    setModalOpen(true);
  }

  function toggleAuthor(authorId: number) {
    setSelectedAuthorIds((prev) =>
      prev.includes(authorId) ? prev.filter((id) => id !== authorId) : [...prev, authorId]
    );
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidIsbn(isbn)) {
      setError('Please enter a valid ISBN (4–20 characters: digits, X, or hyphens).');
      return;
    }
    if (!title.trim()) {
      setError('Book title is required.');
      return;
    }

    const parsedYear = publicationYear.trim() ? Number(publicationYear.trim()) : null;
    if (!isValidYear(parsedYear)) {
      setError('Publication year must be between 1450 and next year.');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('save_book', {
        p_isbn: isbn.trim(),
        p_title: title.trim(),
        p_publisher: publisher.trim() || null,
        p_publication_year: parsedYear,
        p_author_ids: selectedAuthorIds,
        p_is_edit: Boolean(editingBook),
        p_original_isbn: editingBook ? editingBook.isbn : null,
      });
      if (rpcError) throw rpcError;

      setModalOpen(false);
      setSuccess(editingBook ? 'Book updated successfully.' : 'Book added successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save book.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBook() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const { error: delError } = await supabase
        .from('book')
        .delete()
        .eq('isbn', deleteTarget.isbn);
      if (delError) {
        if (delError.code === '23503') {
          throw new Error(
            'Cannot delete this book because it has borrowing transaction history.'
          );
        }
        throw delError;
      }
      setDeleteTarget(null);
      setSuccess(`Deleted "${deleteTarget.title}".`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete book.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Book Management</h1>
          <p className="page-subtitle">Add, update, search, and manage library books and authors</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          <span>Add Book</span>
        </button>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by ISBN, title, publisher, or author..."
        />
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '170px' }}
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value as 'ALL' | 'AVAILABLE' | 'ISSUED')}
          aria-label="Filter by availability"
        >
          <option value="ALL">All Statuses</option>
          <option value="AVAILABLE">Available Only</option>
          <option value="ISSUED">Currently Issued</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading book catalog..." />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          title="No matching books found"
          description="Try adjusting your search query or add a new book to the catalog."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ISBN</th>
                <th>Title</th>
                <th>Authors</th>
                <th>Publisher</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.isbn}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{book.isbn}</td>
                  <td style={{ fontWeight: 500 }}>{book.title}</td>
                  <td>
                    {book.authors.length > 0
                      ? book.authors.map((a) => a.name).join(', ')
                      : '—'}
                  </td>
                  <td>{book.publisher || '—'}</td>
                  <td>{book.publication_year ?? '—'}</td>
                  <td>
                    {book.is_issued ? (
                      <StatusBadge label="Currently Issued" variant="solid" />
                    ) : (
                      <StatusBadge label="Available" variant="muted" />
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(book)}
                        aria-label={`Edit ${book.title}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(book)}
                        aria-label={`Delete ${book.title}`}
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
        open={modalOpen}
        title={editingBook ? 'Edit Book' : 'Add New Book'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveBook}>
          <div className="form-group">
            <label htmlFor="book-isbn" className="form-label">
              ISBN
            </label>
            <input
              id="book-isbn"
              type="text"
              className="form-control"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-0-13-468599-1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="book-title" className="form-label">
              Title
            </label>
            <input
              id="book-title"
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Database System Concepts"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book-publisher" className="form-label">
                Publisher
              </label>
              <input
                id="book-publisher"
                type="text"
                className="form-control"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="McGraw-Hill"
              />
            </div>

            <div className="form-group">
              <label htmlFor="book-year" className="form-label">
                Publication Year
              </label>
              <input
                id="book-year"
                type="number"
                className="form-control"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                placeholder="2020"
                min={1450}
                max={2100}
              />
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">Authors (Many-to-Many)</span>
            {authors.length === 0 ? (
              <p className="form-hint">
                No authors added yet. Add authors in Author Management first.
              </p>
            ) : (
              <div className="checklist-box">
                {authors.map((author) => (
                  <label key={author.author_id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={selectedAuthorIds.includes(author.author_id)}
                      onChange={() => toggleAuthor(author.author_id)}
                    />
                    <span>{author.name}</span>
                  </label>
                ))}
              </div>
            )}
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
              {saving ? 'Saving...' : editingBook ? 'Update Book' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Book"
        message={`Are you sure you want to delete "${deleteTarget?.title}" (${deleteTarget?.isbn})? Books with borrowing history cannot be deleted.`}
        confirmLabel="Delete Book"
        busy={deleting}
        onConfirm={handleDeleteBook}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
