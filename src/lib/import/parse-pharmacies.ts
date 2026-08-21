import Papa from "papaparse";
import * as XLSX from "xlsx";

import { pharmacyImportRowSchema, type DayWindowsInput, type PharmacyInput } from "@/lib/validations";
import { WEEKDAY_LABELS, WEEKDAYS, type WeekdayId } from "@/lib/weekday";

/** Normalise un intitulé de colonne : minuscules, sans accents, séparé par "_". */
function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type FlatField = Exclude<keyof PharmacyInput, "timeWindows">;

/** Alias reconnus (déjà normalisés) pour chaque champ métier "plat" (hors grille horaire). */
const FIELD_ALIASES: Record<FlatField, string[]> = {
  apbCode: ["code_apb", "apb", "apbcode", "code", "num_apb", "numero_apb"],
  name: ["nom", "nom_pharmacie", "pharmacie", "name", "raison_sociale"],
  address: ["adresse", "rue", "address", "adresse_livraison"],
  postalCode: ["cp", "code_postal", "codepostal", "postal_code", "zip", "npa"],
  city: ["ville", "city", "localite", "commune"],
  bacsCount: ["bacs", "nombre_de_bacs", "nb_bacs", "nombre_bacs", "bacs_count", "caisses"],
  serviceTimeMinutes: [
    "temps_dechargement",
    "temps_de_dechargement",
    "service_time",
    "duree_dechargement",
    "temps_arret_min",
  ],
  contactName: ["contact", "nom_contact", "contact_name", "responsable"],
  contactPhone: ["telephone", "tel", "phone", "contact_phone", "gsm"],
  notes: ["notes", "remarques", "commentaire", "commentaires"],
  // "earlyAccessEnabled" est dérivé automatiquement de la présence de "earlyAccessTime"
  // (voir mapRawRowToPharmacyInput ci-dessous) : aucun alias de colonne dédié.
  earlyAccessEnabled: [],
  earlyAccessTime: [
    "heure_acces_chauffeur",
    "acces_chauffeur",
    "heure_acces",
    "acces_anticipe",
    "heure_sas",
    "sas",
    "heure_cle",
    "cle",
  ],
};

/** Alias reconnus pour chaque colonne "jour" de la grille hebdomadaire. */
const DAY_COLUMN_ALIASES: Record<WeekdayId, string[]> = {
  MONDAY: ["lundi", "monday", "lun", "mon"],
  TUESDAY: ["mardi", "tuesday", "mar", "tue"],
  WEDNESDAY: ["mercredi", "wednesday", "mer", "wed"],
  THURSDAY: ["jeudi", "thursday", "jeu", "thu"],
  FRIDAY: ["vendredi", "friday", "ven", "fri"],
  SATURDAY: ["samedi", "saturday", "sam", "sat"],
};

/** Alias "legacy" (ancien format à fenêtre unique, avant la grille hebdomadaire) — repli si aucune colonne jour n'est trouvée. */
const LEGACY_START_ALIASES = [
  "heure_debut",
  "debut",
  "debut_fenetre",
  "fenetre_debut",
  "time_window_start",
  "ouverture",
  "heure_debut_livraison",
];
const LEGACY_END_ALIASES = [
  "heure_fin",
  "fin",
  "fin_fenetre",
  "fenetre_fin",
  "time_window_end",
  "fermeture",
  "heure_fin_livraison",
];

const TIME_RANGE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/;

function parseTimeRange(raw: string): { start: string; end: string } | null {
  const match = raw.trim().match(TIME_RANGE_REGEX);
  if (!match) return null;
  return { start: `${match[1]}:${match[2]}`, end: `${match[3]}:${match[4]}` };
}

/**
 * Parse la valeur d'une cellule "jour" : zéro, un ou deux créneaux
 * "HH:mm-HH:mm" séparés par ";" (ex: "08:30-12:30;14:00-18:30"). Une
 * cellule vide signifie "fermé ce jour-là". Retourne `null` si le format
 * n'est pas reconnu.
 */
function parseDayCell(value: string): DayWindowsInput | null {
  const trimmed = value.trim();
  if (!trimmed) return { morning: null, afternoon: null };

  const parts = trimmed
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  const ranges = parts.map(parseTimeRange);
  if (ranges.length === 0 || ranges.length > 2 || ranges.some((r) => r === null)) return null;

  const valid = (ranges as { start: string; end: string }[]).sort((a, b) => a.start.localeCompare(b.start));
  if (valid.length === 1) {
    // Une seule plage ce jour-là : rangée sous "matin" ou "après-midi" selon l'heure de début
    // (label d'affichage uniquement — la plage elle-même n'est pas restreinte).
    const startHour = Number(valid[0].start.slice(0, 2));
    return startHour < 12 ? { morning: valid[0], afternoon: null } : { morning: null, afternoon: valid[0] };
  }
  return { morning: valid[0], afternoon: valid[1] };
}

export interface ParsedPharmacyRow {
  rowIndex: number;
  raw: Record<string, string>;
  data: PharmacyInput | null;
  errors: string[];
}

/** Lit un fichier CSV ou Excel (.xlsx/.xls) et retourne des lignes brutes (en-têtes → valeur). */
export async function readSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const isCsv = /\.(csv|txt)$/i.test(file.name);

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return result.data;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = value === undefined || value === null ? "" : String(value).trim();
    }
    return normalized;
  });
}

/** Associe les colonnes brutes du fichier aux champs métier attendus par PharmaRoute FX. */
function mapRawRowToPharmacyInput(
  raw: Record<string, string>
): { candidate: Record<string, unknown>; errors: string[] } {
  const normalizedEntries = Object.entries(raw).map(
    ([key, value]) => [normalizeHeader(key), value] as const
  );

  const candidate: Record<string, unknown> = {
    bacsCount: 1,
    serviceTimeMinutes: 5,
  };

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FlatField, string[]][]) {
    const match = normalizedEntries.find(([key]) => aliases.includes(key));
    if (match && match[1] !== "") candidate[field] = match[1];
  }

  // "earlyAccessEnabled" est dérivé : une colonne "Heure accès chauffeur" renseignée
  // active automatiquement la livraison hors-horaires (sas/clé) pour cette ligne.
  candidate.earlyAccessEnabled = typeof candidate.earlyAccessTime === "string";

  const errors: string[] = [];
  const weekly: Partial<Record<WeekdayId, DayWindowsInput>> = {};
  let anyDayColumnFound = false;

  for (const day of WEEKDAYS) {
    const match = normalizedEntries.find(([key]) => DAY_COLUMN_ALIASES[day].includes(key));
    if (!match) continue;
    anyDayColumnFound = true;
    const parsed = parseDayCell(match[1]);
    if (parsed === null) {
      errors.push(
        `${WEEKDAY_LABELS[day]} : format de créneau invalide (attendu "HH:mm-HH:mm", jusqu'à 2 plages séparées par ";")`
      );
    } else {
      weekly[day] = parsed;
    }
  }

  if (anyDayColumnFound) {
    if (errors.length === 0) {
      for (const day of WEEKDAYS) weekly[day] ??= { morning: null, afternoon: null };
      candidate.timeWindows = weekly;
    }
  } else {
    // Repli "legacy" : une fenêtre unique (ancien format), appliquée Lundi → Samedi.
    const legacyStart = normalizedEntries.find(([key]) => LEGACY_START_ALIASES.includes(key));
    const legacyEnd = normalizedEntries.find(([key]) => LEGACY_END_ALIASES.includes(key));
    if (legacyStart?.[1] && legacyEnd?.[1]) {
      const range = { start: legacyStart[1], end: legacyEnd[1] };
      const startHour = Number(range.start.slice(0, 2)) || 0;
      const dayWindows: DayWindowsInput =
        startHour < 12 ? { morning: range, afternoon: null } : { morning: null, afternoon: range };
      const legacyWeekly: Record<string, DayWindowsInput> = {};
      for (const day of WEEKDAYS) legacyWeekly[day] = dayWindows;
      candidate.timeWindows = legacyWeekly;
    }
    // Sinon : ni colonnes jour ni fenêtre "legacy" → timeWindows absent, la validation
    // zod ci-dessous produira un message d'erreur clair ("timeWindows : Required").
  }

  return { candidate, errors };
}

/** Parse et valide chaque ligne d'un fichier importé, ligne par ligne. */
export function mapRowsToPharmacies(rows: Record<string, string>[]): ParsedPharmacyRow[] {
  return rows.map((raw, index) => {
    const { candidate, errors: dayErrors } = mapRawRowToPharmacyInput(raw);
    if (dayErrors.length > 0) {
      return { rowIndex: index, raw, data: null, errors: dayErrors };
    }

    const parsed = pharmacyImportRowSchema.safeParse(candidate);

    if (parsed.success) {
      return { rowIndex: index, raw, data: parsed.data, errors: [] };
    }

    const errors = parsed.error.issues.map((issue) => {
      const field = issue.path.join(".") || "ligne";
      return `${field} : ${issue.message}`;
    });

    return { rowIndex: index, raw, data: null, errors };
  });
}

/** En-tête du modèle CSV téléchargeable proposé aux utilisateurs. */
export const CSV_TEMPLATE_HEADERS = [
  "Code APB",
  "Nom",
  "Adresse",
  "CP",
  "Ville",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Heure acces chauffeur (Sas/Cle)",
  "Nombre de bacs",
  "Temps dechargement",
  "Contact",
  "Telephone",
  "Notes",
];

export const CSV_TEMPLATE_EXAMPLE_ROW = [
  "12345",
  "Pharmacie du Centre",
  "Rue de la Loi 16",
  "1000",
  "Bruxelles",
  "08:30-12:30;14:00-18:30",
  "08:30-12:30;14:00-18:30",
  "08:30-12:30;14:00-18:30",
  "08:30-12:30;14:00-18:30",
  "08:30-12:30;14:00-18:30",
  "09:00-12:30",
  "07:30",
  "3",
  "5",
  "J. Dupont",
  "02 123 45 67",
  "Sonnette arriere",
];

export function buildCsvTemplate(): string {
  return Papa.unparse([CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE_ROW]);
}
