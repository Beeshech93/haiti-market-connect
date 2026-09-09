import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion & inscription — Achte La" },
      {
        name: "description",
        content: "Créez votre compte Achte La pour commander et suivre vos livraisons en Haïti.",
      },
      { property: "og:title", content: "Connexion — Achte La" },
      { property: "og:description", content: "Konekte oswa kreye kont ou sou Achte La." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6).max(72);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+509)?[\s-]?[2-4]\d{3}[\s-]?\d{4}$/, "phone");

function AuthPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });

  useEffect(() => {
    if (user) void navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const email = emailSchema.safeParse(form.email);
        if (!email.success || !form.password) {
          toast.error(t("error.requiredFields"));
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.data,
          password: form.password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(t("auth.loggedIn"));
        void navigate({ to: "/", replace: true });
        return;
      }

      const email = emailSchema.safeParse(form.email);
      const password = passwordSchema.safeParse(form.password);
      const phone = phoneSchema.safeParse(form.phone);
      if (!form.firstName || !form.lastName || !email.success || !password.success || !phone.success) {
        toast.error(t("error.requiredFields"));
        return;
      }
      if (form.password !== form.confirm) {
        toast.error(t("error.passwordMismatch"));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.data,
        password: password.data,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone: phone.data,
            language: lang,
          },
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        toast.success(t("auth.loggedIn"));
        void navigate({ to: "/", replace: true });
      } else {
        toast.success(t("auth.checkEmail"));
        setMode("login");
      }
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const email = emailSchema.safeParse(form.email);
    if (!email.success) {
      toast.error(t("error.requiredFields"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.resetSent"));
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="container-page flex items-center justify-between py-4">
        <Logo />
        <LanguageSwitcher />
      </div>

      <div className="container-page flex flex-1 items-start justify-center pb-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-float">
          <h1 className="text-xl font-extrabold">
            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </h1>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "register" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                  <Input id="firstName" value={form.firstName} onChange={set("firstName")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                  <Input id="lastName" value={form.lastName} onChange={set("lastName")} required />
                </div>
              </div>
            ) : null}

            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+509 3812 3456"
                  value={form.phone}
                  onChange={set("phone")}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>

            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  required
                />
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="w-full rounded-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
            >
              {mode === "login" ? t("auth.login") : t("auth.register")}
            </Button>
          </form>

          {mode === "login" ? (
            <button
              type="button"
              onClick={() => void resetPassword()}
              className="mt-3 text-sm text-muted-foreground hover:text-primary"
            >
              {t("auth.forgot")}
            </button>
          ) : null}

          <p className="mt-5 text-sm text-muted-foreground">
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-accent hover:underline"
            >
              {mode === "login" ? t("nav.register") : t("nav.login")}
            </button>
          </p>

          <Link to="/" className="mt-4 block text-sm text-muted-foreground hover:text-primary">
            ← {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
