import { useJsonResource } from './useJsonResource';
import { resolveTimeSlots, TimeSettings } from '@/utils/timeSlots';
export function useTimeSlots() {
  const {data,loading} = useJsonResource<TimeSettings | null>('/time-settings',null);
  return {timeSlots:resolveTimeSlots(data),loading};
}
