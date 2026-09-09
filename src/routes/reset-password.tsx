import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Achte La" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte Achte La." },
      { property: "og:title", content: "Nouveau mot de passe — Achte La" },
      { property: "og:description", content: "Mete yon nouvo modpas pou kont Achte La ou." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error(t("error.requiredFields"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("error.passwordMismatch"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("common.save"));
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface px-4">
      <div className="py-6">
        <Logo />
      </div>
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 shadow-float"
      >
        <h1 className="text-xl font-extrabold">{t("auth.password")}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full rounded-full">
          {t("common.save")}
        </Button>
      </form>
    </div>
  );
}
