REVOKE ALL ON FUNCTION public.is_finance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_finance(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_finance(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance(uuid) TO service_role;