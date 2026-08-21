import { z } from "zod";

/** Code postal belge : 4 chiffres, ne commence pas par 0 (ex: 1000 Bruxelles, 4000 Liège). */
export const belgianPostalCodeRegex = /^[1-9][0-9]{3}$/;

/** Heure au format HH:mm (24h). */
export const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const depotSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom du dépôt est requis (2 caractères min.)"),
    address: z.string().trim().min(3, "L'adresse est requise"),
    postalCode: z
      .string()
      .trim()
      .regex(belgianPostalCodeRegex, "Code postal belge invalide (4 chiffres, ex: 1000)"),
    city: z.string().trim().min(2, "La ville est requise"),
    openingTime: z
      .string()
      .trim()
      .regex(timeRegex, "Heure invalide (format HH:mm)"),
  })
  .strict();

export type DepotInput = z.infer<typeof depotSchema>;

export const pharmacySchema = z
  .object({
    apbCode: z.string().trim().min(1, "Le code APB est requis"),
    name: z.string().trim().min(2, "Le nom de la pharmacie est requis"),
    address: z.string().trim().min(3, "L'adresse est requise"),
    postalCode: z
      .string()
      .trim()
      .regex(belgianPostalCodeRegex, "Code postal belge invalide (4 chiffres)"),
    city: z.string().trim().min(2, "La ville est requise"),
    timeWindowStart: z.string().trim().regex(timeRegex, "Heure de début invalide (HH:mm)"),
    timeWindowEnd: z.string().trim().regex(timeRegex, "Heure de fin invalide (HH:mm)"),
    bacsCount: z.coerce.number().int().min(1, "Au moins 1 bac").max(999),
    serviceTimeMinutes: z.coerce.number().int().min(0).max(180).default(5),
    contactName: z.string().trim().optional().or(z.literal("")),
    contactPhone: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .strict()
  .refine((data) => data.timeWindowStart < data.timeWindowEnd, {
    message: "L'heure de début doit précéder l'heure de fin",
    path: ["timeWindowEnd"],
  });

export type PharmacyInput = z.infer<typeof pharmacySchema>;

/** Version « brute » utilisée lors du parsing CSV/Excel, avant coercition stricte. */
export const pharmacyImportRowSchema = pharmacySchema;

export const optimizeRequestSchema = z
  .object({
    vehicleCount: z.coerce.number().int().min(1, "Au moins 1 véhicule").max(50),
    departureTime: z.string().trim().regex(timeRegex, "Heure de départ invalide (HH:mm)"),
    solverProvider: z
      .enum(["INTERNAL", "GOOGLE_ROUTE_OPTIMIZATION", "OPENROUTE_VROOM"])
      .default("INTERNAL"),
  })
  .strict();

export type OptimizeRequestInput = z.infer<typeof optimizeRequestSchema>;

/** Mise à jour terrain d'un arrêt par le chauffeur (feuille de route, écran 4). */
export const routeStopUpdateSchema = z
  .object({
    completed: z.boolean().optional(),
    emptyBacsRetrieved: z.coerce.number().int().min(0).max(999).optional(),
  })
  .strict()
  .refine((data) => data.completed !== undefined || data.emptyBacsRetrieved !== undefined, {
    message: "Aucune donnée à mettre à jour",
  });

export type RouteStopUpdateInput = z.infer<typeof routeStopUpdateSchema>;
