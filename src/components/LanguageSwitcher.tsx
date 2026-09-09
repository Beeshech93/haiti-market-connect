import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Lang } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const options: { value: Lang; label: string; flag: string }[] = [
  { value: "fr", label: "FR", flag: "🇫🇷" },
  { value: "ht", label: "HT", flag: "🇭🇹" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();

  const select = async (next: Lang) => {
    setLang(next);
    if (user) {
      await supabase.from("profiles").update({ language: next }).eq("id", user.id);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full bg-secondary p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label="Langue"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => void select(option.value)}
          aria-pressed={lang === option.value}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
            lang === option.value
              ? "bg-primary text-primary-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span aria-hidden>{option.flag}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
