# PharmaRoute FX

Outil d'optimisation de tournées de livraison de médicaments (VRPTW) pour
grossistes-répartiteurs en Belgique.

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + **Lucide React** + composants UI type Shadcn (Radix UI)
- **Prisma ORM** + **SQLite** (développement local)
- **Leaflet.js** (`react-leaflet`) pour la cartographie
- Interface prête pour un solver VRPTW externe (Google Route Optimization API
  ou OpenRouteService / VROOM API) — à brancher à l'étape "Optimisation"

## Démarrage

```bash
cp .env.example .env
npm install            # génère aussi le client Prisma (postinstall)
npm run db:migrate      # crée prisma/dev.db et applique le schéma
npm run db:seed         # (optionnel) données de démonstration belges
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Scripts utiles

| Commande            | Description                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`         | Serveur de développement                          |
| `npm run build`       | Build de production                               |
| `npm run db:migrate`  | Applique les migrations Prisma (SQLite)           |
| `npm run db:seed`     | Insère un dépôt et des pharmacies de démonstration|
| `npm run db:studio`   | Ouvre Prisma Studio (explorateur de données)      |

## Écrans (feuille de route)

1. **Dépôt & Pharmacies** ✅ — gestion du dépôt central, import CSV/Excel des
   pharmacies clientes (code APB, adresse belge, fenêtres horaires, bacs),
   liste avec recherche/édition/suppression.
2. **Optimisation** — formulaire de lancement (nombre de véhicules, heure de
   départ) et appel au solver VRPTW.
3. **Résultats (split-screen)** — liste des tournées avec ETA et respect des
   créneaux, et carte Leaflet avec tracés colorés par tournée.
4. **Feuille de route chauffeur** — vue imprimable/PDF, responsive mobile.

## Modèle de données (Prisma)

- `Depot` — point de départ/retour des tournées.
- `Pharmacy` — client de livraison : code APB, adresse belge (CP à 4
  chiffres), fenêtre horaire (`timeWindowStart`/`timeWindowEnd`), nombre de
  bacs, temps de déchargement fixe (`serviceTimeMinutes`, 5 min par défaut).
- `Optimization` / `Route` / `RouteStop` — résultat d'un calcul VRPTW : une
  optimisation regroupe plusieurs tournées (véhicules), chacune composée
  d'arrêts ordonnés avec ETA calculée et indicateur de respect de créneau.

## Import CSV/Excel des pharmacies

Le formulaire d'import (`/`) accepte `.csv`, `.xlsx`, `.xls`. Les en-têtes de
colonnes sont reconnus de façon flexible (accents/majuscules ignorés, alias
français courants : `Code APB`, `Nom`, `Adresse`, `CP`, `Ville`,
`Heure Debut`, `Heure Fin`, `Nombre de bacs`…). Un modèle CSV téléchargeable
est disponible dans l'écran d'import. Chaque ligne est validée individuellement
(code postal belge à 4 chiffres, horaires `HH:mm`, cohérence début < fin) et
un ré-import met à jour les pharmacies existantes (upsert par code APB) au
lieu de créer des doublons.
