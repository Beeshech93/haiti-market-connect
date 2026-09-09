import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Achte La" },
      { name: "description", content: "Espace d'administration Achte La : produits, commandes et livraisons." },
      { property: "og:title", content: "Administration — Achte La" },
      { property: "og:description", content: "Espas administrasyon Achte La." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useI18n();
  const { user, isAdmin, isFinance, loading } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (loading) {
    return (
      <ShopLayout>
        <p className="container-page py-16 text-center text-muted-foreground">{t("loading")}</p>
      </ShopLayout>
    );
  }

  if (!user || !isAdmin) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("admin.forbidden")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to={user ? "/" : "/auth"}>{user ? t("nav.home") : t("nav.login")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  const tabs: {
    to: "/admin" | "/admin/products" | "/admin/orders" | "/admin/finance";
    label: string;
  }[] = [
    { to: "/admin", label: t("admin.overview") },
    { to: "/admin/products", label: t("admin.products") },
    { to: "/admin/orders", label: t("admin.orders") },
    ...(isFinance ? [{ to: "/admin/finance", label: t("admin.finance") }] : []),
  ];

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <h1 className="text-2xl font-extrabold">{t("admin.title")}</h1>
        <nav className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === tab.to
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent/10"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5">
          <Outlet />
        </div>
      </div>
    </ShopLayout>
  );
}
