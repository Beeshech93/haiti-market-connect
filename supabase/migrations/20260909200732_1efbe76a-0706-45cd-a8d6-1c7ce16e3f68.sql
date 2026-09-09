-- ENUMS
CREATE TYPE public.app_role AS ENUM ('customer','admin','super_admin');
CREATE TYPE public.product_source AS ENUM ('SHEIN','TEMU','AUTRE');
CREATE TYPE public.product_status AS ENUM ('ACTIVE','INACTIVE','DRAFT');
CREATE TYPE public.payment_provider AS ENUM ('MONCASH','NATCASH');
CREATE TYPE public.payment_status AS ENUM ('PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED');
CREATE TYPE public.order_status AS ENUM ('PENDING_PAYMENT','PAID','PROCESSING','PURCHASED','IN_TRANSIT','ARRIVED_HAITI','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');
CREATE TYPE public.delivery_method AS ENUM ('HOME','PICKUP_POINT','STORE_PICKUP');

-- UTIL
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'language','fr')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_ht TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_ht TEXT NOT NULL,
  description_fr TEXT,
  description_ht TEXT,
  source public.product_source NOT NULL DEFAULT 'AUTRE',
  source_url TEXT,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2),
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  reserved_stock INT NOT NULL DEFAULT 0,
  sku TEXT,
  weight NUMERIC(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status public.product_status NOT NULL DEFAULT 'ACTIVE',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  sold_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_status_idx ON public.products(status);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (status = 'ACTIVE' OR public.is_admin(auth.uid()));
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_images_public_read" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "product_images_admin_write" ON public.product_images FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCT VARIANTS
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  extra_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variants_public_read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "product_variants_admin_write" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, options)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_items_own" ON public.cart_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  department TEXT,
  delivery_point TEXT,
  instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_own" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SHIPPING ZONES
CREATE TABLE public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL,
  name_ht TEXT NOT NULL,
  city TEXT,
  department TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  eta_days TEXT,
  method public.delivery_method NOT NULL DEFAULT 'HOME',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipping_zones_public_read" ON public.shipping_zones FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "shipping_zones_admin_write" ON public.shipping_zones FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'LR-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  user_id UUID NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'HTG',
  payment_status public.payment_status NOT NULL DEFAULT 'PENDING',
  order_status public.order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  delivery_method public.delivery_method NOT NULL DEFAULT 'HOME',
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders(user_id);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  image_url TEXT,
  unit_price NUMERIC(12,2) NOT NULL,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider public.payment_provider NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HTG',
  reference_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT UNIQUE,
  bazik_payment_id TEXT,
  transaction_id TEXT UNIQUE,
  checkout_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON public.payments(order_id);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAYMENT TRANSACTIONS
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  status public.payment_status,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_transactions_admin_read" ON public.payment_transactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ORDER STATUS HISTORY
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_status_history_select" ON public.order_status_history FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title_fr TEXT NOT NULL,
  title_ht TEXT NOT NULL,
  body_fr TEXT,
  body_ht TEXT,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  is_read BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- SETTINGS
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.settings FOR SELECT USING (is_public OR public.is_admin(auth.uid()));
CREATE POLICY "settings_admin_write" ON public.settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SEED SETTINGS
INSERT INTO public.settings (key, value, is_public) VALUES
 ('store', '{"name":"Achte La","email":"kontak@achtela.ht","phone":"+509 3812 3456","whatsapp":"+509 3812 3456","address":"Delmas 32, Port-au-Prince","currency":"HTG"}'::jsonb, true),
 ('fx_rate', '{"usd_to_htg":132}'::jsonb, true),
 ('order_number_format', '{"prefix":"LR"}'::jsonb, false);

-- SEED CATEGORIES
INSERT INTO public.categories (slug, name_fr, name_ht, icon, sort_order) VALUES
 ('mode','Mode','Mòd','Shirt',1),
 ('chaussures','Chaussures','Soulye','Footprints',2),
 ('beaute','Beauté','Bote','Sparkles',3),
 ('accessoires','Accessoires','Akseswa','Watch',4),
 ('maison','Maison','Kay','Home',5),
 ('electronique','Électronique','Elektwonik','Smartphone',6),
 ('enfants','Enfants','Timoun','Baby',7),
 ('promotions','Promotions','Pwomosyon','Tag',8);

-- SEED PRODUCTS
INSERT INTO public.products (slug,name_fr,name_ht,description_fr,description_ht,source,source_url,purchase_price,extra_fees,selling_price,sale_price,shipping_cost,stock,sku,category_id,is_featured,rating,reviews_count,sold_count) VALUES
 ('robe-elegante-sans-manches','Robe élégante sans manches','Wòb elegan san manch','Robe fluide et élégante, parfaite pour les soirées et les occasions spéciales.','Wòb elegan e konfòtab, pafè pou sware ak okazyon espesyal.','SHEIN','https://example.com/shein/robe-elegante',1800,700,4700,3500,300,25,'AL-MOD-001',(SELECT id FROM public.categories WHERE slug='mode'),true,4.8,124,210),
 ('baskets-tendance-blanches','Baskets tendance blanches','Baskèt alamòd blan','Baskets confortables au style urbain, semelle antidérapante.','Baskèt konfòtab ak estil vil, semèl ki pa glise.','TEMU','https://example.com/temu/baskets',1500,600,2800,NULL,300,40,'AL-CHA-001',(SELECT id FROM public.categories WHERE slug='chaussures'),true,4.6,88,320),
 ('casque-audio-sans-fil','Casque audio sans fil','Kas odyo san fil','Casque Bluetooth avec réduction de bruit et 30h d''autonomie.','Kas Bluetooth ak rediksyon bwi epi 30è batri.','TEMU','https://example.com/temu/casque',2200,800,5500,4800,350,15,'AL-ELE-001',(SELECT id FROM public.categories WHERE slug='electronique'),true,4.7,201,140),
 ('sac-a-main-cuir-noir','Sac à main cuir noir','Sak nan men kwi nwa','Sac à main élégant en simili-cuir, plusieurs compartiments.','Sak nan men elegan an simili-kwi, plizyè konpatiman.','SHEIN','https://example.com/shein/sac',1200,500,3200,2600,250,30,'AL-ACC-001',(SELECT id FROM public.categories WHERE slug='accessoires'),true,4.5,64,95),
 ('palette-maquillage-12-couleurs','Palette maquillage 12 couleurs','Palèt makiyaj 12 koulè','Palette de fards à paupières hautement pigmentés, longue tenue.','Palèt fa pou zye ak anpil pigman, ki dire lontan.','SHEIN','https://example.com/shein/palette',900,400,2200,NULL,200,50,'AL-BEA-001',(SELECT id FROM public.categories WHERE slug='beaute'),false,4.4,45,180),
 ('ensemble-draps-coton','Ensemble de draps en coton','Ansanm dra koton','Ensemble de draps doux en coton, 4 pièces.','Ansanm dra dous an koton, 4 pyès.','TEMU','https://example.com/temu/draps',2000,700,4900,4200,400,18,'AL-MAI-001',(SELECT id FROM public.categories WHERE slug='maison'),false,4.3,32,60),
 ('montre-homme-classique','Montre homme classique','Mont gason klasik','Montre à quartz avec bracelet en acier inoxydable.','Mont kwatz ak brasle an asye inoksidab.','AUTRE','https://example.com/boutique/montre',1700,600,4200,3600,250,22,'AL-ACC-002',(SELECT id FROM public.categories WHERE slug='accessoires'),true,4.6,77,110),
 ('tenue-enfant-2-pieces','Tenue enfant 2 pièces','Rad timoun 2 pyès','Ensemble confortable pour enfant, coton respirant.','Ansanm konfòtab pou timoun, koton ki respire.','SHEIN','https://example.com/shein/enfant',800,350,1900,1500,200,60,'AL-ENF-001',(SELECT id FROM public.categories WHERE slug='enfants'),false,4.5,29,140),
 ('chemise-homme-lin','Chemise homme en lin','Chemiz gason an len','Chemise légère en lin, idéale pour le climat haïtien.','Chemiz lejè an len, ideyal pou klima Ayiti.','SHEIN','https://example.com/shein/chemise',1100,450,2700,NULL,250,35,'AL-MOD-002',(SELECT id FROM public.categories WHERE slug='mode'),false,4.4,51,88),
 ('ventilateur-rechargeable','Ventilateur rechargeable','Vantilatè rechajab','Ventilateur portable rechargeable, 3 vitesses, très utile en cas de coupure.','Vantilatè pòtab rechajab, 3 vitès, trè itil lè kouran koupe.','TEMU','https://example.com/temu/ventilateur',1400,550,3400,2900,300,45,'AL-ELE-002',(SELECT id FROM public.categories WHERE slug='electronique'),true,4.8,158,260),
 ('sandales-femme-confort','Sandales femme confort','Sandal fanm konfò','Sandales légères et confortables pour tous les jours.','Sandal lejè e konfòtab pou chak jou.','TEMU','https://example.com/temu/sandales',700,300,1800,1400,200,70,'AL-CHA-002',(SELECT id FROM public.categories WHERE slug='chaussures'),false,4.2,38,190),
 ('parfum-femme-floral','Parfum femme floral','Pafen fanm flè','Eau de parfum aux notes florales, tenue longue durée.','Pafen ak nòt flè, ki dire lontan.','AUTRE','https://example.com/boutique/parfum',1600,600,3900,3300,250,20,'AL-BEA-002',(SELECT id FROM public.categories WHERE slug='beaute'),true,4.7,66,120);

-- SEED IMAGES (Unsplash demo photos)
INSERT INTO public.product_images (product_id, url, sort_order)
SELECT p.id, i.url, i.ord FROM public.products p
JOIN (VALUES
 ('robe-elegante-sans-manches','https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',0),
 ('robe-elegante-sans-manches','https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',1),
 ('baskets-tendance-blanches','https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',0),
 ('baskets-tendance-blanches','https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80',1),
 ('casque-audio-sans-fil','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',0),
 ('sac-a-main-cuir-noir','https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',0),
 ('palette-maquillage-12-couleurs','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',0),
 ('ensemble-draps-coton','https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',0),
 ('montre-homme-classique','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80',0),
 ('tenue-enfant-2-pieces','https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&q=80',0),
 ('chemise-homme-lin','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',0),
 ('ventilateur-rechargeable','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80',0),
 ('sandales-femme-confort','https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80',0),
 ('parfum-femme-floral','https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',0)
) AS i(slug,url,ord) ON i.slug = p.slug;

-- SEED VARIANTS
INSERT INTO public.product_variants (product_id, kind, value, sort_order)
SELECT p.id, v.kind, v.value, v.ord FROM public.products p
JOIN (VALUES
 ('robe-elegante-sans-manches','color','Vert',0),
 ('robe-elegante-sans-manches','color','Noir',1),
 ('robe-elegante-sans-manches','color','Blanc',2),
 ('robe-elegante-sans-manches','size','S',0),
 ('robe-elegante-sans-manches','size','M',1),
 ('robe-elegante-sans-manches','size','L',2),
 ('robe-elegante-sans-manches','size','XL',3),
 ('baskets-tendance-blanches','size','38',0),
 ('baskets-tendance-blanches','size','39',1),
 ('baskets-tendance-blanches','size','40',2),
 ('baskets-tendance-blanches','size','41',3),
 ('chemise-homme-lin','size','M',0),
 ('chemise-homme-lin','size','L',1),
 ('chemise-homme-lin','size','XL',2)
) AS v(slug,kind,value,ord) ON v.slug = p.slug;

-- SEED SHIPPING ZONES
INSERT INTO public.shipping_zones (name_fr,name_ht,city,department,price,eta_days,method) VALUES
 ('Port-au-Prince — Livraison à domicile','Pòtoprens — Livrezon lakay','Port-au-Prince','Ouest',200,'2-4 jours','HOME'),
 ('Cap-Haïtien — Livraison à domicile','Okap — Livrezon lakay','Cap-Haïtien','Nord',300,'3-6 jours','HOME'),
 ('Autres villes — Livraison à domicile','Lòt vil — Livrezon lakay',NULL,NULL,450,'4-8 jours','HOME'),
 ('Point relais Delmas','Pwen relè Delmas','Port-au-Prince','Ouest',150,'2-4 jours','PICKUP_POINT'),
 ('Retrait au bureau','Pran nan biwo a','Port-au-Prince','Ouest',0,'2-3 jours','STORE_PICKUP');