import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions générales — Achte La" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation d'Achte La : prix en Gourdes, paiement MonCash/NatCash, livraison en Haïti, annulations et responsabilités.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Conditions générales — Achte La" },
      {
        property: "og:description",
        content:
          "Conditions d'utilisation de la boutique Achte La : prix, paiements, livraisons et retours.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const UPDATED = { fr: "20 septembre 2026", ht: "20 septanm 2026" };

type Section = { title: string; body: string[] };

const sectionsFr: Section[] = [
  {
    title: "1. Objet",
    body: [
      "Achte La (achtela.store) est une boutique en ligne qui revend en Haïti des produits provenant de boutiques internationales telles que SHEIN et Temu. En utilisant le site, vous acceptez les présentes conditions générales.",
    ],
  },
  {
    title: "2. Prix",
    body: [
      "Tous les prix sont affichés en Gourdes haïtiennes (HTG). Les prix peuvent changer sans préavis ; le prix applicable est celui affiché au moment de la confirmation de votre commande.",
    ],
  },
  {
    title: "3. Paiement",
    body: [
      "Les paiements sont traités via MonCash et NatCash par l'intermédiaire de la passerelle sécurisée Bazik. À l'heure actuelle, seul MonCash est disponible pour les encaissements ; NatCash sera activé ultérieurement.",
      "Une commande n'est confirmée qu'après vérification du paiement auprès de Bazik.",
    ],
  },
  {
    title: "4. Livraison",
    body: [
      "Les zones, frais et délais de livraison dépendent de la zone choisie lors du passage de la commande ; ils sont affichés clairement à cette étape avant le paiement.",
      "Les délais indiqués sont des estimations et peuvent varier en fonction des contraintes logistiques internationales et locales.",
    ],
  },
  {
    title: "5. Annulation et retour",
    body: [
      "Vous pouvez annuler votre commande et obtenir un remboursement intégral tant qu'elle n'a pas été marquée « En traitement » (PROCESSING).",
      "Une fois le produit acheté en votre nom auprès de SHEIN/Temu, le remboursement n'est pas garanti, sauf en cas de produit défectueux, non conforme ou non livré — dans ces cas, contactez-nous à support@achtela.store et nous étudierons votre dossier au cas par cas.",
    ],
  },
  {
    title: "6. Responsabilités du client",
    body: [
      "Vous êtes responsable de fournir une adresse de livraison et des coordonnées (téléphone, e-mail) exactes et à jour. Achte La ne peut être tenu responsable des retards ou pertes causés par des informations incorrectes.",
    ],
  },
  {
    title: "7. Propriété intellectuelle et utilisation du site",
    body: [
      "Le contenu du site (logo, textes, présentation) appartient à Achte La. Toute reproduction ou utilisation commerciale sans autorisation écrite est interdite. Le site est destiné à un usage personnel et licite.",
    ],
  },
  {
    title: "8. Droit applicable",
    body: [
      "Les présentes conditions sont régies par le droit haïtien. Tout litige relève des juridictions compétentes d'Haïti.",
    ],
  },
];

const sectionsHt: Section[] = [
  {
    title: "1. Sa sèvis la ye",
    body: [
      "Achte La (achtela.store) se yon boutik sou entènèt ki revann ann Ayiti pwodwi ki soti nan boutik entènasyonal tankou SHEIN ak Temu. Lè w itilize sit la, ou dakò ak kondisyon jeneral sa yo.",
    ],
  },
  {
    title: "2. Pri yo",
    body: [
      "Tout pri yo afiche an Goud ayisyen (HTG). Pri yo ka sanble san avètisman ; pri ki valab se sa ki afiche lè w konfime kòmand ou.",
    ],
  },
  {
    title: "3. Peman",
    body: [
      "Peman yo fèt atravè MonCash ak NatCash pa entèmedyè pòtay sekirize Bazik. Pou kounye a, se MonCash sèlman ki disponib pou peye ; NatCash ap aktive pita.",
      "Yon kòmand konfime sèlman apre nou verifye peman an ak Bazik.",
    ],
  },
  {
    title: "4. Livrezon",
    body: [
      "Zòn, fre ak dat livrezon yo depann de zòn ou chwazi lè w ap pase kòmand lan ; yo afiche kle sou etap sa a anvan ou peye.",
      "Dat yo endike se estimasyon ; yo ka chanje selon difikilte lojistik entènasyonal ak lokal.",
    ],
  },
  {
    title: "5. Anilasyon ak retou",
    body: [
      "Ou ka anile kòmand ou epi jwenn ranbousman konplè toutotan li poko make « Nan tretman » (PROCESSING).",
      "Yon fwa pwodwi a achte nan non ou kay SHEIN/Temu, ranbousman pa garanti, sof si pwodwi a gen defo, pa koresponn ak sa w te mande a, oswa li pa janm livre — nan ka sa yo, ekri nou nan support@achtela.store epi n ap etidye dosye w ka pa ka.",
    ],
  },
  {
    title: "6. Responsablite kliyan an",
    body: [
      "Se responsablite pa w pou w bay yon adrès livrezon ak kowòdone (telefòn, imèl) ki kòrèk epi ajou. Achte La pa ka responsab reta oswa pèt ki soti nan move enfòmasyon ou bay.",
    ],
  },
  {
    title: "7. Pwopriyete entelektyèl ak itilizasyon sit la",
    body: [
      "Kontni sit la (logo, tèks, prezantasyon) se pwopriyete Achte La. Okenn repwodiksyon oswa itilizasyon komèsyal san otorizasyon alekri entèdi. Sit la fèt pou itilizasyon pèsonèl e legal.",
    ],
  },
  {
    title: "8. Lwa ki aplikab",
    body: [
      "Kondisyon sa yo dirije pa lwa ayisyen. Nenpòt litij se pou tribinal konpetan Ayiti yo.",
    ],
  },
];

function TermsPage() {
  const { lang } = useI18n();
  const isHt = lang === "ht";
  const sections = isHt ? sectionsHt : sectionsFr;

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isHt ? "Kondisyon Jeneral" : "Conditions générales"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isHt ? "Dènye mizajou" : "Dernière mise à jour"} : {UPDATED[isHt ? "ht" : "fr"]}
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.body.map((p) => (
            <p key={p.slice(0, 40)} className="text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
