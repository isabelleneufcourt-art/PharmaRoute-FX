"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildCsvTemplate,
  mapRowsToPharmacies,
  readSpreadsheetFile,
  type ParsedPharmacyRow,
} from "@/lib/import/parse-pharmacies";
import type { PharmacyInput } from "@/lib/validations";
import { WEEKDAYS } from "@/lib/weekday";

const MAX_PREVIEW_ROWS = 200;

/** Nombre de créneaux ouverts dans la semaine (sur 12 possibles : 6 jours × 2 créneaux). */
function countOpenSlots(timeWindows: PharmacyInput["timeWindows"]): number {
  return WEEKDAYS.reduce((sum, day) => {
    const d = timeWindows[day];
    return sum + (d.morning ? 1 : 0) + (d.afternoon ? 1 : 0);
  }, 0);
}

export function PharmacyImport() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ParsedPharmacyRow[]>([]);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const validRows = rows.filter((r) => r.data !== null);
  const invalidRows = rows.filter((r) => r.data === null);

  async function processFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    setRows([]);
    try {
      const raw = await readSpreadsheetFile(file);
      if (raw.length === 0) {
        toast.error("Le fichier est vide ou n'a pas pu être lu");
        return;
      }
      const parsed = mapRowsToPharmacies(raw);
      setRows(parsed);
      toast.info(
        `${parsed.length} ligne${parsed.length > 1 ? "s" : ""} détectée${
          parsed.length > 1 ? "s" : ""
        } — vérifiez l'aperçu avant de confirmer l'import`
      );
    } catch (err) {
      console.error(err);
      toast.error("Impossible de lire ce fichier. Formats acceptés : CSV, XLSX, XLS.");
      setFileName(null);
    } finally {
      setParsing(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function reset() {
    setFileName(null);
    setRows([]);
  }

  async function handleConfirmImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/pharmacies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacies: validRows.map((r) => r.data) }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Échec de l'import");
        return;
      }

      toast.success(
        `Import terminé : ${json.created} créée${json.created > 1 ? "s" : ""}, ${
          json.updated
        } mise${json.updated > 1 ? "s" : ""} à jour`
      );
      reset();
      router.refresh();
    } catch {
      toast.error("Erreur réseau pendant l'import");
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    const csv = buildCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-pharmacies-pharmaroute-fx.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Import des pharmacies clientes</CardTitle>
          <CardDescription>
            Fichier CSV ou Excel : code APB, nom, adresse belge, CP, ville, grille horaire
            Lundi-Samedi (matin/après-midi), nombre de bacs.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4" />
          Modèle CSV
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!fileName ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-center transition-colors ${
              dragActive
                ? "border-primary bg-accent"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              Glissez-déposez un fichier ici, ou cliquez pour parcourir
            </p>
            <p className="text-xs text-muted-foreground">Formats acceptés : .csv, .xlsx, .xls</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                {!parsing && (
                  <>
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" />
                      {validRows.length} valide{validRows.length > 1 ? "s" : ""}
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3" />
                        {invalidRows.length} erreur{invalidRows.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" />
                Changer de fichier
              </Button>
            </div>

            {parsing ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse du fichier…
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Code APB</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>CP / Ville</TableHead>
                        <TableHead>Grille horaire</TableHead>
                        <TableHead>Bacs</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                        <TableRow key={row.rowIndex}>
                          <TableCell className="text-muted-foreground">
                            {row.rowIndex + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.data?.apbCode ?? row.raw["Code APB"] ?? "—"}
                          </TableCell>
                          <TableCell>{row.data?.name ?? row.raw["Nom"] ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.data
                              ? `${row.data.postalCode} ${row.data.city}`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.data ? `${countOpenSlots(row.data.timeWindows)} créneaux/sem.` : "—"}
                          </TableCell>
                          <TableCell>{row.data?.bacsCount ?? "—"}</TableCell>
                          <TableCell>
                            {row.data ? (
                              <Badge variant="success">
                                <CheckCircle2 className="h-3 w-3" />
                                OK
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                title={row.errors.join(" · ")}
                                className="cursor-help"
                              >
                                <AlertCircle className="h-3 w-3" />
                                {row.errors[0]}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {rows.length > MAX_PREVIEW_ROWS && (
                  <p className="text-xs text-muted-foreground">
                    Aperçu limité aux {MAX_PREVIEW_ROWS} premières lignes ({rows.length} au
                    total). L&apos;import prendra en compte toutes les lignes valides.
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleConfirmImport}
                    disabled={validRows.length === 0 || importing}
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Importer {validRows.length} pharmacie{validRows.length > 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
