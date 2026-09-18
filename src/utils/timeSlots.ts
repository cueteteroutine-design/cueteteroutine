import { publicRead } from '@/lib/jsonData';

export interface TimeSlot {
  index: number;
  start: string;
  end: string;
  isBreak?: boolean;
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { index: 0, start: '8:10', end: '9:00' },
  { index: 1, start: '9:00', end: '9:50' },
  { index: 2, start: '9:50', end: '10:40' },
  { index: 3, start: '10:40', end: '11:00', isBreak: true },
  { index: 4, start: '11:00', end: '11:50' },
  { index: 5, start: '11:50', end: '12:40' },
  { index: 6, start: '12:40', end: '1:30' },
  { index: 7, start: '2:30', end: '3:20' },
  { index: 8, start: '3:20', end: '4:10' },
  { index: 9, start: '4:10', end: '5:00' },
];

export interface TimeSettings {
  use_custom: boolean;
  custom_slots: TimeSlot[];
}

export function resolveTimeSlots(settings: TimeSettings | null | undefined): TimeSlot[] {
  if (!settings || !settings.use_custom || !Array.isArray(settings.custom_slots) || settings.custom_slots.length === 0) {
    return DEFAULT_TIME_SLOTS;
  }
  // Merge with defaults by index so partial custom sets still work, keep isBreak
  return DEFAULT_TIME_SLOTS.map((def) => {
    const custom = settings.custom_slots.find((s) => Number(s.index) === def.index);
    if (!custom) return def;
    return {
      index: def.index,
      start: (custom.start ?? def.start).trim() || def.start,
      end: (custom.end ?? def.end).trim() || def.end,
      isBreak: def.isBreak,
    };
  });
}

export async function fetchEffectiveTimeSlots(): Promise<TimeSlot[]> {
  try {
    const data = await publicRead('/time-settings');
    return resolveTimeSlots(data as unknown as TimeSettings | null);
  } catch {
    return DEFAULT_TIME_SLOTS;
  }
}

/**
 * PDF header labels — 11 columns including empty morning break and lunch gap.
 * Order: [0,1,2, MORNING BREAK, 4,5,6, LUNCH GAP, 7,8,9]
 */
export function formatTimeSlotsForPdf(slots: TimeSlot[]): string[] {
  const byIndex = new Map(slots.map((s) => [s.index, s] as const));
  const fmt = (i: number) => {
    const s = byIndex.get(i);
    if (!s) return '';
    return `${s.start} to\n${s.end}`;
  };
  return [
    fmt(0), fmt(1), fmt(2),
    '',
    fmt(4), fmt(5), fmt(6),
    '',
    fmt(7), fmt(8), fmt(9),
  ];
}