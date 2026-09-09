import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — Achte La" },
      { name: "description", content: "Gérez vos informations personnelles et votre langue sur Achte La." },
      { property: "og:title", content: "Mon profil — Achte La" },
      { property: "og:description", content: "Jere enfòmasyon ou ak lang ou sou Achte La." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const { user, profile, signOut } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  if (!user) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("auth.mustLogin")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">{t("nav.login")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    toast[error ? "error" : "success"](error ? t("error.generic") : t("common.save"));
  };

  return (
    <ShopLayout>
      <div className="container-page max-w-2xl py-6">
        <h1 className="text-2xl font-extrabold">{t("nav.profile")}</h1>

        <form
          onSubmit={save}
          className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{t("auth.firstName")}</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{t("auth.lastName")}</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("auth.phone")}</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input value={user.email ?? ""} disabled />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>{t("lang.label")}</Label>
            <LanguageSwitcher />
          </div>
          <Button type="submit" disabled={busy} className="rounded-full">
            {t("common.save")}
          </Button>
        </form>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/orders">{t("nav.orders")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/favorites">{t("nav.favorites")}</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          className="mt-5 text-accent"
          onClick={() => void signOut()}
        >
          {t("nav.logout")}
        </Button>
      </div>
    </ShopLayout>
  );
}
