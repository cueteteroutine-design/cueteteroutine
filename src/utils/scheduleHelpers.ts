import { ScheduleSlot, CellSlots } from '@/types/schedule';

/**
 * Check if a cell has dual slots (split group classes)
 */
export function isDualSlot(cell: CellSlots): cell is [ScheduleSlot, ScheduleSlot] {
  return Array.isArray(cell) && cell.length === 2;
}

/**
 * Check if a cell has a single slot
 */
export function isSingleSlot(cell: CellSlots): cell is ScheduleSlot {
  return cell !== null && !Array.isArray(cell);
}

/**
 * Get the first slot from a cell (for PDF generation etc.)
 */
export function getFirstSlot(cell: CellSlots): ScheduleSlot | null {
  if (!cell) return null;
  if (Array.isArray(cell)) return cell[0];
  return cell;
}

/**
 * Get all slots from a cell as an array
 */
export function getSlotsArray(cell: CellSlots): ScheduleSlot[] {
  if (!cell) return [];
  if (Array.isArray(cell)) return cell;
  return [cell];
}
