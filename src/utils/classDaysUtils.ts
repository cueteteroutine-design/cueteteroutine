import type { SemesterInfo } from '@/types/schedule';
import { parseISO, isBefore, isAfter, addDays, isWithinInterval, format } from 'date-fns';

export interface HolidayLike {
  date: string;
  title?: string;
}

export interface ClassDaysResult {
  completedClassDays: number;
  totalClassDays: number;
  currentWeek: number; // 1..totalWeeks based on (days+2)/5 rule
  estimatedEndDate: Date | null; // The date of the last (totalClassDays-th) class
  isSemesterComplete: boolean; // True from the day after the final scheduled class
}

const CLASS_DAYS_PER_WEEK = 5;

/**
 * Counts how many class days have been completed from semester start until `today`.
 * Class days = Sun..Thu, excluding mid-break and any holiday dates.
 * Week is computed as ceil(completedClassDays / 5).
 */
export function computeClassDays(
  semesterInfo: SemesterInfo,
  holidays: HolidayLike[],
  today: Date = new Date()
): ClassDaysResult {
  const totalWeeks = semesterInfo.totalWeeks || 13;
  const totalClassDays = totalWeeks * CLASS_DAYS_PER_WEEK;

  const start = parseISO(semesterInfo.startDate);
  const midStart = semesterInfo.midBreakStart ? parseISO(semesterInfo.midBreakStart) : null;
  const midEnd = semesterInfo.midBreakEnd ? parseISO(semesterInfo.midBreakEnd) : null;

  const holidaySet = new Set(holidays.map(h => h.date));

  // Normalize today and start to date-only
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Compute estimated end date: walk forward from start until totalClassDays reached
  let estimatedEndDate: Date | null = null;
  {
    let c = startOnly;
    let done = 0;
    // Safety cap: 2 years
    for (let i = 0; i < 800 && done < totalClassDays; i++) {
      const dow = c.getDay();
      const isWeekend = dow === 5 || dow === 6;
      const inMidBreak = midStart && midEnd && isWithinInterval(c, { start: midStart, end: midEnd });
      const isHoliday = holidaySet.has(format(c, 'yyyy-MM-dd'));
      if (!isWeekend && !inMidBreak && !isHoliday) {
        done += 1;
        if (done === totalClassDays) {
          estimatedEndDate = c;
          break;
        }
      }
      c = addDays(c, 1);
    }
  }

  if (isBefore(todayOnly, startOnly)) {
    return { completedClassDays: 0, totalClassDays, currentWeek: 1, estimatedEndDate, isSemesterComplete: false };
  }

  let completed = 0;
  let cursor = startOnly;
  // Count up to and including today
  while (!isAfter(cursor, todayOnly)) {
    const dow = cursor.getDay(); // 0=Sun ... 6=Sat
    const isWeekend = dow === 5 || dow === 6; // Fri, Sat (BD)
    const inMidBreak = midStart && midEnd && isWithinInterval(cursor, { start: midStart, end: midEnd });
    const isHoliday = holidaySet.has(format(cursor, 'yyyy-MM-dd'));

    if (!isWeekend && !inMidBreak && !isHoliday) {
      completed += 1;
    }
    cursor = addDays(cursor, 1);
    if (completed >= totalClassDays) {
      completed = totalClassDays;
      break;
    }
  }

  const rawWeek = Math.ceil(completed / CLASS_DAYS_PER_WEEK);
  const currentWeek = Math.min(totalWeeks, Math.max(1, rawWeek));

  // Do not mark the semester final at the beginning of its last class day.
  // It becomes final only after the last scheduled class date has passed.
  const isSemesterComplete = estimatedEndDate
    ? isAfter(todayOnly, estimatedEndDate)
    : completed >= totalClassDays;

  return {
    completedClassDays: completed,
    totalClassDays,
    currentWeek,
    estimatedEndDate,
    isSemesterComplete,
  };
}
