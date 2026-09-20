import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Achte La" },
      {
        name: "description",
        content:
          "Politique de confidentialité d'Achte La : données collectées, utilisation, paiements MonCash/NatCash, sécurité et droits des clients.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Politique de confidentialité — Achte La" },
      {
        property: "og:description",
        content:
          "Comment Achte La collecte, utilise et protège vos données personnelles.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = { fr: "20 septembre 2026", ht: "20 septanm 2026" };

type Section = { title: string; body: string[] };

const sectionsFr: Section[] = [
  {
    title: "1. Données que nous collectons",
    body: [
      "Lorsque vous créez un compte ou passez une commande, nous collectons : votre nom et prénom, votre adresse e-mail, votre numéro de téléphone, votre adresse de livraison (adresse, ville, département, zone), ainsi que votre historique de commandes et vos favoris.",
      "L'inscription et la gestion du compte sont assurées par notre système d'authentification sécurisé.",
    ],
  },
  {
    title: "2. Utilisation de vos données",
    body: [
      "Vos données servent exclusivement à : traiter et livrer vos commandes, calculer les frais de livraison selon votre zone, traiter vos paiements via MonCash/NatCash par l'intermédiaire de la passerelle de paiement Bazik, et vous notifier du statut de vos commandes.",
    ],
  },
  {
    title: "3. Partage des données",
    body: [
      "Vos données ne sont partagées qu'avec : Bazik, la passerelle qui traite vos paiements MonCash/NatCash, et notre fournisseur d'infrastructure (base de données et authentification hébergées de manière sécurisée).",
      "Nous ne vendons ni ne partageons jamais vos données personnelles avec des tiers à des fins publicitaires.",
    ],
  },
  {
    title: "4. Sécurité",
    body: [
      "L'accès aux données est protégé par des contrôles d'accès stricts au niveau de la base de données : chaque utilisateur ne peut voir que ses propres informations.",
      "Le paiement est intégralement traité par Bazik : Achte La ne stocke jamais les données complètes de vos cartes bancaires ni les identifiants de votre compte MonCash.",
    ],
  },
  {
    title: "5. Vos droits",
    body: [
      "Vous pouvez consulter, corriger ou supprimer vos données personnelles, ainsi que fermer votre compte, en nous écrivant à support@achtela.store. Nous traitons chaque demande dans les meilleurs délais.",
    ],
  },
  {
    title: "6. Cookies et stockage local",
    body: [
      "Nous utilisons le stockage local de votre navigateur pour conserver votre panier en tant qu'invité et vos préférences (langue), ainsi que des cookies de session nécessaires à l'authentification. Aucun cookie publicitaire n'est utilisé.",
    ],
  },
];

const sectionsHt: Section[] = [
  {
    title: "1. Ki done nou ranmase",
    body: [
      "Lè w kreye yon kont oswa pase yon kòmand, nou ranmase : non w ak prenon w, adrès imèl ou, nimewo telefòn ou, adrès livrezon ou (adrès, vil, depatman, zòn), ansanm ak lis kòmand ou te fè yo ak pwodwi w pi renmen yo.",
      "Enskripsyon ak jesyon kont lan fèt pa yon sistèm otantifikasyon sekirize.",
    ],
  },
  {
    title: "2. Ki jan nou itilize done yo",
    body: [
      "Done ou yo sèvi sèlman pou : trete ak livre kòmand ou yo, kalkile fre livrezon selon zòn ou an, trete peman ou yo atravè MonCash/NatCash pa entèmedyè pòtay peman Bazik, epi avèti w sou estati kòmand ou yo.",
    ],
  },
  {
    title: "3. Pataj done yo",
    body: [
      "Nou pataje done ou sèlman ak : Bazik, pòtay ki trete peman MonCash/NatCash ou yo, ak founisè enfrastrikti nou an (baz done ak otantifikasyon ki òstbike san danje).",
      "Nou pa janm vann ni pataje done pèsonèl ou ak lòt moun pou piblisite.",
    ],
  },
  {
    title: "4. Sekirite",
    body: [
      "Aksè a done yo pwoteje pa kontwòl aksè sèvèk nan baz done a : chak itilizatè ka wè sèlman enfòmasyon pa li.",
      "Bazik trete peman an antyèman : Achte La pa janm estoke done konplè kat labank ou yo ni idantifyan kont MonCash ou.",
    ],
  },
  {
    title: "5. Dwa ou yo",
    body: [
      "Ou ka gade, korije oswa efase done pèsonèl ou yo, epi fèmen kont ou, lè w ekri nou nan support@achtela.store. N ap trete chak demann pi vit posib.",
    ],
  },
  {
    title: "6. Cookies ak depo lokal",
    body: [
      "Nou itilize depo lokal nan navigatè w pou kenbe panyen ou kòm envite ak preferans ou yo (lang), ansanm ak cookies sesyon ki nesesè pou otantifikasyon. Nou pa itilize okenn cookie piblisite.",
    ],
  },
];

function PrivacyPage() {
  const { lang } = useI18n();
  const isHt = lang === "ht";
  const sections = isHt ? sectionsHt : sectionsFr;

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isHt ? "Politik Konfidansyalite" : "Politique de confidentialité"}
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
