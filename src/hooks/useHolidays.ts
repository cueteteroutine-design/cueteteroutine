import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HolidayRow {
  date: string;
  title: string;
  is_national: boolean;
  source?: string;
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('date,title,is_national,source');
      if (!mounted) return;
      if (!error && data) setHolidays(data as HolidayRow[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`holidays-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { holidays, loading };
}