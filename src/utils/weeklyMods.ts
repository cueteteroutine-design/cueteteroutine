import { BatchSchedule, CellSlots, ScheduleSlot } from '@/types/schedule';
import { isDualSlot, isSingleSlot } from '@/utils/scheduleHelpers';

// Get the Sunday (start of the ETE week) for a given date, as YYYY-MM-DD
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // JS: Sunday = 0. Rewind to Sunday.
  d.setDate(d.getDate() - d.getDay());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getNextWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 7);
  return getWeekStart(d);
}

export interface WeeklyModification {
  id: string;
  batch_id: string;
  week_start: string;
  action: 'cancel' | 'reschedule';
  source_day: string;
  source_slot_index: number;
  source_slot_position: number;
  source_slot_id: string | null;
  target_day: string | null;
  target_slot_index: number | null;
  target_slot_position: number | null;
  target_room_id: string | null;
  source_slot?: {
    id: string;
    group_name: string | null;
    courses: { code: string; name: string; type: 'theory' | 'sessional'; color: string; credit: number | null } | null;
    teachers: { short_name: string; full_name: string } | null;
    rooms: { name: string } | null;
  } | null;
  target_room?: { name: string } | null;
}

function cloneCell(cell: CellSlots): CellSlots {
  if (!cell) return null;
  if (Array.isArray(cell)) return [{ ...cell[0] }, { ...cell[1] }];
  return { ...cell };
}

function markCancel(cell: CellSlots, position: number): CellSlots {
  if (!cell) return null;
  if (isDualSlot(cell)) {
    const pair = cloneCell(cell) as [ScheduleSlot, ScheduleSlot];
    if (pair[0].slotPosition === position || (position === 0 && pair[0].slotPosition === undefined)) {
      pair[0].modification = 'cancelled';
    }
    if (pair[1].slotPosition === position) {
      pair[1].modification = 'cancelled';
    }
    return pair;
  }
  if (isSingleSlot(cell)) {
    return { ...cell, modification: 'cancelled' };
  }
  return cell;
}

function placeReschedule(cell: CellSlots, slot: ScheduleSlot, position: number): CellSlots {
  const marked: ScheduleSlot = { ...slot, modification: 'rescheduled', slotPosition: position };
  if (!cell) {
    return position === 1 ? marked : marked;
  }
  if (isSingleSlot(cell)) {
    // If existing occupies position 0 and we want position 1, build dual
    if ((cell.slotPosition ?? 0) !== position) {
      const pair: [ScheduleSlot, ScheduleSlot] = position === 1
        ? [{ ...cell, slotPosition: 0 }, marked]
        : [marked, { ...cell, slotPosition: 1 }];
      return pair;
    }
    return marked; // replace
  }
  if (isDualSlot(cell)) {
    const pair = cloneCell(cell) as [ScheduleSlot, ScheduleSlot];
    if ((pair[0].slotPosition ?? 0) === position) pair[0] = marked;
    else if ((pair[1].slotPosition ?? 1) === position) pair[1] = marked;
    return pair;
  }
  return marked;
}

// Applies mods to a schedule and returns a new schedule.
// If cancel + reschedule land on the same cell, reschedule wins (skip cancel).
export function applyWeeklyModifications(
  schedule: BatchSchedule,
  mods: WeeklyModification[],
): BatchSchedule {
  // Deep-ish clone by day/slot
  const result: BatchSchedule = {};
  for (const day of Object.keys(schedule)) {
    result[day] = {};
    for (const idx of Object.keys(schedule[day])) {
      const i = Number(idx);
      result[day][i] = cloneCell(schedule[day][i]);
    }
  }

  // Build "reschedule target" set to skip cancels overlapping them
  const rescheduleTargets = new Set<string>();
  for (const m of mods) {
    if (m.action === 'reschedule' && m.target_day && m.target_slot_index !== null) {
      rescheduleTargets.add(`${m.target_day}-${m.target_slot_index}-${m.target_slot_position ?? 0}`);
    }
  }

  for (const m of mods) {
    if (m.action === 'cancel') {
      const key = `${m.source_day}-${m.source_slot_index}-${m.source_slot_position}`;
      if (rescheduleTargets.has(key)) continue;
      if (!result[m.source_day]) result[m.source_day] = {};
      const cur = result[m.source_day][m.source_slot_index] ?? null;
      result[m.source_day][m.source_slot_index] = markCancel(cur, m.source_slot_position);
    } else if (m.action === 'reschedule' && m.source_slot && m.source_slot.courses && m.source_slot.teachers) {
      // Rescheduling adds an extra occurrence; do NOT cancel the source class.
      // Build slot from source with room override
      const s = m.source_slot;
      const roomName = m.target_room?.name || s.rooms?.name || '_ _ _';
      const built: ScheduleSlot = {
        id: `mod-${m.id}`,
        courseCode: s.courses!.code,
        courseName: s.courses!.name,
        teacherShortName: s.teachers!.short_name,
        teacherFullName: s.teachers!.full_name,
        room: roomName,
        type: s.courses!.type,
        color: s.courses!.color,
        groupName: s.group_name || undefined,
        credit: s.courses!.credit ?? undefined,
        slotPosition: m.target_slot_position ?? 0,
        modification: 'rescheduled',
      };
      const tDay = m.target_day!;
      const tIdx = m.target_slot_index!;
      const tPos = m.target_slot_position ?? 0;
      if (!result[tDay]) result[tDay] = {};
      result[tDay][tIdx] = placeReschedule(result[tDay][tIdx] ?? null, built, tPos);
    }
  }

  return result;
}