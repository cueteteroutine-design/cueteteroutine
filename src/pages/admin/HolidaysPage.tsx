import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, CalendarRange, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHolidays, createHoliday, createHolidaysBulk, updateHoliday, deleteHoliday, fetchOnlineHolidays, type Holiday } from '@/lib/adminApi';
import { getTimeSettings, updateTimeSettings } from '@/lib/adminApi';
import { DEFAULT_TIME_SLOTS, TimeSlot } from '@/utils/timeSlots';
import { toast } from '@/hooks/use-toast';
import { groupHolidaysIntoRanges, formatRangeLabel } from '@/utils/holidayHelpers';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HolidaysPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formIsNational, setFormIsNational] = useState(true);

  // Range form
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeTitle, setRangeTitle] = useState('');
  const [rangeIsNational, setRangeIsNational] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Time settings
  const [useCustomTimes, setUseCustomTimes] = useState(false);
  const [customSlots, setCustomSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [savingTimes, setSavingTimes] = useState(false);
  const [timeLoading, setTimeLoading] = useState(true);

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHolidays();
      setHolidays(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load holidays', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getTimeSettings();
        if (!alive) return;
        setUseCustomTimes(!!s.use_custom);
        if (Array.isArray(s.custom_slots) && s.custom_slots.length > 0) {
          // Merge with defaults to fill gaps
          const merged = DEFAULT_TIME_SLOTS.map((def) => {
            const c = (s.custom_slots as TimeSlot[]).find((x) => Number(x.index) === def.index);
            return c ? { ...def, start: c.start || def.start, end: c.end || def.end } : def;
          });
          setCustomSlots(merged);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setTimeLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const updateSlotField = (index: number, key: 'start' | 'end', value: string) => {
    setCustomSlots((prev) => prev.map((s) => s.index === index ? { ...s, [key]: value } : s));
  };

  const handleSaveTimes = async () => {
    setSavingTimes(true);
    try {
      await updateTimeSettings({ use_custom: useCustomTimes, custom_slots: customSlots });
      toast({ title: 'Saved', description: useCustomTimes ? 'Custom time schedule applied' : 'Standard time schedule applied' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save time settings', variant: 'destructive' });
    } finally {
      setSavingTimes(false);
    }
  };

  const handleResetTimes = () => setCustomSlots(DEFAULT_TIME_SLOTS);

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach(h => {
      const dateStr = h.date;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(h);
    });
    return map;
  }, [holidays]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('en', { month: 'long' });

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const getDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const isWeekend = (day: number) => {
    const dow = new Date(currentYear, currentMonth, day).getDay();
    return dow === 5 || dow === 6;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  // Click on a day
  const handleDayClick = (day: number) => {
    const dateStr = getDateStr(day);
    const existing = holidayMap[dateStr];
    if (existing && existing.length > 0) {
      // Edit the first holiday on this date
      setSelectedHoliday(existing[0]);
      setSelectedDate(dateStr);
      setFormTitle(existing[0].title);
      setFormIsNational(existing[0].is_national);
    } else {
      // Add new holiday
      setSelectedHoliday(null);
      setSelectedDate(dateStr);
      setFormTitle('');
      setFormIsNational(true);
    }
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Error', description: 'Holiday title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (selectedHoliday) {
        await updateHoliday(selectedHoliday.id, { title: formTitle.trim(), is_national: formIsNational });
        toast({ title: 'Updated', description: 'Holiday updated successfully' });
      } else {
        await createHoliday({ date: selectedDate, title: formTitle.trim(), is_national: formIsNational });
        toast({ title: 'Created', description: 'Holiday added successfully' });
      }
      await loadHolidays();
      setEditModalOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHoliday) return;
    setSaving(true);
    try {
      await deleteHoliday(selectedHoliday.id);
      toast({ title: 'Deleted', description: 'Holiday removed successfully' });
      await loadHolidays();
      setEditModalOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRangeSave = async () => {
    if (!rangeStart || !rangeEnd || !rangeTitle.trim()) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (start > end) {
      toast({ title: 'Error', description: 'Start date must be before end date', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const entries: { date: string; title: string; is_national: boolean }[] = [];
      const current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        entries.push({ date: `${y}-${m}-${d}`, title: rangeTitle.trim(), is_national: rangeIsNational });
        current.setDate(current.getDate() + 1);
      }
      await createHolidaysBulk(entries);
      toast({ title: 'Created', description: `${entries.length} holiday days added` });
      await loadHolidays();
      setRangeModalOpen(false);
      setRangeStart('');
      setRangeEnd('');
      setRangeTitle('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add holidays', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Holidays for current month list
  const monthHolidays = holidays.filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthRanges = useMemo(() => groupHolidaysIntoRanges(monthHolidays), [monthHolidays]);

  const handleFetchOnline = async () => {
    setFetching(true);
    try {
      const result = await fetchOnlineHolidays();
      toast({
        title: 'Synced',
        description: `Synced ${result.added} BD national holidays (${result.window.from} → ${result.window.to})`,
      });
      await loadHolidays();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to sync national holidays', variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Holiday Calendar</h2>
          <p className="text-sm text-muted-foreground">Tap any day to add or edit holidays</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleFetchOnline} disabled={fetching} className="gap-2">
            <Download className="h-4 w-4" />
            {fetching ? 'Syncing...' : 'Sync BD National Holidays'}
          </Button>
          <Button onClick={() => setRangeModalOpen(true)} className="gap-2">
            <CalendarRange className="h-4 w-4" />
            Add Date Range
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base sm:text-lg">{monthName} {currentYear}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES.map(d => (
                  <div key={d} className={cn(
                    "py-2 text-xs font-semibold text-muted-foreground",
                    (d === 'Fri' || d === 'Sat') && "text-destructive"
                  )}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = getDateStr(day);
                  const dayHolidays = holidayMap[dateStr];
                  const weekend = isWeekend(day);
                  const todayMark = isToday(day);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "relative py-2 sm:py-3 rounded-lg text-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer",
                        todayMark && "ring-2 ring-primary font-bold",
                        dayHolidays && "bg-destructive/15 text-destructive font-semibold",
                        !dayHolidays && weekend && "bg-muted text-muted-foreground",
                        !dayHolidays && !weekend && "text-foreground hover:bg-accent"
                      )}
                      title={dayHolidays?.map(h => h.title).join(', ') || (weekend ? 'Weekend' : 'Click to add holiday')}
                    >
                      {day}
                      {dayHolidays && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-destructive" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30" />
                  Holiday
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-muted border border-border" />
                  Weekend
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded ring-2 ring-primary" />
                  Today
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Holidays list for current month */}
      {monthHolidays.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Holidays in {monthName} {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthRanges.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-12 text-right font-mono font-semibold text-destructive text-sm">
                      {formatRangeLabel(r)}
                    </span>
                    <span className="text-sm truncate">{r.title}</span>
                    {r.is_national && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full shrink-0">
                        National
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Schedule Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Time Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose the standard class times or set custom times used across all routines and PDFs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {timeLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={useCustomTimes} onCheckedChange={setUseCustomTimes} />
                <Label>{useCustomTimes ? 'Using custom times' : 'Using standard times'}</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customSlots.map((s) => (
                  <div key={s.index} className="p-3 rounded-lg border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase text-muted-foreground">
                        Period {s.index + 1}{s.isBreak ? ' (Break)' : ''}
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={s.start}
                        disabled={!useCustomTimes}
                        onChange={(e) => updateSlotField(s.index, 'start', e.target.value)}
                        placeholder="Start"
                      />
                      <Input
                        value={s.end}
                        disabled={!useCustomTimes}
                        onChange={(e) => updateSlotField(s.index, 'end', e.target.value)}
                        placeholder="End"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={handleResetTimes} disabled={savingTimes || !useCustomTimes}>
                  Reset to Standard
                </Button>
                <Button onClick={handleSaveTimes} disabled={savingTimes}>
                  {savingTimes ? 'Saving...' : 'Save Time Settings'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add single holiday modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <p className="font-medium">{selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Independence Day"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formIsNational} onCheckedChange={setFormIsNational} />
              <Label>National Holiday</Label>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {selectedHoliday && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : selectedHoliday ? 'Update' : 'Add Holiday'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Range modal */}
      <Dialog open={rangeModalOpen} onOpenChange={setRangeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Holiday Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={rangeTitle}
                onChange={e => setRangeTitle(e.target.value)}
                placeholder="e.g. Eid-ul-Fitr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={rangeIsNational} onCheckedChange={setRangeIsNational} />
              <Label>National Holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRangeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRangeSave} disabled={saving}>
              {saving ? 'Adding...' : 'Add Holidays'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
