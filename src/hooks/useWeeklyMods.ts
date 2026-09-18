import { useJsonResource } from './useJsonResource';
import { WeeklyModification, getWeekStart } from '@/utils/weeklyMods';
export function useWeeklyMods(weekStart?: string) {
  const {data,error} = useJsonResource<WeeklyModification[]>(`/weekly-modifications?week_start=${weekStart ?? getWeekStart()}`,[]);
  return {mods:data,error};
}
