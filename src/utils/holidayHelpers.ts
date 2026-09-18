/**
 * Groups consecutive holidays with the same title into ranges.
 * e.g., [{date: "2025-03-21", title: "Eid"}, {date: "2025-03-22", title: "Eid"}, ...]
 * becomes [{startDay: 21, endDay: 23, title: "Eid", is_national: true}]
 */
export interface HolidayRange {
  startDay: number;
  endDay: number;
  title: string;
  is_national: boolean;
}

export function groupHolidaysIntoRanges(
  holidays: { date: string; title: string; is_national: boolean }[]
): HolidayRange[] {
  if (holidays.length === 0) return [];

  // Sort by date
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const ranges: HolidayRange[] = [];

  let current: HolidayRange | null = null;

  for (const h of sorted) {
    const day = new Date(h.date + 'T00:00:00').getDate();

    if (current && h.title === current.title && day === current.endDay + 1) {
      // Extend range
      current.endDay = day;
      current.is_national = current.is_national || h.is_national;
    } else {
      // Start new range
      if (current) ranges.push(current);
      current = { startDay: day, endDay: day, title: h.title, is_national: h.is_national };
    }
  }
  if (current) ranges.push(current);

  return ranges;
}

export function formatRangeLabel(range: HolidayRange): string {
  if (range.startDay === range.endDay) return `${range.startDay}`;
  return `${range.startDay}-${range.endDay}`;
}
