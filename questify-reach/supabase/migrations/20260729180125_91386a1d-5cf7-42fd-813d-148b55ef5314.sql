
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.complete_target(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_cgpa(smallint, numeric) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_approval(uuid, boolean) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
