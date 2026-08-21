# PharmaRoute FX

Outil d'optimisation de tournées de livraison de médicaments (VRPTW) pour
grossistes-répartiteurs en Belgique.

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + **Lucide React** + composants UI type Shadcn (Radix UI)
- **Prisma ORM** + **SQLite** (développement local)
- **Leaflet.js** (`react-leaflet`) pour la cartographie
- **Auth.js (NextAuth v5)** — authentification par identifiants + rôles
- Solver VRPTW interchangeable : simulation interne par défaut, ou trajets
  routiers réels via **OpenRouteService**, **VROOM**, ou **Google Route
  Optimization API** (clé/configuration dans `.env`)

## Démarrage

```bash
cp .env.example .env
npm install              # génère aussi le client Prisma (postinstall)
npm run db:migrate        # crée prisma/dev.db et applique le schéma
npm run db:seed           # dépôt + pharmacies + comptes de démonstration
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) — vous serez redirigé
vers `/login`.

### Comptes de démonstration (créés par `npm run db:seed`)

| Rôle       | Email                        | Mot de passe    | Accès                                   |
| ---------- | ----------------------------- | ---------------- | ---------------------------------------- |
| Dispatcher | `dispatcher@pharmaroute.be`  | `dispatcher123`  | Tout : dépôt, pharmacies, optimisation, résultats, assignation chauffeurs |
| Chauffeur  | `chauffeur@pharmaroute.be`   | `chauffeur123`   | Uniquement `/my-routes` et ses feuilles de route assignées |

## Scripts utiles

| Commande            | Description                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`         | Serveur de développement                          |
| `npm run build`       | Build de production                               |
| `npm run start`       | Lance le build de production                      |
| `npm run db:migrate`  | Applique les migrations Prisma (SQLite)           |
| `npm run db:seed`     | Insère dépôt, pharmacies et comptes de démonstration |
| `npm run db:studio`   | Ouvre Prisma Studio (explorateur de données)      |

## Écrans

1. **Dépôt & Pharmacies** (`/`) — gestion du dépôt central, import CSV/Excel
   des pharmacies clientes (code APB, adresse belge, fenêtres horaires,
   bacs), liste avec recherche/édition/suppression. *Dispatcher uniquement.*
2. **Optimisation** (`/optimize`) — formulaire de lancement (véhicules, heure
   de départ, choix du solver VRPTW). *Dispatcher uniquement.*
3. **Résultats** (`/results`, `/results/[id]`) — vue split-screen : tournées
   avec ETA/respect de créneau à gauche, carte Leaflet à droite ; assignation
   d'un chauffeur par tournée. *Dispatcher uniquement.*
4. **Feuille de route chauffeur** (`/driver-sheet/[routeId]`) — case à cocher
   par livraison, compteur de bacs vides récupérés, impression/export PDF.
   *Dispatcher (n'importe laquelle) ou chauffeur assigné à cette tournée.*
5. **Mes tournées** (`/my-routes`) — accueil du chauffeur : liste de ses
   tournées assignées. *Chauffeur uniquement.*

## Authentification & rôles

Auth.js v5 (Credentials + JWT, pas de base de données côté session). Le
middleware (`src/middleware.ts` + `src/auth.config.ts`) protège chaque page
et route API par rôle :

- **DISPATCHER** : accès complet (import, dépôt, optimisation, résultats,
  assignation des chauffeurs).
- **DRIVER** (chauffeur) : uniquement `/my-routes` et la feuille de route
  d'une tournée qui lui est assignée (`route.driverId`) — toute autre page
  ou tentative d'accès à une tournée non assignée redirige vers `/my-routes`.
  Un appel direct à une route API réservée au dispatcher renvoie 403.

Pour assigner un chauffeur à une tournée : ouvrez `/results/[id]` (en tant
que dispatcher) et choisissez son nom dans le sélecteur "Chauffeur" de
chaque carte de tournée.

## Modèle de données (Prisma)

- `User` — compte (email + mot de passe hashé bcrypt), rôle `DISPATCHER` ou
  `DRIVER`.
- `Depot` — point de départ/retour des tournées.
- `Pharmacy` — client de livraison : code APB, adresse belge (CP à 4
  chiffres), fenêtre horaire (`timeWindowStart`/`timeWindowEnd`), nombre de
  bacs, temps de déchargement fixe (`serviceTimeMinutes`, 5 min par défaut).
- `Optimization` / `Route` / `RouteStop` — résultat d'un calcul VRPTW : une
  optimisation regroupe plusieurs tournées (véhicules, éventuellement
  assignées à un `User` chauffeur), chacune composée d'arrêts ordonnés avec
  ETA calculée, indicateur de respect de créneau, et suivi terrain
  (`completed`, `emptyBacsRetrieved`).

## Import CSV/Excel des pharmacies

Le formulaire d'import (`/`) accepte `.csv`, `.xlsx`, `.xls`. Les en-têtes de
colonnes sont reconnus de façon flexible (accents/majuscules ignorés, alias
français courants : `Code APB`, `Nom`, `Adresse`, `CP`, `Ville`,
`Heure Debut`, `Heure Fin`, `Nombre de bacs`…). Un modèle CSV téléchargeable
est disponible dans l'écran d'import. Chaque ligne est validée individuellement
(code postal belge à 4 chiffres, horaires `HH:mm`, cohérence début < fin) et
un ré-import met à jour les pharmacies existantes (upsert par code APB) au
lieu de créer des doublons.

## Solver VRPTW — simulation interne vs trajets routiers réels

L'écran Optimisation propose trois moteurs ; celui sélectionné est mémorisé
sur chaque `Optimization` (badge visible sur l'écran Résultats).

Avec OpenRouteService ou VROOM, le **tracé réel** de chaque tournée (suit le
réseau routier, via l'API Directions d'OpenRouteService ou la géométrie
renvoyée par VROOM/Google) est affiché sur la carte — trait plein. Sans
tracé réel disponible (simulation interne, ou récupération de géométrie
échouée), la carte affiche un trait **en pointillés** reliant directement
dépôt → arrêts → dépôt, pour bien distinguer une approximation d'un vrai
itinéraire.

| Fournisseur | Variable(s) `.env` | Comportement |
| --- | --- | --- |
| **Simulation interne** | *(aucune)* | Toujours disponible. Distance à vol d'oiseau × facteur de circuité (1,3) + vitesse moyenne simulée (28 km/h), puis heuristique balayage + plus proche voisin + 2-opt. |
| **OpenRouteService / VROOM** | `VROOM_API_URL` **ou** `ORS_API_KEY` | Si `VROOM_API_URL` est défini, VROOM résout lui-même le VRPTW complet à partir des coordonnées (fenêtres horaires strictes : un arrêt infaisable est renvoyé "non assigné" plutôt que planifié en retard). Sinon, avec `ORS_API_KEY`, une matrice de distances/durées réelles est récupérée auprès d'OpenRouteService puis combinée à notre heuristique interne. |
| **Google Route Optimization** | `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_CLOUD_PROJECT_ID` | Authentification OAuth2 par compte de service (JWT Bearer, signé en interne via `node:crypto`, sans dépendance externe), puis appel à l'API `optimizeTours` (Cloud Fleet Routing). |

Si le fournisseur choisi n'est pas configuré, le bouton de lancement reste
désactivé (badge "Non configuré" + message explicatif) — aucune optimisation
n'est créée en base tant que la configuration n'est pas valide.

### Configurer OpenRouteService (le plus simple à tester)

1. Créez un compte gratuit sur https://openrouteservice.org/dev/#/signup et
   récupérez une clé API (offre gratuite : 2000 requêtes/jour, largement
   suffisant pour du test).
2. `ORS_API_KEY="votre-clé"` dans `.env`.
3. Relancez `npm run dev`, sélectionnez "OpenRouteService / VROOM" à l'écran
   Optimisation (badge "Configuré" visible) et lancez le calcul.

### Configurer VROOM

1. Déployez une instance VROOM (voir
   https://github.com/VROOM-Project/vroom-docker pour un déploiement Docker
   prêt à l'emploi, généralement couplé à un OSRM couvrant la zone désirée).
2. `VROOM_API_URL="http://votre-instance:3000"` dans `.env` (a priorité sur
   `ORS_API_KEY` si les deux sont définis).
3. Relancez `npm run dev` et sélectionnez "OpenRouteService / VROOM".

### Configurer Google Route Optimization

1. Dans un projet GCP, activez l'API "Route Optimization API" et créez un
   compte de service avec les droits nécessaires, puis générez une clé JSON
   (Console GCP → IAM & Admin → Comptes de service → Clés → Créer une clé →
   JSON).
2. Collez le **contenu JSON complet** de la clé dans
   `GOOGLE_SERVICE_ACCOUNT_JSON` (une seule ligne, guillemets échappés si
   besoin) et renseignez `GOOGLE_CLOUD_PROJECT_ID`.
3. Relancez `npm run dev` et sélectionnez "Google Route Optimization".

> ⚠️ **Note d'implémentation** : le flux d'authentification OAuth2 (JWT
> Bearer signé RS256) a été testé de bout en bout contre le vrai endpoint
> `oauth2.googleapis.com` (avec une clé de test factice, qui reçoit bien une
> erreur `invalid_grant` structurée — preuve que la requête est correctement
> formée). En revanche, l'appel à `optimizeTours` lui-même n'a **pas** pu être
> vérifié en conditions réelles faute de projet GCP disposant de l'API
> activée dans cet environnement. Le code suit fidèlement le schéma documenté
> par Google ; validez-le avec vos propres identifiants avant un usage en
> production, et signalez tout écart de schéma constaté.

## Feuille de route chauffeur

`/driver-sheet/[routeId]` : case à cocher "Livraison effectuée" et compteur
de bacs vides récupérés par arrêt (mise à jour optimiste, persistée via
`PATCH /api/route-stops/:id`). Bouton "Imprimer / Exporter PDF" → impression
navigateur (contrôles interactifs masqués, couleurs conservées, case à
cocher papier pour un usage hors-ligne).
