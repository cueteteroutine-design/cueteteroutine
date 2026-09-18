import { useJsonResource } from './useJsonResource';
export interface HolidayRow { date: string; title: string; is_national: boolean; source?: string; }
export function useHolidays() {
  const {data,loading,error} = useJsonResource<HolidayRow[]>('/holidays',[]);
  return {holidays:data,loading,error};
}
