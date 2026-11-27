import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Author, Book } from '../../types/database';
import { Alert, EmptyState, LoadingSpinner, SearchBar } from '../../components/ui';

interface AuthorRow extends Author {
  book_author?: { book: Book | null }[];
}

export function ViewAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('author')
        .select('author_id, name, book_author(book(isbn, title, publication_year))')
        .order('name');
      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAuthors((data as unknown as AuthorRow[]) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((a) => {
      const titles = (a.book_author || [])
        .map((ba) => ba.book?.title?.toLowerCase() || '')
        .join(' ');
      return a.name.toLowerCase().includes(q) || titles.includes(q);
    });
  }, [authors, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Library Authors</h1>
          <p className="page-subtitle">Explore authors and the books they have authored</p>
        </div>
      </div>

      <Alert type="error" message={error} />

      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search author name or book title..."
        />
      </div>

      {loading ? (
        <LoadingSpinner label="Loading authors..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No authors found"
          description="Try clearing or refining your search query."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Author ID</th>
                <th>Name</th>
                <th>Books Written</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const books = (a.book_author || [])
                  .map((ba) => ba.book)
                  .filter((b): b is Book => Boolean(b));
                return (
                  <tr key={a.author_id}>
                    <td>#{a.author_id}</td>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td>
                      {books.length
                        ? books.map((b) => `${b.title} (${b.isbn})`).join(', ')
                        : '—'}
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
