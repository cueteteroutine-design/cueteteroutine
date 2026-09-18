import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplaySemesterCard } from '@/components/DisplaySemesterCard';
import { Batch } from '@/types/schedule';
import { format } from 'date-fns';
import { publicRead, subscribeData } from '@/lib/jsonData';
import { useHolidays } from '@/hooks/useHolidays';
import { CalendarDays, Clock3, GraduationCap, MapPin, Radio } from 'lucide-react';

interface ApiBatch {
  id: string;
  name: string;
  level: number;
  term: number;
  total_weeks: number;
  start_date: string;
  mid_break_start: string | null;
  mid_break_end: string | null;
  vacant_weeks: number;
  is_active: boolean;
}

const Display = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { holidays } = useHolidays();

  // Transform API batches to our Batch type
  const transformBatches = useCallback((apiBatches: ApiBatch[]): Batch[] => {
    const sortedBatches = apiBatches
      .filter(b => b.is_active)
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.term - a.term;
      });

    return sortedBatches.map(batch => ({
      id: batch.id,
      name: batch.name,
      semesterInfo: {
        level: batch.level,
        term: batch.term,
        totalWeeks: batch.total_weeks,
        startDate: batch.start_date,
        midBreakStart: batch.mid_break_start || undefined,
        midBreakEnd: batch.mid_break_end || undefined,
        vacantWeeks: batch.vacant_weeks || 0,
      },
      schedule: {}
    }));
  }, []);

  // Fetch batches from Supabase directly
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await publicRead('/batches');
      const transformedBatches = transformBatches(data as ApiBatch[]);
      console.log('Transformed batches:', transformedBatches); // Debug log
      setBatches(transformedBatches);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  }, [transformBatches]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => subscribeData(fetchBatches), [fetchBatches]);

  const formattedDate = format(currentTime, 'dd MMM yyyy');
  const formattedDay = format(currentTime, 'EEEE');
  const formattedTime = format(currentTime, 'hh:mm:ss a');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header - redesigned without changing the card area */}
      <header
        className="relative flex-shrink-0 overflow-hidden border-b border-border bg-card px-4 py-3 shadow-sm transition-colors duration-200 hover:bg-muted/20 sm:px-6 sm:py-4 md:px-8"
        onClick={() => navigate('/')}
      >
        {/* Decorative accents are absolutely positioned, so they add no height. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="pointer-events-none absolute -left-16 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl" />

        {/* Desktop */}
        <div className="relative hidden min-h-12 items-center justify-between gap-4 sm:flex">
          {/* Date */}
          <div className="flex min-w-[190px] items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
              <span className="text-lg font-extrabold leading-none text-foreground">
                {format(currentTime, 'dd')}
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                {format(currentTime, 'MMM')}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span>{format(currentTime, 'yyyy')}</span>
              </div>
              <p className="mt-0.5 text-sm font-bold leading-tight text-foreground">
                {formattedDay}
              </p>
              <p className="text-[10px] text-muted-foreground/75">Academic day</p>
            </div>
          </div>

          {/* Department identity */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3 px-3 text-center">
            <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 md:flex">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">
                Academic Schedule
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-foreground sm:text-xl md:text-2xl lg:text-3xl">
                Electronics and Telecommunication Engineering
              </h1>
            </div>
          </div>

          {/* Live time */}
          <div className="flex min-w-[190px] justify-end">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-border/80 bg-background/50 px-3.5 shadow-sm backdrop-blur-sm">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock3 className="h-4 w-4 text-primary" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-extrabold leading-none tabular-nums text-foreground sm:text-base">
                  {format(currentTime, 'hh:mm')}
                  <span className="text-xs font-semibold text-muted-foreground">
                    :{format(currentTime, 'ss')}
                  </span>
                </p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {format(currentTime, 'a')}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="relative sm:hidden">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/80">
                Academic Schedule
              </p>
              <h1 className="truncate text-base font-extrabold leading-tight text-foreground">
                Electronics and Telecommunication Engineering
              </h1>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <p className="truncate text-[11px] font-semibold text-muted-foreground">
                {formattedDay} · {formattedDate}
              </p>
            </div>
            <div className="ml-3 flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Fixed layout for cards */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="h-full w-full flex flex-col p-2 sm:p-3 md:p-4 gap-2 sm:gap-3">
          {batches.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">No active batches found</p>
                <p className="text-sm mt-2">Please check if there are any active batches in the system.</p>
              </div>
            </div>
          ) : (
            batches.map(batch => (
              <div key={batch.id} className="w-full flex-1 min-h-0">
                <DisplaySemesterCard
                  batchName={batch.name}
                  semesterInfo={batch.semesterInfo}
                  totalBatches={batches.length}
                  holidays={holidays}
                />
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer - redesigned at the same compact height */}
      <footer className="relative flex-shrink-0 overflow-hidden border-t border-border bg-card px-3 py-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

        <div className="relative flex items-center justify-center sm:justify-between">
          <div className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>Academic Display</span>
          </div>

          <div className="flex min-w-0 items-center justify-center gap-2 text-center">
            <MapPin className="hidden h-3.5 w-3.5 flex-shrink-0 text-primary sm:block" />
            <p className="truncate text-xs font-semibold text-muted-foreground sm:text-sm md:text-base">
              Chittagong University of Engineering and Technology
            </p>
          </div>

          <div className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Live system</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Display;
