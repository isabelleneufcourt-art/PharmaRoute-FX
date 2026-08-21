import type { PharmacyTimeWindow } from "@/generated/prisma/client";
import type { WeeklyWindowsInput } from "@/lib/validations";
import { WEEKDAYS, type WeekdayId } from "@/lib/weekday";

/** Lignes Prisma `PharmacyTimeWindow` (sans `id`/`pharmacyId`) prêtes pour un `create` imbriqué. */
export interface PharmacyTimeWindowRow {
  weekday: WeekdayId;
  period: "MORNING" | "AFTERNOON";
  startTime: string;
  endTime: string;
}

/** Convertit la grille hebdomadaire (formulaire/API) en lignes Prisma à insérer. */
export function weeklyWindowsToRows(weekly: WeeklyWindowsInput): PharmacyTimeWindowRow[] {
  const rows: PharmacyTimeWindowRow[] = [];
  for (const day of WEEKDAYS) {
    const dayWindows = weekly[day];
    if (dayWindows.morning) {
      rows.push({ weekday: day, period: "MORNING", startTime: dayWindows.morning.start, endTime: dayWindows.morning.end });
    }
    if (dayWindows.afternoon) {
      rows.push({
        weekday: day,
        period: "AFTERNOON",
        startTime: dayWindows.afternoon.start,
        endTime: dayWindows.afternoon.end,
      });
    }
  }
  return rows;
}

/** Reconstruit la grille hebdomadaire (formulaire/API) à partir des lignes Prisma d'une pharmacie. */
export function rowsToWeeklyWindows(windows: PharmacyTimeWindow[]): WeeklyWindowsInput {
  const weekly = {} as WeeklyWindowsInput;
  for (const day of WEEKDAYS) {
    const morning = windows.find((w) => w.weekday === day && w.period === "MORNING");
    const afternoon = windows.find((w) => w.weekday === day && w.period === "AFTERNOON");
    weekly[day] = {
      morning: morning ? { start: morning.startTime, end: morning.endTime } : null,
      afternoon: afternoon ? { start: afternoon.startTime, end: afternoon.endTime } : null,
    };
  }
  return weekly;
}
