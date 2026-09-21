import { Link } from "@tanstack/react-router";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";

const STORAGE_KEY = "achtela.installBanner.dismissed";

export function InstallBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg md:hidden">
      <Download className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t("install.bannerTitle")}</p>
        <Link to="/install" className="text-xs font-medium text-primary underline">
          {t("install.bannerCta")}
        </Link>
      </div>
      <button
        type="button"
        aria-label={t("install.bannerClose")}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
