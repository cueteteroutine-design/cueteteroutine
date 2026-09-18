import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHolidays } from '@/lib/adminApi';
import { groupHolidaysIntoRanges, formatRangeLabel } from '@/utils/holidayHelpers';

interface Holiday {
  date: string;
  title: string;
  is_national: boolean;
}

interface HolidayCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HolidayCalendarModal({ open, onOpenChange }: HolidayCalendarModalProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    if (!open) return;
    getHolidays().then(setHolidays).catch(console.error);
  }, [open]);

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach(h => {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    });
    return map;
  }, [holidays]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString('en', { month: 'long' });

  const monthHolidays = holidays.filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const isWeekend = (day: number) => {
    const dow = new Date(currentYear, currentMonth, day).getDay();
    return dow === 5 || dow === 6;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  const getDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Holiday Calendar</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{monthName} {currentYear}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {dayNames.map(d => (
            <div key={d} className={cn(
              "py-1.5 font-semibold text-muted-foreground",
              (d === 'Fri' || d === 'Sat') && "text-destructive"
            )}>{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = getDateStr(day);
            const dayHolidays = holidayMap[dateStr];
            const weekend = isWeekend(day);
            const todayMark = isToday(day);

            return (
              <div
                key={day}
                title={dayHolidays?.map(h => h.title).join(', ') || (weekend ? 'Weekend' : '')}
                className={cn(
                  "relative py-1.5 rounded-md text-xs cursor-default transition-colors",
                  todayMark && "ring-2 ring-primary font-bold",
                  dayHolidays && "bg-destructive/15 text-destructive font-semibold",
                  !dayHolidays && weekend && "bg-muted text-muted-foreground",
                  !dayHolidays && !weekend && "text-foreground"
                )}
              >
                {day}
                {dayHolidays && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-destructive" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30" />
            Holiday
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted border border-border" />
            Weekend (Fri-Sat)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-primary" />
            Today
          </div>
        </div>

        {monthHolidays.length > 0 && (() => {
          const ranges = groupHolidaysIntoRanges(monthHolidays);
          return (
            <div className="mt-3 border-t pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Holidays this month
              </h4>
              <div className="space-y-1.5">
                {ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-right font-mono font-semibold text-destructive">
                      {formatRangeLabel(r)}
                    </span>
                    <span className="text-foreground">{r.title}</span>
                    {r.is_national && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                        National
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
