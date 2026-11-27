-- Migration 009: Idempotent Sample Books and Authors
-- Inserts demonstration books and authors without duplicating records on re-runs.

INSERT INTO public.book (isbn, title, publisher, publication_year)
VALUES
  ('978-0-13-468599-1', 'The Pragmatic Programmer', 'Addison-Wesley', 2019),
  ('978-0-596-51774-8', 'JavaScript: The Good Parts', 'O''Reilly Media', 2008),
  ('978-0-13-235088-4', 'Clean Code', 'Prentice Hall', 2008),
  ('978-0-201-63361-0', 'Design Patterns', 'Addison-Wesley', 1994),
  ('978-0-59-651798-4', 'Learning Python', 'O''Reilly Media', 2013)
ON CONFLICT (isbn) DO NOTHING;

INSERT INTO public.author (name)
SELECT v.name
FROM (
  VALUES
    ('David Thomas'),
    ('Andrew Hunt'),
    ('Douglas Crockford'),
    ('Robert C. Martin'),
    ('Erich Gamma'),
    ('Mark Lutz')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.author a WHERE a.name = v.name
);

INSERT INTO public.book_author (isbn, author_id)
SELECT pairs.isbn, a.author_id
FROM (
  VALUES
    ('978-0-13-468599-1', 'David Thomas'),
    ('978-0-13-468599-1', 'Andrew Hunt'),
    ('978-0-596-51774-8', 'Douglas Crockford'),
    ('978-0-13-235088-4', 'Robert C. Martin'),
    ('978-0-201-63361-0', 'Erich Gamma'),
    ('978-0-59-651798-4', 'Mark Lutz')
) AS pairs(isbn, author_name)
JOIN public.author a ON a.name = pairs.author_name
ON CONFLICT (isbn, author_id) DO NOTHING;
