import { useState, useEffect } from 'react';
import { HolidayCalendarModal } from '@/components/HolidayCalendarModal';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BatchTabs } from '@/components/BatchTabs';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { Legend } from '@/components/Legend';
import { TeacherScheduleModal } from '@/components/TeacherScheduleModal';
import { RoomScheduleModal } from '@/components/RoomScheduleModal';
import { SemesterInfoCard } from '@/components/SemesterInfoCard';
import { useHolidays } from '@/hooks/useHolidays';
import { useWeeklyMods } from '@/hooks/useWeeklyMods';
import { applyWeeklyModifications, getWeekStart } from '@/utils/weeklyMods';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Apple, ExternalLink, Monitor } from 'lucide-react';
import { Batch, BatchSchedule, ScheduleSlot, CellSlots } from '@/types/schedule';
import { isDualSlot } from '@/utils/scheduleHelpers';
import { generateRoutinePDF } from '@/utils/pdfGenerator';
import { computeClassDays } from '@/utils/classDaysUtils';
import { parseISO } from 'date-fns';

const ADMIN_API_URL = 'https://wkvicmgacjdoraoufprw.supabase.co/functions/v1/admin';

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

interface ApiScheduleSlot {
  id: string;
  batch_id: string;
  day: string;
  slot_index: number;
  slot_position: number; // 0 = first/only, 1 = second slot
  course_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  group_name: string | null;
  courses: {
    id: string;
    code: string;
    name: string;
    type: 'theory' | 'sessional';
    color: string;
    credit: number | null;
  } | null;
  teachers: {
    id: string;
    short_name: string;
    full_name: string;
  } | null;
  rooms: {
    id: string;
    name: string;
    building: string | null;
  } | null;
}




const BATCH_STORAGE_KEY = 'ete-routine-active-batch';

// Check if accessed from app (URL has ?app=true)
const isFromApp = () => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('app') === 'true';
  }
  return false;
};

const Index = ({ view = 'students' }: { view?: 'students' | 'teachers' | 'classrooms' | 'holidays' }) => {
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState('');
  const { holidays } = useHolidays();
  const { mods } = useWeeklyMods(getWeekStart());
  const [loading, setLoading] = useState(true);
  const [showAppDownload, setShowAppDownload] = useState(false);
  const [androidAvailable, setAndroidAvailable] = useState(false);
  const [iosAvailable, setIosAvailable] = useState(false);

  // Check app availability
  useEffect(() => {
    fetch('/ETERoutine.apk', { method: 'HEAD' })
      .then(response => setAndroidAvailable(response.ok))
      .catch(() => setAndroidAvailable(false));

    fetch('/ETERoutine.ipa', { method: 'HEAD' })
      .then(response => setIosAvailable(response.ok))
      .catch(() => setIosAvailable(false));
  }, []);

  // Check if should show app download (mobile/tablet only, not from app)
  useEffect(() => {
    const checkShowDownload = () => {
      const isMobileOrTablet = window.innerWidth < 1024; // lg breakpoint
      setShowAppDownload(isMobileOrTablet && !isFromApp());
    };
    
    checkShowDownload();
    window.addEventListener('resize', checkShowDownload);
    return () => window.removeEventListener('resize', checkShowDownload);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Save active batch to localStorage
  useEffect(() => {
    if (activeBatch) {
      localStorage.setItem(BATCH_STORAGE_KEY, activeBatch);
    }
  }, [activeBatch]);

  // Calculate actual weeks considering mid-break and vacant weeks
  const calculateActualWeeks = (batch: Batch): number => {
    const baseWeeks = 13;
    let actualWeeks = baseWeeks;
    
    // Subtract vacant weeks
    if (batch.semesterInfo.vacantWeeks) {
      actualWeeks -= batch.semesterInfo.vacantWeeks;
    }
    
    // Subtract mid-break if it exists (counts as 1 week)
    if (batch.semesterInfo.midBreakStart && batch.semesterInfo.midBreakEnd) {
      actualWeeks -= 1;
    }
    
    return Math.max(actualWeeks, 1);
  };

  // Calculate current week based on start date
  const calculateCurrentWeek = (batch: Batch): number => {
    try {
      const startDate = new Date(batch.semesterInfo.startDate);
      const today = new Date();
      
      startDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const currentWeek = diffWeeks + 1;
      
      const actualWeeks = calculateActualWeeks(batch);
      
      if (currentWeek > actualWeeks) {
        return actualWeeks;
      }
      
      return currentWeek;
    } catch (error) {
      return 1;
    }
  };

  const fetchData = async () => {
    setLoading(true); setLoadError(false);
    try {
      const [batchesRes, slotsRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/batches`),
        fetch(`${ADMIN_API_URL}/schedule-slots`)
      ]);

      if (!batchesRes.ok || !slotsRes.ok) throw new Error('Unable to load routine');
      const apiBatches: ApiBatch[] = await batchesRes.json();
      const apiSlots: ApiScheduleSlot[] = await slotsRes.json();

      // Sort batches by level (higher first), then by term (higher first)
      const sortedBatches = apiBatches
        .filter(b => b.is_active)
        .sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return b.term - a.term;
        });

      // Transform API data to frontend format
      const transformedBatches: Batch[] = sortedBatches.map(batch => {
        // Filter slots for this batch
        const batchSlots = apiSlots.filter(slot => slot.batch_id === batch.id);

        // Build schedule object - group by day and slot_index
        const schedule: BatchSchedule = {};
        
        // First, organize slots by day + slot_index
        const slotGroups: Record<string, ApiScheduleSlot[]> = {};
        
        batchSlots.forEach(slot => {
          if (slot.courses && slot.teachers) {
            const key = `${slot.day}-${slot.slot_index}`;
            if (!slotGroups[key]) {
              slotGroups[key] = [];
            }
            slotGroups[key].push(slot);
          }
        });
        
        // Now convert groups to CellSlots
        Object.entries(slotGroups).forEach(([key, slots]) => {
          const [day, indexStr] = key.split('-');
          const slotIndex = parseInt(indexStr);
          
          if (!schedule[day]) {
            schedule[day] = {};
          }
          
          // Sort by slot_position
          slots.sort((a, b) => (a.slot_position || 0) - (b.slot_position || 0));
          
          const transformSlot = (s: ApiScheduleSlot): ScheduleSlot => ({
            id: s.id,
            courseCode: s.courses!.code,
            courseName: s.courses!.name,
            teacherShortName: s.teachers!.short_name,
            teacherFullName: s.teachers!.full_name,
            room: s.rooms?.name || '_ _ _',
            type: s.courses!.type,
            color: s.courses!.color,
            groupName: s.group_name || undefined,
            credit: s.courses!.credit !== null ? s.courses!.credit : undefined,
            slotPosition: s.slot_position || 0,
          });
          
          if (slots.length === 2) {
            // Dual slot
            schedule[day][slotIndex] = [transformSlot(slots[0]), transformSlot(slots[1])];
          } else if (slots.length === 1) {
            // Single slot
            schedule[day][slotIndex] = transformSlot(slots[0]);
          }
        });

        return {
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
          schedule
        };
      });

      setBatches(transformedBatches);
      if (transformedBatches.length > 0 && !activeBatch) {
        // Try to restore from localStorage, fallback to first batch
        const savedBatch = localStorage.getItem(BATCH_STORAGE_KEY);
        const validBatch = transformedBatches.find(b => b.id === savedBatch);
        setActiveBatch(validBatch ? validBatch.id : transformedBatches[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const currentBatch = batches.find((b) => b.id === activeBatch);
  const modifiedSchedule = currentBatch
    ? applyWeeklyModifications(
        currentBatch.schedule,
        mods.filter((m) => m.batch_id === currentBatch.id),
      )
    : undefined;

  // Batches on mid-break or already finished classes should not appear in
  // teacher / room schedules.
  const isBatchInactiveNow = (b: Batch) => {
    const { isSemesterComplete } = computeClassDays(b.semesterInfo, holidays);
    if (isSemesterComplete) return true;
    const { midBreakStart, midBreakEnd } = b.semesterInfo;
    if (midBreakStart && midBreakEnd) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const s = parseISO(midBreakStart);
      const e = parseISO(midBreakEnd);
      if (today >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
          today <= new Date(e.getFullYear(), e.getMonth(), e.getDate())) {
        return true;
      }
    }
    return false;
  };

  const modifiedBatches = batches
    .filter((b) => !isBatchInactiveNow(b))
    .map((b) => ({
      ...b,
      schedule: applyWeeklyModifications(
        b.schedule,
        mods.filter((m) => m.batch_id === b.id),
      ),
    }));

  if (view !== 'students') {
    const title = { teachers: 'Find a teacher’s schedule', classrooms: 'Find your classroom', holidays: 'Plan around the academic calendar' }[view];
    return <div className="min-h-screen bg-background"><Header/><main className="container px-4 py-8 sm:px-6 space-y-6"><div className="page-intro"><Link to="/" className="text-sm text-primary">← Student routine</Link><p className="eyebrow mt-6">CAMPUS DIRECTORY</p><h1 className="text-2xl sm:text-4xl font-bold tracking-tight mt-2">{title}</h1><p className="text-muted-foreground mt-3">{view === 'holidays' ? 'Browse holidays and weekends, month by month.' : 'Search by name, view the weekly timetable, and download a copy.'}</p></div>
    {view === 'holidays' ? <HolidayCalendarModal open onOpenChange={()=>navigate('/')}/> : loading ? <p role="status">Loading schedules…</p> : loadError ? <div role="alert">Could not load schedules. <Button onClick={fetchData}>Try again</Button></div> : view === 'teachers' ? <TeacherScheduleModal open onOpenChange={()=>navigate('/')} batches={modifiedBatches}/> : <RoomScheduleModal open onOpenChange={()=>navigate('/')} batches={modifiedBatches}/>}
    </main></div>;
  }
  if (loadError) return <div className="min-h-screen"><Header/><main className="container p-8"><h1 className="text-2xl font-bold">Routine unavailable</h1><p className="my-4">We could not connect to the schedule service. Please try again.</p><Button onClick={fetchData}>Retry</Button></main></div>;
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-8 sm:py-12 text-center">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">No Active Batches</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            No routines are available at the moment. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container px-4 sm:px-6 pt-8 pb-5 page-intro"><p className="eyebrow">ELECTRONICS & TELECOMMUNICATION ENGINEERING</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Your week, at a glance.</h1><p className="text-muted-foreground mt-3">Choose your batch to see classes, rooms, and semester progress.</p></div>
      <BatchTabs
        batches={batches}
        activeBatch={activeBatch}
        onBatchChange={setActiveBatch}
      />

      <main className="container px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {/* Page Title with Download Button */}
        <div className="mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-tight">
              {currentBatch?.name} Routine
            </h1>
            {currentBatch && (
              <Button
                onClick={() => void generateRoutinePDF(currentBatch)}
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 px-2.5 sm:px-3 gap-1 text-xs sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Download
              </Button>
            )}
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">
            Electronics and Telecommunication Engineering, CUET
          </p>
        </div>

        {/* Semester Info Card */}
        {currentBatch && (
          <SemesterInfoCard 
            semesterInfo={currentBatch.semesterInfo}
            holidays={holidays}
          />
        )}

        {/* Course Legend */}
        <Legend schedule={currentBatch?.schedule} />

        {/* Schedule Grid */}
        <div className="mt-3 sm:mt-4 md:mt-6">
          {currentBatch && modifiedSchedule && (
            <ScheduleGrid schedule={modifiedSchedule} />
          )}
        </div>
      </main>


      
{/* Footer */}
<footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-8">
  <div className="container px-4 py-8">
    {/* Divider */}
    <div className="h-px bg-slate-200 dark:bg-slate-800 mb-6"></div>

    {/* Info Section */}
    <div className="text-center space-y-2">
      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        ETE Class Routine
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Electronics and Telecommunication Engineering
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center justify-center gap-2">
        All Batches • Real-time Updates •
        <Link 
          to="/display" 
          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
        >
          <Monitor className="h-3 w-3" />
          Display
        </Link>
      </p>
    </div>

    {/* Copyright */}
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
      <p className="text-xs text-center text-slate-500 dark:text-slate-500">
        © {new Date().getFullYear()} ETE Department. All rights reserved.
      </p>
    </div>
  </div>
</footer>



    </div>
  );
};

export default Index;
