import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { BookCatalogItem } from '../../types/database';
import {
  Alert,
  EmptyState,
  LoadingSpinner,
  SearchBar,
  StatusBadge,
} from '../../components/ui';

export function BrowseBooksPage() {
  const [books, setBooks] = useState<BookCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'ISSUED'>('ALL');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_books_catalog');
      if (!active) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setBooks((data as BookCatalogItem[]) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (filter === 'AVAILABLE' && b.is_issued) return false;
      if (filter === 'ISSUED' && !b.is_issued) return false;
      if (!q) return true;
      const authors = b.authors.map((a) => a.name.toLowerCase()).join(' ');
      return (
        b.isbn.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q) ||
        authors.includes(q)
      );
    });
  }, [books, search, filter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Browse &amp; Search Books</h1>
          <p className="page-subtitle">
            Search the library catalog by ISBN, title, publisher, or author
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by ISBN, title, publisher, or author..."
        />
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '170px' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'ALL' | 'AVAILABLE' | 'ISSUED')}
          aria-label="Filter catalog availability"
        >
          <option value="ALL">All Books</option>
          <option value="AVAILABLE">Available</option>
          <option value="ISSUED">Currently Issued</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading library catalog..." />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          title="No matching books"
          description="Try a different ISBN, title, publisher, or author name."
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
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((b) => (
                <tr key={b.isbn}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{b.isbn}</td>
                  <td style={{ fontWeight: 500 }}>{b.title}</td>
                  <td>{b.authors.length ? b.authors.map((a) => a.name).join(', ') : '—'}</td>
                  <td>{b.publisher || '—'}</td>
                  <td>{b.publication_year ?? '—'}</td>
                  <td>
                    {b.is_issued ? (
                      <StatusBadge label="Currently Issued" variant="solid" />
                    ) : (
                      <StatusBadge label="Available" variant="muted" />
                    )}
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
