-- Migration 010: Harden function execution privileges and revoke anon access from internal/authenticated RPCs

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_books_catalog() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_book(TEXT, TEXT, TEXT, INTEGER, INTEGER[], BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_book(TEXT, INTEGER, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_book(INTEGER, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_fine_paid(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_profile(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_member_dashboard_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_book(TEXT, TEXT, TEXT, INTEGER, INTEGER[], BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_book(TEXT, INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_book(INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_fine_paid(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_dashboard_stats() TO authenticated;
