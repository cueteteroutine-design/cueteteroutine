export interface Teacher {
  id: string;
  shortName: string;
  fullName: string;
}

export interface Room {
  id: string;
  name: string;
  building?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  type: 'theory' | 'sessional';
  color: string; // HSL color string like "217 91% 45%"
}

export interface ScheduleSlot {
  id: string;
  courseCode: string;
  courseName: string;
  teacherShortName: string;
  teacherFullName: string;
  room: string;
  type: 'theory' | 'sessional';
  color: string; // HSL color string
  groupName?: string; // G1, G2, or G1_G2 for sessional classes
  credit?: number; // Course credit
  slotPosition?: number; // 0 = first/only slot, 1 = second slot (for split classes)
  modification?: 'cancelled' | 'rescheduled';
}

// A cell can have 1 or 2 slots (for split group classes)
export type CellSlots = ScheduleSlot | [ScheduleSlot, ScheduleSlot] | null;

export interface DaySchedule {
  [slotIndex: number]: CellSlots;
}

export interface BatchSchedule {
  [day: string]: DaySchedule;
}

export type SemesterStatus = 'initiating' | 'running' | 'mid_break' | 'semester_final';

export interface SemesterInfo {
  level: number;
  term: number;
  totalWeeks: number; // Usually 13
  startDate: string; // ISO date string - semester start date
  midBreakStart?: string; // ISO date string - when mid break starts
  midBreakEnd?: string; // ISO date string - when mid break ends
  vacantWeeks?: number; // Additional vacant weeks that don't count
  // Computed fields (calculated from dates)
  currentWeek?: number;
  status?: SemesterStatus;
}

export interface Batch {
  id: string;
  name: string;
  semesterInfo: SemesterInfo;
  schedule: BatchSchedule;
}

export const TIME_SLOTS = [
  { start: '8:10', end: '9:00', index: 0 },
  { start: '9:00', end: '9:50', index: 1 },
  { start: '9:50', end: '10:40', index: 2 },
  { start: '10:40', end: '11:00', index: 3, isBreak: true },
  { start: '11:00', end: '11:50', index: 4 },
  { start: '11:50', end: '12:40', index: 5 },
  { start: '12:40', end: '1:30', index: 6 },
  { start: '2:30', end: '3:20', index: 7 },
  { start: '3:20', end: '4:10', index: 8 },
  { start: '4:10', end: '5:00', index: 9 },
];

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
