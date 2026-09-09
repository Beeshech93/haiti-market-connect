REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon, public;

DROP POLICY "products_public_read" ON public.products;
CREATE POLICY "products_anon_read" ON public.products FOR SELECT TO anon USING (status = 'ACTIVE');
CREATE POLICY "products_auth_read" ON public.products FOR SELECT TO authenticated USING (status = 'ACTIVE' OR public.is_admin(auth.uid()));

DROP POLICY "shipping_zones_public_read" ON public.shipping_zones;
CREATE POLICY "shipping_zones_anon_read" ON public.shipping_zones FOR SELECT TO anon USING (is_active);
CREATE POLICY "shipping_zones_auth_read" ON public.shipping_zones FOR SELECT TO authenticated USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY "settings_public_read" ON public.settings;
CREATE POLICY "settings_anon_read" ON public.settings FOR SELECT TO anon USING (is_public);
CREATE POLICY "settings_auth_read" ON public.settings FOR SELECT TO authenticated USING (is_public OR public.is_admin(auth.uid()));