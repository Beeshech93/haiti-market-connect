import { createFileRoute } from "@tanstack/react-router";
import { Apple, Check, Download, Share2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Installer l'application — Achte La" },
      {
        name: "description",
        content:
          "Installez Achte La sur votre téléphone directement depuis votre navigateur, sans App Store ni Play Store.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Installer l'application — Achte La" },
      {
        property: "og:description",
        content: "Ajoutez Achte La à votre écran d'accueil en quelques secondes.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstallPage,
});

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const content = {
  fr: {
    title: "Installer l'application Achte La",
    intro:
      "Achte La s'installe directement depuis votre navigateur, sans App Store ni Play Store et sans rien télécharger. L'icône apparaît sur votre écran d'accueil comme une vraie application.",
    installNow: "Installer maintenant",
    installed: "Installation lancée",
    iphone: "iPhone / iPad (Safari)",
    iphoneSteps: [
      "Ouvrez achtela.store dans Safari.",
      "Touchez le bouton Partager (le carré avec une flèche vers le haut).",
      "Faites défiler et choisissez « Sur l'écran d'accueil ».",
      "Touchez « Ajouter » : l'icône Achte La apparaît sur votre écran d'accueil.",
    ],
    android: "Android (Chrome)",
    androidSteps: [
      "Ouvrez achtela.store dans Chrome.",
      "Touchez le menu ⋮ en haut à droite.",
      "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
      "Confirmez : l'application est installée.",
    ],
    note: "Aucune boutique d'applications n'est nécessaire. L'application reste toujours à jour automatiquement.",
  },
  ht: {
    title: "Enstale aplikasyon Achte La",
    intro:
      "Achte La enstale dirèkteman depi navigatè w, san App Store ni Play Store epi san w telechaje anyen. Ikòn nan ap parèt sou ekran dakèy telefòn ou tankou yon vrè aplikasyon.",
    installNow: "Enstale kounye a",
    installed: "Enstalasyon kòmanse",
    iphone: "iPhone / iPad (Safari)",
    iphoneSteps: [
      "Louvri achtela.store nan Safari.",
      "Peze bouton Pataje (kare ak flèch anlè a).",
      "Desann epi chwazi « Add to Home Screen » (Sou ekran dakèy).",
      "Peze « Add » : ikòn Achte La ap parèt sou ekran dakèy ou.",
    ],
    android: "Android (Chrome)",
    androidSteps: [
      "Louvri achtela.store nan Chrome.",
      "Peze meni ⋮ anwo adwat.",
      "Chwazi « Install app » oswa « Add to Home screen ».",
      "Konfime : aplikasyon an enstale.",
    ],
    note: "Ou pa bezwen okenn magazen aplikasyon. Aplikasyon an ap toujou ajou otomatikman.",
  },
};

function InstallPage() {
  const { locale } = useI18n();
  const copy = content[locale === "ht" ? "ht" : "fr"];
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container-page flex-1 py-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <header className="space-y-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.intro}</p>
          </header>

          {promptEvent ? (
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                void promptEvent.prompt();
                setPromptEvent(null);
                setDone(true);
              }}
            >
              <Download className="mr-2 size-4" />
              {copy.installNow}
            </Button>
          ) : done ? (
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="size-4" /> {copy.installed}
            </p>
          ) : null}

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Apple className="size-4 text-primary" /> {copy.iphone}
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {copy.iphoneSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    {index === 1 ? <Share2 className="size-4 shrink-0 text-accent" /> : null}
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Smartphone className="size-4 text-primary" /> {copy.android}
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {copy.androidSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <p className="text-xs text-muted-foreground">{copy.note}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
