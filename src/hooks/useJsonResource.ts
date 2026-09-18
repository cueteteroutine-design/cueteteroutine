import { useEffect, useState } from 'react';
import { publicRead, subscribeData } from '@/lib/jsonData';
export function useJsonResource<T>(path: string, initial: T) {
  const [data,setData] = useState<T>(initial);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const value = await publicRead(path); if (active) { setData(value); setError(null); } }
      catch (err) { if (active) setError(err instanceof Error ? err.message : 'Unable to load data'); }
      finally { if (active) setLoading(false); }
    };
    void load(); const unsubscribe = subscribeData(load);
    return () => { active = false; unsubscribe(); };
  }, [path]);
  return {data,loading,error};
}
