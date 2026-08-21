"use client";

import { Input } from "@/components/ui/input";
import type { TimePeriodInput, WeeklyWindowsInput } from "@/lib/validations";
import { WEEKDAY_LABELS, WEEKDAYS, type WeekdayId } from "@/lib/weekday";

interface WeeklyWindowsEditorProps {
  value: WeeklyWindowsInput;
  onChange: (value: WeeklyWindowsInput) => void;
  error?: string;
}

type Slot = "morning" | "afternoon";

const DEFAULT_MORNING: TimePeriodInput = { start: "08:30", end: "12:30" };
const DEFAULT_AFTERNOON: TimePeriodInput = { start: "14:00", end: "18:30" };

/** Grille hebdomadaire (Lundi-Samedi × Matin/Après-midi) des créneaux de livraison d'une pharmacie. */
export function WeeklyWindowsEditor({ value, onChange, error }: WeeklyWindowsEditorProps) {
  function toggleSlot(day: WeekdayId, slot: Slot, enabled: boolean) {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [slot]: enabled ? (slot === "morning" ? DEFAULT_MORNING : DEFAULT_AFTERNOON) : null,
      },
    });
  }

  function updateSlotTime(day: WeekdayId, slot: Slot, field: "start" | "end", time: string) {
    const current = value[day][slot];
    if (!current) return;
    onChange({ ...value, [day]: { ...value[day], [slot]: { ...current, [field]: time } } });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-2 text-left font-medium">Jour</th>
              <th className="p-2 text-left font-medium">Matin</th>
              <th className="p-2 text-left font-medium">Après-midi</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => (
              <tr key={day} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap p-2 align-top font-medium">{WEEKDAY_LABELS[day]}</td>
                {(["morning", "afternoon"] as const).map((slot) => {
                  const period = value[day][slot];
                  return (
                    <td key={slot} className="p-2 align-top">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={period !== null}
                          onChange={(e) => toggleSlot(day, slot, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-input accent-primary"
                        />
                        Livraison possible
                      </label>
                      {period && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={period.start}
                            onChange={(e) => updateSlotTime(day, slot, "start", e.target.value)}
                            className="h-7 w-[6.5rem] text-xs"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={period.end}
                            onChange={(e) => updateSlotTime(day, slot, "end", e.target.value)}
                            className="h-7 w-[6.5rem] text-xs"
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
