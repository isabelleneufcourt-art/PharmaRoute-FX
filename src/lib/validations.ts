import { z } from "zod";

import { WEEKDAYS } from "@/lib/weekday";

/** Code postal belge : 4 chiffres, ne commence pas par 0 (ex: 1000 Bruxelles, 4000 Liège). */
export const belgianPostalCodeRegex = /^[1-9][0-9]{3}$/;

/** Heure au format HH:mm (24h). */
export const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Date au format YYYY-MM-DD (issue d'un `<input type="date">`). */
export const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const depotSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom du dépôt est requis (2 caractères min.)"),
    /** Code court optionnel (ex: "BXL"), utilisé pour l'affectation des pharmacies à
     *  l'import CSV (colonne "Depot" / "Code_Depot"). */
    code: z.string().trim().toUpperCase().optional().or(z.literal("")),
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

/** Un créneau horaire (ex: 08:30-12:30), avec cohérence début < fin. */
const timePeriodSchema = z
  .object({
    start: z.string().trim().regex(timeRegex, "Heure de début invalide (HH:mm)"),
    end: z.string().trim().regex(timeRegex, "Heure de fin invalide (HH:mm)"),
  })
  .strict()
  .refine((d) => d.start < d.end, {
    message: "L'heure de début doit précéder l'heure de fin",
    path: ["end"],
  });

export type TimePeriodInput = z.infer<typeof timePeriodSchema>;

/** Créneaux Matin / Après-midi d'un même jour ; `null` = fermé (pas de livraison ce créneau). */
const dayWindowsSchema = z
  .object({
    morning: timePeriodSchema.nullable(),
    afternoon: timePeriodSchema.nullable(),
  })
  .strict();

export type DayWindowsInput = z.infer<typeof dayWindowsSchema>;

/** Grille hebdomadaire complète (Lundi → Samedi) des créneaux de livraison d'une pharmacie. */
export const weeklyWindowsSchema = z
  .object({
    MONDAY: dayWindowsSchema,
    TUESDAY: dayWindowsSchema,
    WEDNESDAY: dayWindowsSchema,
    THURSDAY: dayWindowsSchema,
    FRIDAY: dayWindowsSchema,
    SATURDAY: dayWindowsSchema,
  })
  .strict();

export type WeeklyWindowsInput = z.infer<typeof weeklyWindowsSchema>;

/** Grille par défaut proposée à la création : Lundi-Vendredi 08:30-12:30 / 14:00-18:30, Samedi fermé. */
export function defaultWeeklyWindows(): WeeklyWindowsInput {
  const weekday = { morning: { start: "08:30", end: "12:30" }, afternoon: { start: "14:00", end: "18:30" } };
  return {
    MONDAY: weekday,
    TUESDAY: weekday,
    WEDNESDAY: weekday,
    THURSDAY: weekday,
    FRIDAY: weekday,
    SATURDAY: { morning: null, afternoon: null },
  };
}

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
    timeWindows: weeklyWindowsSchema,
    /** Dépôt/secteur d'affectation. `null` = pas d'affectation explicite, la
     *  pharmacie est rattachée au dépôt principal (Depot.isDefault). */
    depotId: z.string().trim().min(1).nullable().default(null),
    /** Livraison hors-horaires (sas de dépôt / clé confiée au chauffeur) : indique au
     *  solver qu'un accès anticipé est possible, sans modifier l'horaire réel de
     *  l'officine (grille `timeWindows` ci-dessus, inchangée). */
    earlyAccessEnabled: z.boolean().default(false),
    earlyAccessTime: z
      .string()
      .trim()
      .regex(timeRegex, "Heure d'accès invalide (HH:mm)")
      .nullable()
      .default(null),
    bacsCount: z.coerce.number().int().min(1, "Au moins 1 bac").max(999),
    serviceTimeMinutes: z.coerce.number().int().min(0).max(180).default(5),
    contactName: z.string().trim().optional().or(z.literal("")),
    contactPhone: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .strict()
  .refine((data) => WEEKDAYS.some((day) => data.timeWindows[day].morning || data.timeWindows[day].afternoon), {
    message: "Au moins un créneau doit être ouvert dans la semaine",
    path: ["timeWindows"],
  })
  .refine((data) => !data.earlyAccessEnabled || Boolean(data.earlyAccessTime), {
    message: "Indiquez l'heure d'accès chauffeur (sas/clé)",
    path: ["earlyAccessTime"],
  })
  .refine(
    (data) => {
      if (!data.earlyAccessEnabled || !data.earlyAccessTime) return true;
      const earliestOpening = WEEKDAYS.flatMap((day) => [
        data.timeWindows[day].morning,
        data.timeWindows[day].afternoon,
      ])
        .filter((w): w is TimePeriodInput => w !== null)
        .map((w) => w.start)
        .sort()[0];
      if (!earliestOpening) return true;
      return data.earlyAccessTime < earliestOpening;
    },
    {
      message: "L'heure d'accès chauffeur doit précéder l'heure d'ouverture la plus tôt de la semaine",
      path: ["earlyAccessTime"],
    }
  );

export type PharmacyInput = z.infer<typeof pharmacySchema>;

/** Version « brute » utilisée lors du parsing CSV/Excel, avant coercition stricte. */
export const pharmacyImportRowSchema = pharmacySchema;

export const optimizeRequestSchema = z
  .object({
    /** Dépôt de départ/retour des véhicules pour ce calcul. */
    depotId: z.string().trim().min(1, "Sélectionnez un dépôt de départ"),
    vehicleCount: z.coerce.number().int().min(1, "Au moins 1 véhicule").max(50),
    departureTime: z.string().trim().regex(timeRegex, "Heure de départ invalide (HH:mm)"),
    deliveryDate: z.string().trim().regex(dateOnlyRegex, "Date de livraison invalide"),
    solverProvider: z
      .enum(["INTERNAL", "GOOGLE_ROUTE_OPTIMIZATION", "OPENROUTE_VROOM"])
      .default("INTERNAL"),
    /// Sélection manuelle des pharmacies à inclure (cases à cochées sur l'écran
    /// Optimisation). `undefined`/absent = toutes les pharmacies ouvertes ce
    /// jour-là sont incluses (comportement historique).
    pharmacyIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins une pharmacie").optional(),
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
