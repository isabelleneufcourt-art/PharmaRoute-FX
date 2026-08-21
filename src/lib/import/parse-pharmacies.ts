import Papa from "papaparse";
import * as XLSX from "xlsx";

import { pharmacyImportRowSchema, type PharmacyInput } from "@/lib/validations";

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

/** Alias reconnus (déjà normalisés) pour chaque champ métier attendu. */
const FIELD_ALIASES: Record<keyof PharmacyInput, string[]> = {
  apbCode: ["code_apb", "apb", "apbcode", "code", "num_apb", "numero_apb"],
  name: ["nom", "nom_pharmacie", "pharmacie", "name", "raison_sociale"],
  address: ["adresse", "rue", "address", "adresse_livraison"],
  postalCode: ["cp", "code_postal", "codepostal", "postal_code", "zip", "npa"],
  city: ["ville", "city", "localite", "commune"],
  timeWindowStart: [
    "heure_debut",
    "debut",
    "debut_fenetre",
    "fenetre_debut",
    "time_window_start",
    "ouverture",
    "heure_debut_livraison",
  ],
  timeWindowEnd: [
    "heure_fin",
    "fin",
    "fin_fenetre",
    "fenetre_fin",
    "time_window_end",
    "fermeture",
    "heure_fin_livraison",
  ],
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
};

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
function mapRawRowToPharmacyInput(raw: Record<string, string>): Record<string, unknown> {
  const normalizedEntries = Object.entries(raw).map(
    ([key, value]) => [normalizeHeader(key), value] as const
  );

  const result: Record<string, unknown> = {
    bacsCount: 1,
    serviceTimeMinutes: 5,
  };

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    keyof PharmacyInput,
    string[]
  ][]) {
    const match = normalizedEntries.find(([key]) => aliases.includes(key));
    if (match && match[1] !== "") {
      result[field] = match[1];
    }
  }

  return result;
}

/** Parse et valide chaque ligne d'un fichier importé, ligne par ligne. */
export function mapRowsToPharmacies(rows: Record<string, string>[]): ParsedPharmacyRow[] {
  return rows.map((raw, index) => {
    const candidate = mapRawRowToPharmacyInput(raw);
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
  "Heure Debut",
  "Heure Fin",
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
  "07:30",
  "08:30",
  "3",
  "5",
  "J. Dupont",
  "02 123 45 67",
  "Sonnette arriere",
];

export function buildCsvTemplate(): string {
  return Papa.unparse([CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE_ROW]);
}
