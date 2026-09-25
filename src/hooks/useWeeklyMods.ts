import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyModification, getWeekStart } from '@/utils/weeklyMods';

const ADMIN_API_URL = 'https://wkvicmgacjdoraoufprw.supabase.co/functions/v1/admin';

export function useWeeklyMods(weekStart?: string) {
  const [mods, setMods] = useState<WeeklyModification[]>([]);
  const week = weekStart ?? getWeekStart();

  const load = async () => {
    try {
      const res = await fetch(`${ADMIN_API_URL}/weekly-modifications?week_start=${week}`);
      if (!res.ok) return;
      setMods(await res.json());
    } catch (e) {
      console.error('Failed to load weekly mods', e);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`weekly-mods-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_modifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  return { mods, reload: load };
}