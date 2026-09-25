import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_TIME_SLOTS,
  TimeSlot,
  TimeSettings,
  resolveTimeSlots,
} from '@/utils/timeSlots';

export function useTimeSlots(): { timeSlots: TimeSlot[]; loading: boolean } {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('time_settings')
        .select('use_custom, custom_slots')
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      setTimeSlots(resolveTimeSlots(data as unknown as TimeSettings | null));
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`time-settings-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_settings' },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { timeSlots, loading };
}