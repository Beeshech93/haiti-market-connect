import { Link } from "@tanstack/react-router";
import { Headphones, ShieldCheck, Smartphone, Truck } from "lucide-react";

import { Logo } from "@/components/Logo";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t } = useI18n();

  const perks = [
    { icon: Truck, label: t("trust.delivery") },
    { icon: ShieldCheck, label: t("trust.securePayment") },
    { icon: Smartphone, label: "MonCash & NatCash" },
    { icon: Headphones, label: "Support Français & Kreyòl" },
  ];

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo withTagline />
          <p className="text-sm text-muted-foreground">{t("home.hero.subtitle")}</p>
        </div>

        <div className="space-y-2 text-sm">
          <h2 className="font-semibold">{t("nav.products")}</h2>
          <Link to="/products" className="block text-muted-foreground hover:text-primary">
            {t("catalog.title")}
          </Link>
          <Link
            to="/products"
            search={{ promo: true }}
            className="block text-muted-foreground hover:text-primary"
          >
            {t("home.promotions")}
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <h2 className="font-semibold">{t("nav.account")}</h2>
          <Link to="/orders" className="block text-muted-foreground hover:text-primary">
            {t("nav.orders")}
          </Link>
          <Link to="/favorites" className="block text-muted-foreground hover:text-primary">
            {t("nav.favorites")}
          </Link>
          <Link to="/profile" className="block text-muted-foreground hover:text-primary">
            {t("nav.profile")}
          </Link>
        </div>

        <ul className="space-y-2 text-sm">
          {perks.map((perk) => (
            <li key={perk.label} className="flex items-center gap-2 text-muted-foreground">
              <perk.icon className="size-4 shrink-0 text-primary" />
              {perk.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Achte La — Achte. Peye. Resevwa.
      </div>
    </footer>
  );
}
