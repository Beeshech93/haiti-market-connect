import { Link, useNavigate } from "@tanstack/react-router";
import { Grid2x2, Heart, Home, LogOut, Package, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

export function Header() {
  const { t } = useI18n();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void navigate({ to: "/products", search: { q: term || undefined } });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Logo className="shrink-0" />

        <form onSubmit={submitSearch} className="ml-auto hidden min-w-0 flex-1 md:block">
          <div className="relative mx-auto max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("search.placeholder")}
              className="h-10 rounded-full bg-surface pl-9"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1.5 md:ml-0">
          <LanguageSwitcher className="hidden sm:flex" />

          <Link
            to="/favorites"
            className="hidden size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:grid"
            aria-label={t("favorites.title")}
          >
            <Heart className="size-5" />
          </Link>

          <Link
            to="/cart"
            className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t("nav.cart")}
          >
            <ShoppingBag className="size-5" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  aria-label={t("nav.account")}
                >
                  {(profile?.first_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.first_name
                    ? `${profile.first_name} ${profile.last_name ?? ""}`
                    : user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">{t("nav.profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders">{t("nav.orders")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites">{t("nav.favorites")}</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">{t("nav.admin")}</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void signOut().then(() => navigate({ to: "/", replace: true }));
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          )}
        </nav>
      </div>

      <div className="container-page pb-3 md:hidden">
        <form onSubmit={submitSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("search.placeholder")}
            className="h-10 rounded-full bg-surface pl-9"
          />
        </form>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const { t } = useI18n();
  const { count } = useCart();
  const { user } = useAuth();

  const items = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/products", label: t("nav.categories"), icon: Grid2x2 },
    { to: "/cart", label: t("nav.cart"), icon: ShoppingBag, badge: count },
    user
      ? { to: "/orders", label: t("nav.orders"), icon: Package }
      : { to: "/auth", label: t("nav.account"), icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
              className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
            >
              <item.icon className="size-5" />
              {item.label}
              {"badge" in item && item.badge ? (
                <span className="absolute right-1/4 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
