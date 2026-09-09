# Lakay Bazaar

MASTER PROMPT — PLATEFORME E-COMMERCE HAÏTI

Français 🇫🇷 + Kreyòl Ayisyen 🇭🇹

Paiements MonCash + NatCash via Bazik

Construis une plateforme e-commerce moderne, professionnelle, rapide et mobile-first destinée au marché haïtien.

L'application doit être disponible en Français et Kreyòl Ayisyen dès la première version.

Le système doit permettre à un administrateur d'ajouter manuellement des produits provenant de plateformes comme SHEIN, Temu ou autres boutiques en ligne, en utilisant simplement le lien du produit et en saisissant manuellement les informations commerciales.

Les clients doivent pouvoir consulter les produits, créer un compte, ajouter des articles au panier, passer une commande et payer avec MonCash ou NatCash via l'intégration Bazik.

1. OBJECTIF DE LA PLATEFORME

Créer une marketplace/e-commerce spécialisée pour les clients en Haïti.

Le modèle commercial est le suivant :

L'administrateur trouve un produit sur SHEIN, Temu ou une autre boutique.

Il copie le lien du produit.

Il ajoute le produit dans le panneau administrateur.

Il ajoute manuellement :

nom

photos

description

prix d'achat

prix de vente

frais de livraison

marge

catégorie

disponibilité

Le produit apparaît dans l'application.

Le client ajoute le produit au panier.

Le client passe commande.

Le client paie avec MonCash ou NatCash.

Bazik traite le paiement.

Le système confirme automatiquement le paiement.

La commande passe à l'état PAID.

L'administrateur traite l'achat et la livraison.

Le client peut suivre l'évolution de sa commande.

2. LANGUES

Créer un système i18n professionnel.

Langues obligatoires :

fr = Français
ht = Kreyòl Ayisyen


Le français doit être la langue par défaut.

Ajouter un sélecteur de langue :

🇫🇷 Français
🇭🇹 Kreyòl


Le choix de langue doit être sauvegardé dans le profil utilisateur et dans le stockage local.

Ne jamais mélanger les deux langues dans la même interface.

Toutes les pages, boutons, notifications, erreurs, emails et messages doivent être traduisibles.

Créer un fichier de traduction structuré :

/locales/fr.json
/locales/ht.json


Exemples :

{
  "home": "Accueil",
  "products": "Produits",
  "cart": "Panier",
  "checkout": "Commander",
  "login": "Connexion",
  "register": "Créer un compte",
  "orders": "Mes commandes"
}


Kreyòl :

{
  "home": "Akèy",
  "products": "Pwodwi",
  "cart": "Panyen",
  "checkout": "Pase kòmand",
  "login": "Konekte",
  "register": "Kreye yon kont",
  "orders": "Kòmand mwen yo"
}


3. DESIGN UI/UX

Créer une interface moderne inspirée des meilleurs e-commerces internationaux mais adaptée au marché haïtien.

Design :

mobile-first

moderne

premium

simple

rapide

responsive

cartes produits élégantes

navigation intuitive

boutons CTA visibles

excellente expérience mobile

Utiliser :

beaucoup d'espace blanc

coins légèrement arrondis

ombres discrètes

typographie moderne

icônes simples

animations légères

skeleton loading

feedback visuel après chaque action

Éviter une interface trop complexe.

4. APPLICATION CLIENT

Créer les pages suivantes :

Splash Screen

Afficher :

Logo
Nom de la plateforme
Chargement...


Puis redirection vers l'accueil.

5. ACCUEIL

Créer :

Header

Logo

Sélecteur Français/Kreyòl

Recherche

Icône panier

Compte utilisateur

Hero section :

Découvrez les meilleurs produits
Livrés directement en Haïti


Créer des catégories :

Mode

Chaussures

Beauté

Accessoires

Maison

Électronique

Enfants

Promotions

Afficher :

produits populaires

nouveautés

meilleures ventes

promotions

6. AUTHENTIFICATION

Créer :

Inscription

Champs :

Prénom
Nom
Téléphone
Email
Mot de passe
Confirmation du mot de passe


Le téléphone doit supporter les numéros haïtiens.

Bouton :

Créer mon compte


Connexion

Email ou téléphone
Mot de passe
Mot de passe oublié
Se connecter


Prévoir une architecture permettant d'ajouter ultérieurement OTP par SMS.

7. CATALOGUE

Créer une page produits avec :

recherche

filtres

catégories

prix minimum

prix maximum

disponibilité

tri

Tri :

Plus récent
Prix croissant
Prix décroissant
Plus populaire


Créer une grille responsive.

Mobile :

2 produits par ligne


Desktop :

4 à 5 produits par ligne


8. FICHE PRODUIT

Afficher :

galerie photos

nom

prix

ancien prix si promotion

description

catégorie

disponibilité

quantité

bouton Ajouter au panier

bouton Acheter maintenant

Si nécessaire :

couleur

taille

variante

quantité

Afficher également :

Livraison en Haïti
Paiement sécurisé
Commande suivie


9. AJOUT AU PANIER

Le panier doit permettre :

augmenter quantité

diminuer quantité

supprimer produit

voir sous-total

voir frais de livraison

voir total

Calcul :

Sous-total
+ Livraison
= Total


Tous les prix doivent être affichés en HTG / G.

10. CHECKOUT

Créer un checkout en plusieurs étapes.

Étape 1 — Informations client

Nom complet
Téléphone
Email
Adresse
Ville
Département
Point de livraison
Instructions


Étape 2 — Livraison

Options configurables par l'administrateur :

Livraison à domicile
Point relais
Retrait


Étape 3 — Paiement

Afficher :

Choisir votre méthode de paiement

○ MonCash
○ NatCash


11. INTÉGRATION BAZIK

IMPORTANT :

Utiliser Bazik comme couche de paiement pour les paiements MonCash et NatCash.

Ne jamais exposer les clés API Bazik dans le frontend.

Architecture :

Frontend
   ↓
Backend sécurisé
   ↓
Bazik API
   ↓
MonCash / NatCash


Les secrets doivent être uniquement dans les variables d'environnement :

BAZIK_API_KEY=
BAZIK_API_SECRET=
BAZIK_BASE_URL=
BAZIK_WEBHOOK_SECRET=


Ne jamais mettre ces valeurs dans le code frontend.

12. PAIEMENT MONCASH

Créer le flux :

Créer commande
↓
Créer référence de paiement
↓
Créer paiement Bazik
↓
Client effectue paiement MonCash
↓
Bazik confirme
↓
Webhook
↓
Vérifier transaction
↓
Commande PAID


Stocker :

payment_id
transaction_id
order_id
amount
currency
provider
status
created_at
updated_at


Provider :

MONCASH


13. PAIEMENT NATCASH

Même architecture :

Créer commande
↓
Créer paiement Bazik
↓
NatCash
↓
Confirmation Bazik
↓
Webhook
↓
Validation
↓
Commande PAID


Provider :

NATCASH


14. WEBHOOKS

Créer un endpoint sécurisé :

POST /api/payments/bazik/webhook


Le webhook doit :

recevoir la notification

vérifier la signature

vérifier le montant

vérifier la référence

vérifier le statut

empêcher les doublons

mettre à jour le paiement

mettre à jour la commande

Statuts paiement :

PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED


Ne jamais considérer une commande comme payée uniquement parce que le frontend affirme que le paiement a réussi.

La confirmation finale doit venir du backend/Bazik.

15. PRODUITS SHEIN / TEMU

Créer dans l'admin :

Ajouter un produit


Champs :

Nom du produit
Lien du produit
Source
Photos
Description
Catégorie
Prix d'achat
Frais supplémentaires
Prix de vente
Prix promotionnel
Stock
Poids
Frais de livraison
SKU
Statut


Source :

SHEIN
TEMU
AUTRE


Le lien doit être stocké :

source_url


Le système ne doit pas dépendre du scraping automatique.

L'administrateur contrôle manuellement :

Prix d'achat
Prix de vente
Photos
Description
Stock


Ajouter un bouton :

Voir le produit source


qui ouvre le lien externe dans un nouvel onglet.

16. CALCUL DE MARGE

Créer automatiquement :

Prix de vente
- Prix d'achat
- Frais
= Marge brute


Afficher uniquement à l'administrateur :

Prix achat : 18 USD
Frais : 7 USD
Prix vente : 35 USD
Marge : 10 USD


Le client ne doit jamais voir le prix d'achat réel.

17. ADMIN DASHBOARD

Créer un panneau administrateur professionnel.

Dashboard :

Chiffre d'affaires
Commandes
Commandes en attente
Commandes payées
Produits
Clients
Marge
Paiements MonCash
Paiements NatCash


Ajouter graphiques :

ventes par jour

ventes par semaine

ventes par mois

commandes

revenus

produits les plus vendus

18. GESTION DES PRODUITS ADMIN

CRUD complet :

Créer
Lire
Modifier
Supprimer
Activer
Désactiver


Tableau :

Image
Produit
Catégorie
Prix
Stock
Source
Statut
Actions


Actions :

Modifier
Dupliquer
Désactiver
Supprimer
Voir


19. GESTION DES COMMANDES

Créer une page :

Commandes


Filtres :

Toutes
En attente
Payées
En préparation
Achetées
En transit
Arrivées en Haïti
En livraison
Livrées
Annulées


Chaque commande doit avoir :

Numéro commande
Client
Téléphone
Montant
Paiement
Méthode paiement
Statut
Date


20. STATUT DE COMMANDE

Créer ces statuts :

PENDING_PAYMENT
PAID
PROCESSING
PURCHASED
IN_TRANSIT
ARRIVED_HAITI
OUT_FOR_DELIVERY
DELIVERED
CANCELLED


Créer une timeline pour le client :

✓ Commande créée
✓ Paiement confirmé
✓ Produit acheté
✓ Produit en transit
○ Arrivé en Haïti
○ En livraison
○ Livré


21. ESPACE CLIENT

Créer :

Mon profil
Mes commandes
Mes adresses
Mes paiements
Mes favoris
Notifications
Langue
Déconnexion


22. FAVORIS

Permettre au client de sauvegarder les produits.

Fonctions :

Ajouter aux favoris
Retirer des favoris
Voir mes favoris


23. NOTIFICATIONS

Préparer le système pour :

notification commande créée

paiement confirmé

commande achetée

commande expédiée

arrivée en Haïti

livraison

commande livrée

Architecture prête pour :

Push notifications
Email
WhatsApp
SMS


24. BASE DE DONNÉES

Utiliser PostgreSQL.

Créer au minimum les tables :

users
admins
products
categories
product_images
product_variants
cart_items
orders
order_items
payments
payment_transactions
addresses
favorites
notifications
order_status_history
audit_logs


25. USERS

Structure :

id
first_name
last_name
email
phone
password_hash
language
role
status
created_at
updated_at


Roles :

CUSTOMER
ADMIN
SUPER_ADMIN


Ne jamais stocker les mots de passe en clair.

Utiliser un hash sécurisé.

26. PRODUCTS

Structure :

id
name_fr
name_ht
description_fr
description_ht
source
source_url
purchase_price
selling_price
sale_price
shipping_cost
stock
sku
category_id
status
created_at
updated_at


27. ORDERS

Structure :

id
order_number
user_id
subtotal
shipping_cost
discount
total
currency
payment_status
order_status
shipping_address
created_at
updated_at


Currency :

HTG


28. SECURITY

Implémenter :

JWT ou session sécurisée

bcrypt/argon2

validation backend

rate limiting

CORS sécurisé

protection CSRF si nécessaire

validation des montants

validation des webhooks

idempotency keys

logs

audit logs

rôles et permissions

protection contre injection SQL

protection XSS

variables d'environnement

Important :

Les clés Bazik ne doivent jamais être accessibles au navigateur.

29. API BACKEND

Créer une API REST structurée.

Exemples :

POST /api/auth/register
POST /api/auth/login
GET /api/products
GET /api/products/:id
POST /api/cart
GET /api/cart
POST /api/orders
GET /api/orders
GET /api/orders/:id

POST /api/payments/create
GET /api/payments/:id
POST /api/payments/bazik/webhook


Admin :

GET /api/admin/dashboard
POST /api/admin/products
PUT /api/admin/products/:id
DELETE /api/admin/products/:id

GET /api/admin/orders
PUT /api/admin/orders/:id/status

GET /api/admin/customers


30. ADMIN — PRIX ET DEVISE

Le système doit permettre de configurer :

HTG
USD


Mais le prix présenté aux clients haïtiens doit être principalement en :

HTG / G


Créer dans l'admin une configuration :

Taux USD → HTG


Le taux doit être configurable manuellement.

Ne jamais hardcoder le taux de change.

31. LIVRAISON

Créer un module configurable.

Administrateur peut créer :

Zone
Ville
Département
Prix livraison
Délai estimé


Exemple :

Port-au-Prince
200 HTG

Cap-Haïtien
300 HTG

Autres villes
À configurer


Ne pas hardcoder ces valeurs : elles doivent être administrables.

32. RECHERCHE

Créer une recherche rapide.

Recherche par :

Nom
SKU
Catégorie


Prévoir une architecture permettant d'ajouter ultérieurement :

recherche intelligente
recherche par image
recommandations


33. SEO

Pour la version web :

URLs propres

meta title

meta description

Open Graph

sitemap

robots.txt

données structurées Product

données structurées Breadcrumb

pages indexables

Les pages produits doivent avoir des URLs du type :

/products/robe-elegante


34. RESPONSIVE

L'application doit fonctionner parfaitement sur :

iPhone
Android
Tablet
Desktop
Laptop


Priorité :

Mobile


35. PAGES À CRÉER

Créer au minimum :

/
 /login
 /register
 /products
 /products/:id
 /cart
 /checkout
 /payment/success
 /payment/failed
 /orders
 /orders/:id
 /profile
 /favorites
 /admin
 /admin/products
 /admin/products/new
 /admin/products/:id/edit
 /admin/orders
 /admin/orders/:id
 /admin/customers
 /admin/payments
 /admin/categories
 /admin/settings


36. ARCHITECTURE TECHNIQUE

Frontend :

React / Next.js
TypeScript
Tailwind CSS


Backend :

Node.js
TypeScript
Express


Database :

PostgreSQL


ORM :

Prisma


Authentification :

JWT ou système de session sécurisé


Storage images :

Préparer une abstraction permettant d'utiliser :

Supabase Storage
Cloudinary
S3


37. STRUCTURE DU PROJET

Utiliser une architecture propre :

src/
  components/
  pages/
  layouts/
  hooks/
  services/
  api/
  i18n/
  types/
  utils/

server/
  controllers/
  routes/
  services/
  middleware/
  validators/
  integrations/
    bazik/
  database/
  utils/


Créer une couche :

BazikService


pour isoler l'intégration Bazik du reste de l'application.

38. BAZIK SERVICE

Créer une abstraction :

createPayment()
getPaymentStatus()
verifyPayment()
handleWebhook()
refundPayment()


Ne pas mélanger la logique Bazik directement dans les composants frontend.

39. PAIEMENT IDEMPOTENT

Une même notification Bazik peut potentiellement être reçue plusieurs fois.

Le système doit empêcher :

paiement double
commande double
stock déduit deux fois


Utiliser :

transaction_id
reference_id
idempotency_key


40. STOCK

Lorsqu'une commande est payée :

réserver le stock


Éviter les ventes simultanées dépassant le stock disponible.

Prévoir :

stock
reserved_stock
available_stock


41. PANIER

Le panier doit fonctionner :

Utilisateur connecté

Stockage en base de données.

Visiteur

Stockage temporaire local.

Lors de la connexion :

fusionner panier invité + panier utilisateur


42. ADMIN SETTINGS

Créer :

Nom de la boutique
Logo
Email
Téléphone
WhatsApp
Adresse
Devise
Taux USD/HTG
Frais de livraison
MonCash
NatCash
Bazik
Notifications
Langues


43. AUDIT LOG

Pour les actions sensibles de l'administration :

Création produit
Modification prix
Suppression produit
Modification commande
Modification statut paiement
Modification configuration Bazik


Stocker :

admin_id
action
entity
entity_id
old_value
new_value
ip
created_at


44. ERREURS

Créer des messages professionnels en français et Kreyòl.

Exemple français :

Le paiement n'a pas pu être confirmé.
Veuillez réessayer.


Kreyòl :

Nou pa kapab konfime peman an.
Tanpri eseye ankò.


Ne jamais afficher les erreurs techniques ou les secrets API au client.

45. DASHBOARD CLIENT

Afficher :

Bonjour, [Prénom]

Commande récente
Statut
Montant
Date


CTA :

Voir ma commande
Continuer mes achats


46. CHECKOUT UX

Le checkout doit être très simple.

Afficher clairement :

Produit
Quantité
Prix
Livraison
Total


Puis :

MonCash
NatCash


Après paiement :

Paiement confirmé ✓

Votre commande #LR-XXXX a été confirmée.

Merci pour votre commande.


47. NUMÉRO DE COMMANDE

Créer automatiquement un numéro unique :

LR-20260907-000001


Format configurable.

48. PERFORMANCE

Optimiser :

images WebP/AVIF

lazy loading

pagination

caching

database indexes

API pagination

code splitting

skeleton loaders

Objectif :

chargement rapide
mobile 4G


49. RESPONSIBILITÉ DU SYSTÈME

Le frontend ne doit jamais décider :

paiement réussi
montant payé
commande payée


Toutes ces informations doivent être validées côté backend.

Le prix envoyé depuis le frontend doit être recalculé côté serveur à partir des données de la base.

Exemple :

Frontend total = 3500 HTG
Backend total calculé = 3500 HTG

→ autoriser paiement


Si différent :

→ refuser


50. ADMIN LOGIN

Créer une interface d'administration séparée :

/admin/login


Ne jamais utiliser simplement un champ frontend :

isAdmin = true


Les permissions doivent être vérifiées côté backend.

51. SEED DATA

Créer des données de démonstration :

Catégories :

Mode
Chaussures
Beauté
Accessoires
Maison
Électronique
Enfants
Promotions


Créer quelques produits fictifs pour tester l'interface.

Ne pas utiliser de véritables données SHEIN/Temu sans autorisation.

52. ENVIRONMENT VARIABLES

Créer :

DATABASE_URL=
JWT_SECRET=

BAZIK_BASE_URL=
BAZIK_API_KEY=
BAZIK_API_SECRET=
BAZIK_WEBHOOK_SECRET=

STORAGE_URL=
STORAGE_KEY=

NEXT_PUBLIC_APP_URL=


Créer :

.env.example


Ne jamais commit les secrets.

53. TESTS

Créer des tests pour :

Auth

register
login
invalid password


Produits

create
update
delete


Commandes

create order
calculate total


Paiements

create MonCash payment
create NatCash payment
webhook success
webhook failure
duplicate webhook
wrong amount


54. LOGIQUE DE PAIEMENT

Créer ce flux exact :

CLIENT
↓
Checkout
↓
Backend crée Order
↓
Order = PENDING_PAYMENT
↓
Backend calcule le montant
↓
Backend crée paiement Bazik
↓
MonCash/NatCash
↓
Bazik traite
↓
Webhook Bazik
↓
Backend vérifie webhook
↓
Payment = PAID
↓
Order = PAID
↓
Notification client
↓
Admin reçoit commande


55. NE PAS FAIRE

Ne pas :

mettre les API keys dans React

faire confiance au prix envoyé par le client

considérer une redirection frontend comme preuve de paiement

stocker les mots de passe en clair

hardcoder les prix

hardcoder les frais de livraison

hardcoder les taux de change

dépendre obligatoirement du scraping SHEIN/Temu

créer de faux paiements

afficher les données internes de l'administrateur au client

56. FUTURES EXTENSIONS

Préparer l'architecture pour ajouter ultérieurement :

WhatsApp
SMS
Email
Push notifications
n8n
Coupons
Promotions
Referral
Affiliate
Wallet
Points fidélité
Avis clients
Chat support
Livraison GPS
Multi-vendeurs
Marketplace
Application mobile native


57. IMPORTANT — BAZIK

Ne pas inventer les endpoints de Bazik.

Créer une couche d'intégration configurable.

Si les credentials/API documentation ne sont pas encore disponibles dans l'environnement, construire :

BazikService
BazikController
BazikWebhookController


avec des variables d'environnement et des TODO clairement identifiés pour les endpoints exacts.

Utiliser uniquement les endpoints officiellement fournis par Bazik.

58. LIVRABLE FINAL

Je veux une application fonctionnelle, pas seulement une maquette.

Construire :

Frontend
Backend
Database
Authentication
Admin
Products
Cart
Checkout
Orders
Payments
Bazik integration layer
MonCash
NatCash
Bilingual system
French
Kreyòl
Responsive design
Security
Tests


Créer également :

README.md
.env.example
Database schema
API documentation
Setup instructions
Deployment instructions


59. PRIORITÉ DE DÉVELOPPEMENT

Développer dans cet ordre :

Phase 1

Architecture
Database
Authentication
i18n


Phase 2

Products
Categories
Catalog
Product details
Cart


Phase 3

Checkout
Orders
Delivery


Phase 4

Bazik
MonCash
NatCash
Webhook
Payment verification


Phase 5

Admin
Dashboard
Analytics


Phase 6

Security
Tests
Performance
Deployment


60. RÉSULTAT ATTENDU

À la fin, l'utilisateur doit pouvoir :

Créer son compte
↓
Choisir Français ou Kreyòl
↓
Parcourir les produits
↓
Choisir un produit
↓
Ajouter au panier
↓
Passer commande
↓
Choisir MonCash ou NatCash
↓
Payer via Bazik
↓
Recevoir confirmation
↓
Suivre sa commande


L'administrateur doit pouvoir :

Se connecter
↓
Ajouter un produit SHEIN/Temu
↓
Mettre les photos
↓
Mettre le prix manuellement
↓
Publier le produit
↓
Recevoir la commande
↓
Voir le paiement
↓
Confirmer le traitement
↓
Changer le statut
↓
Suivre les ventes et marges


Construire le projet avec une architecture professionnelle, scalable et maintenable.

Ne pas produire uniquement une landing page. Construire le véritable système e-commerce avec frontend, backend, base de données, authentification, administration, commandes et architecture de paiement Bazik.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://haiti-market-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77f99939-b7be-49f7-b3b6-25711475e711).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
