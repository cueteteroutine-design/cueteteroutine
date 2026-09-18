import type { SemesterInfo, SemesterStatus } from '@/types/schedule';
import { 
  differenceInDays, 
  isWithinInterval, 
  parseISO, 
  isAfter, 
  isBefore
} from 'date-fns';

interface ComputedSemesterInfo {
  currentWeek: number;
  status: SemesterStatus;
  effectiveTotalWeeks: number;
  daysUntilMidBreak?: number;
  daysUntilFinal?: number;
}

export function computeSemesterInfo(semesterInfo: SemesterInfo, currentDate: Date = new Date()): ComputedSemesterInfo {
  const startDate = parseISO(semesterInfo.startDate);
  const midBreakStart = semesterInfo.midBreakStart ? parseISO(semesterInfo.midBreakStart) : null;
  const midBreakEnd = semesterInfo.midBreakEnd ? parseISO(semesterInfo.midBreakEnd) : null;
  const vacantWeeks = semesterInfo.vacantWeeks || 0;
  const totalWeeks = semesterInfo.totalWeeks || 13; // default to 13
  
  // Calculate effective total weeks
  const midBreakWeeks = (midBreakStart && midBreakEnd) 
    ? Math.min(1, (differenceInDays(midBreakEnd, midBreakStart) + 4) / 7)
    : 0;
  const effectiveTotalWeeks = totalWeeks + vacantWeeks + midBreakWeeks;
  
  // Check if before semester start
  if (isBefore(currentDate, startDate)) {
    return {
      currentWeek: 0,
      status: 'initiating',
      effectiveTotalWeeks
    };
  }
  
  // Check if currently in mid-break
  if (midBreakStart && midBreakEnd && isWithinInterval(currentDate, { start: midBreakStart, end: midBreakEnd })) {
    const daysBeforeMidBreak = differenceInDays(midBreakStart, startDate);
    const weeksBeforeMidBreak = Math.max(1, Math.floor(daysBeforeMidBreak / 7));
    
    return {
      currentWeek: Math.min(weeksBeforeMidBreak - vacantWeeks, totalWeeks),
      status: 'mid_break',
      effectiveTotalWeeks
    };
  }
  
  // Calculate elapsed days from start
  let elapsedDays = differenceInDays(currentDate, startDate);
  
  // If after mid-break, subtract mid-break days
  if (midBreakStart && midBreakEnd && isAfter(currentDate, midBreakEnd)) {
    elapsedDays -= 7;
  }
  
  // Calculate current week (raw week number without vacant week adjustment)
  const rawWeek = Math.max(1, Math.floor(elapsedDays / 7) + 1);
  
  // Subtract vacant weeks but ensure we don't go below 1
  let currentWeek = Math.max(1, rawWeek - vacantWeeks);
  
  // Cap at totalWeeks (e.g., 13)
  currentWeek = Math.min(currentWeek, totalWeeks);
  
  // This utility only determines the date-based phase. The final state must
  // be decided from actual class-day completion (including holidays/breaks).
  const status: SemesterStatus = 'running';

  return {
    currentWeek,
    status,
    effectiveTotalWeeks
  };
}

export function formatWeekDisplay(currentWeek: number, totalWeeks: number): string {
  return `Week ${currentWeek} of ${totalWeeks}`;
}

export function getProgressPercentage(currentWeek: number, totalWeeks: number): number {
  return totalWeeks > 0 ? Math.min(100, (currentWeek / totalWeeks) * 100) : 0;
}
