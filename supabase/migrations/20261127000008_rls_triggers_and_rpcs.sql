-- Migration 008: Row Level Security Policies, Auth Trigger, and Stored Procedures

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT member_id
  FROM public.app_user
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user
    WHERE role = 'ADMIN'
  );
$$;

-- 2. RLS Policies

-- AUTHOR
CREATE POLICY "Authenticated users can view authors"
  ON public.author FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert authors"
  ON public.author FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update authors"
  ON public.author FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete authors"
  ON public.author FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- BOOK
CREATE POLICY "Authenticated users can view books"
  ON public.book FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert books"
  ON public.book FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update books"
  ON public.book FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete books"
  ON public.book FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- BOOK_AUTHOR
CREATE POLICY "Authenticated users can view book authors"
  ON public.book_author FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert book authors"
  ON public.book_author FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete book authors"
  ON public.book_author FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- MEMBER
CREATE POLICY "Admins view all members and members view own profile"
  ON public.member FOR SELECT
  TO authenticated
  USING (public.is_admin() OR member_id = public.current_member_id());

CREATE POLICY "Admins can insert members"
  ON public.member FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update members"
  ON public.member FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete members"
  ON public.member FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- APP_USER
CREATE POLICY "Users can view own app_user row or admins view all"
  ON public.app_user FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- BOOK_TRANSACTION (writes handled via SECURITY DEFINER RPCs)
CREATE POLICY "Admins view all transactions and members view own"
  ON public.book_transaction FOR SELECT
  TO authenticated
  USING (public.is_admin() OR member_id = public.current_member_id());

-- Note: Authenticated users need to see whether a book is actively issued without exposing borrower identity.
-- We expose a secure view / RPC for book availability rather than opening book_transaction rows.

-- FINE (writes handled via SECURITY DEFINER RPCs)
CREATE POLICY "Admins view all fines and members view own"
  ON public.fine FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.book_transaction bt
      WHERE bt.transaction_id = fine.transaction_id
        AND bt.member_id = public.current_member_id()
    )
  );

-- 3. Auth Registration Trigger (always creates MEMBER role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_membership_type TEXT;
  v_member_id INTEGER;
BEGIN
  v_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');
  v_membership_type := COALESCE(NEW.raw_user_meta_data ->> 'membership_type', 'Student');
  IF v_membership_type NOT IN ('Student', 'Staff') THEN
    v_membership_type := 'Student';
  END IF;

  -- Always enforce MEMBER role on public signup
  INSERT INTO public.member (name, email, phone, membership_type)
  VALUES (v_name, lower(NEW.email), v_phone, v_membership_type)
  ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, public.member.phone),
        membership_type = EXCLUDED.membership_type
  RETURNING member_id INTO v_member_id;

  INSERT INTO public.app_user (user_id, email, role, member_id)
  VALUES (NEW.id, lower(NEW.email), 'MEMBER', v_member_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. One-Time Initial Administrator Setup RPC
CREATE OR REPLACE FUNCTION public.complete_initial_admin_setup(
  p_user_id UUID,
  p_email TEXT,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_hash TEXT;
  v_provided_hash TEXT;
  v_temp_member_id INTEGER;
BEGIN
  IF public.has_admin() THEN
    RAISE EXCEPTION 'Initial administrator setup has already been completed and is permanently disabled.';
  END IF;

  SELECT token_hash INTO v_stored_hash
  FROM public.app_setup_config
  WHERE id = 1;

  IF v_stored_hash IS NULL THEN
    RAISE EXCEPTION 'Setup token is not configured or has already been used.';
  END IF;

  v_provided_hash := encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex');
  IF v_provided_hash <> v_stored_hash THEN
    RAISE EXCEPTION 'Invalid one-time setup token.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND lower(email) = lower(trim(p_email))
  ) THEN
    RAISE EXCEPTION 'Matching authenticated user record not found.';
  END IF;

  SELECT member_id INTO v_temp_member_id
  FROM public.app_user
  WHERE user_id = p_user_id;

  UPDATE public.app_user
  SET role = 'ADMIN',
      member_id = NULL
  WHERE user_id = p_user_id;

  IF v_temp_member_id IS NOT NULL THEN
    DELETE FROM public.member
    WHERE member_id = v_temp_member_id
      AND NOT EXISTS (
        SELECT 1 FROM public.book_transaction WHERE member_id = v_temp_member_id
      );
  END IF;

  DELETE FROM public.app_setup_config WHERE id = 1;

  RETURN jsonb_build_object('status', 'ADMIN_CREATED', 'email', lower(trim(p_email)));
END;
$$;

-- 5. Book Catalog Read Function (exposes availability without exposing borrower PII to members)
CREATE OR REPLACE FUNCTION public.get_books_catalog()
RETURNS TABLE (
  isbn VARCHAR(20),
  title TEXT,
  publisher TEXT,
  publication_year INTEGER,
  is_issued BOOLEAN,
  authors JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.isbn,
    b.title,
    b.publisher,
    b.publication_year,
    EXISTS (
      SELECT 1
      FROM public.book_transaction bt
      WHERE bt.isbn = b.isbn AND bt.return_date IS NULL
    ) AS is_issued,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('author_id', a.author_id, 'name', a.name)
          ORDER BY a.name
        )
        FROM public.book_author ba
        JOIN public.author a ON a.author_id = ba.author_id
        WHERE ba.isbn = b.isbn
      ),
      '[]'::jsonb
    ) AS authors
  FROM public.book b
  WHERE auth.uid() IS NOT NULL
  ORDER BY b.title ASC;
$$;

-- 6. Atomic Book Save (Create / Edit Book + Author Links)
CREATE OR REPLACE FUNCTION public.save_book(
  p_isbn TEXT,
  p_title TEXT,
  p_publisher TEXT,
  p_publication_year INTEGER,
  p_author_ids INTEGER[],
  p_is_edit BOOLEAN DEFAULT FALSE,
  p_original_isbn TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_isbn TEXT := trim(COALESCE(p_isbn, ''));
  v_title TEXT := trim(COALESCE(p_title, ''));
  v_publisher TEXT := NULLIF(trim(COALESCE(p_publisher, '')), '');
  v_target_isbn TEXT := COALESCE(NULLIF(trim(COALESCE(p_original_isbn, '')), ''), v_isbn);
  v_aid INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required.';
  END IF;

  IF v_isbn = '' OR v_title = '' THEN
    RAISE EXCEPTION 'ISBN and Title are required.';
  END IF;

  IF p_is_edit THEN
    UPDATE public.book
    SET isbn = v_isbn,
        title = v_title,
        publisher = v_publisher,
        publication_year = p_publication_year
    WHERE isbn = v_target_isbn;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Book not found.';
    END IF;
  ELSE
    INSERT INTO public.book (isbn, title, publisher, publication_year)
    VALUES (v_isbn, v_title, v_publisher, p_publication_year);
  END IF;

  DELETE FROM public.book_author WHERE isbn = v_isbn;

  IF p_author_ids IS NOT NULL THEN
    FOREACH v_aid IN ARRAY p_author_ids LOOP
      INSERT INTO public.book_author (isbn, author_id)
      VALUES (v_isbn, v_aid)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('isbn', v_isbn, 'title', v_title);
END;
$$;

-- 7. Issue Book RPC (Admin Only)
CREATE OR REPLACE FUNCTION public.issue_book(
  p_isbn TEXT,
  p_member_id INTEGER,
  p_issue_date DATE,
  p_due_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_isbn TEXT := trim(COALESCE(p_isbn, ''));
  v_transaction_id INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only librarians can issue books.';
  END IF;

  IF p_issue_date IS NULL OR p_due_date IS NULL THEN
    RAISE EXCEPTION 'Issue date and due date are required.';
  END IF;

  IF p_due_date < p_issue_date THEN
    RAISE EXCEPTION 'Due date cannot be earlier than issue date.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.member WHERE member_id = p_member_id) THEN
    RAISE EXCEPTION 'Selected member does not exist.';
  END IF;

  -- Lock the book row to prevent concurrent double-issuing
  PERFORM 1 FROM public.book WHERE isbn = v_isbn FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book with ISBN % does not exist.', v_isbn;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.book_transaction
    WHERE isbn = v_isbn AND return_date IS NULL
  ) THEN
    RAISE EXCEPTION 'Book (ISBN: %) is currently issued and unavailable.', v_isbn;
  END IF;

  INSERT INTO public.book_transaction (isbn, member_id, issue_date, due_date, return_date)
  VALUES (v_isbn, p_member_id, p_issue_date, p_due_date, NULL)
  RETURNING transaction_id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'isbn', v_isbn,
    'member_id', p_member_id,
    'issue_date', p_issue_date,
    'due_date', p_due_date
  );
END;
$$;

-- 8. Atomic Return Book & Automatic Fine Calculation RPC (Admin Only)
-- Fine Rule: ₹5 per overdue calendar day when return_date > due_date
CREATE OR REPLACE FUNCTION public.return_book(
  p_transaction_id INTEGER,
  p_return_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_date DATE;
  v_due_date DATE;
  v_return_date DATE := COALESCE(p_return_date, CURRENT_DATE);
  v_days_overdue INTEGER;
  v_fine_amount NUMERIC(10, 2) := 0;
  v_fine_id INTEGER := NULL;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only librarians can record book returns.';
  END IF;

  SELECT issue_date, due_date
  INTO v_issue_date, v_due_date
  FROM public.book_transaction
  WHERE transaction_id = p_transaction_id
    AND return_date IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active transaction not found or book has already been returned.';
  END IF;

  IF v_return_date < v_issue_date THEN
    RAISE EXCEPTION 'Return date (%) cannot be earlier than issue date (%).', v_return_date, v_issue_date;
  END IF;

  UPDATE public.book_transaction
  SET return_date = v_return_date
  WHERE transaction_id = p_transaction_id;

  v_days_overdue := GREATEST(0, v_return_date - v_due_date);

  IF v_days_overdue > 0 THEN
    v_fine_amount := (v_days_overdue * 5)::NUMERIC(10, 2);
    INSERT INTO public.fine (transaction_id, fine_amount, payment_status)
    VALUES (p_transaction_id, v_fine_amount, 'Pending')
    RETURNING fine_id INTO v_fine_id;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'return_date', v_return_date,
    'days_overdue', v_days_overdue,
    'fine_amount', v_fine_amount,
    'fine_id', v_fine_id,
    'payment_status', CASE WHEN v_fine_id IS NOT NULL THEN 'Pending' ELSE NULL END
  );
END;
$$;

-- 9. Mark Fine Paid RPC (Admin Only)
CREATE OR REPLACE FUNCTION public.mark_fine_paid(p_fine_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fine public.fine%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update fine payment status.';
  END IF;

  UPDATE public.fine
  SET payment_status = 'Paid'
  WHERE fine_id = p_fine_id
    AND payment_status = 'Pending'
  RETURNING * INTO v_fine;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending fine record not found.';
  END IF;

  RETURN jsonb_build_object(
    'fine_id', v_fine.fine_id,
    'transaction_id', v_fine.transaction_id,
    'fine_amount', v_fine.fine_amount,
    'payment_status', v_fine.payment_status
  );
END;
$$;

-- 10. Member Profile Self-Update RPC
CREATE OR REPLACE FUNCTION public.update_my_profile(p_name TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id INTEGER := public.current_member_id();
  v_clean_name TEXT := trim(COALESCE(p_name, ''));
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Member profile not found.';
  END IF;

  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Name cannot be empty.';
  END IF;

  UPDATE public.member
  SET name = v_clean_name,
      phone = NULLIF(trim(COALESCE(p_phone, '')), '')
  WHERE member_id = v_member_id;

  RETURN jsonb_build_object('member_id', v_member_id, 'name', v_clean_name);
END;
$$;

-- 11. Dashboard Statistics RPCs
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required.';
  END IF;

  RETURN jsonb_build_object(
    'total_books', (SELECT COUNT(*) FROM public.book),
    'total_authors', (SELECT COUNT(*) FROM public.author),
    'total_members', (SELECT COUNT(*) FROM public.member),
    'currently_issued', (SELECT COUNT(*) FROM public.book_transaction WHERE return_date IS NULL),
    'overdue_books', (SELECT COUNT(*) FROM public.book_transaction WHERE return_date IS NULL AND due_date < CURRENT_DATE),
    'pending_fine_amount', COALESCE((SELECT SUM(fine_amount) FROM public.fine WHERE payment_status = 'Pending'), 0),
    'paid_fine_amount', COALESCE((SELECT SUM(fine_amount) FROM public.fine WHERE payment_status = 'Paid'), 0),
    'total_transactions', (SELECT COUNT(*) FROM public.book_transaction)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id INTEGER := public.current_member_id();
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Member profile not found.';
  END IF;

  RETURN jsonb_build_object(
    'active_borrows', (SELECT COUNT(*) FROM public.book_transaction WHERE member_id = v_member_id AND return_date IS NULL),
    'overdue_borrows', (SELECT COUNT(*) FROM public.book_transaction WHERE member_id = v_member_id AND return_date IS NULL AND due_date < CURRENT_DATE),
    'total_borrows', (SELECT COUNT(*) FROM public.book_transaction WHERE member_id = v_member_id),
    'pending_fine_amount', COALESCE((
      SELECT SUM(f.fine_amount)
      FROM public.fine f
      JOIN public.book_transaction bt ON bt.transaction_id = f.transaction_id
      WHERE bt.member_id = v_member_id AND f.payment_status = 'Pending'
    ), 0),
    'paid_fine_amount', COALESCE((
      SELECT SUM(f.fine_amount)
      FROM public.fine f
      JOIN public.book_transaction bt ON bt.transaction_id = f.transaction_id
      WHERE bt.member_id = v_member_id AND f.payment_status = 'Paid'
    ), 0)
  );
END;
$$;

-- Restrict RPC execute permissions explicitly
REVOKE ALL ON FUNCTION public.has_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.complete_initial_admin_setup(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_initial_admin_setup(UUID, TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_books_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_books_catalog() TO authenticated;

REVOKE ALL ON FUNCTION public.save_book(TEXT, TEXT, TEXT, INTEGER, INTEGER[], BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_book(TEXT, TEXT, TEXT, INTEGER, INTEGER[], BOOLEAN, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.issue_book(TEXT, INTEGER, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_book(TEXT, INTEGER, DATE, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.return_book(INTEGER, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.return_book(INTEGER, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_fine_paid(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_fine_paid(INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.update_my_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.get_member_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_dashboard_stats() TO authenticated;
