import { useEffect, useMemo, useState } from 'react';
import {
  getBatches,
  getScheduleSlots,
  getRooms,
  getWeeklyMods,
  createWeeklyMod,
  deleteWeeklyMod,
  Batch as ApiBatch,
  ScheduleSlot as ApiScheduleSlot,
  Room,
  WeeklyModificationRow,
} from '@/lib/adminApi';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { getWeekStart, getNextWeekStart } from '@/utils/weeklyMods';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Clock, X, Trash2 } from 'lucide-react';
import { DAYS } from '@/types/schedule';

function fmt(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WeeklyModsPage() {
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [slots, setSlots] = useState<ApiScheduleSlot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mods, setMods] = useState<WeeklyModificationRow[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [weekMode, setWeekMode] = useState<'this' | 'next'>('this');
  const { timeSlots } = useTimeSlots();
  const [dialogCell, setDialogCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Reschedule form state
  const [rescheduleSourceId, setRescheduleSourceId] = useState<string>('');
  const [rescheduleRoomId, setRescheduleRoomId] = useState<string>('');
  // Position is auto-determined based on cell occupancy

  const weekStart = weekMode === 'this' ? getWeekStart() : getNextWeekStart();

  useEffect(() => {
    (async () => {
      const [b, s, r] = await Promise.all([getBatches(), getScheduleSlots(), getRooms()]);
      setBatches(b.filter((x) => x.is_active));
      setSlots(s);
      setRooms(r);
      if (!batchId && b.length) setBatchId(b.find((x) => x.is_active)?.id || b[0].id);
    })();
  }, []);

  const reloadMods = async () => {
    if (!batchId) return;
    setMods(await getWeeklyMods(batchId, weekStart));
  };

  useEffect(() => { void reloadMods(); }, [batchId, weekStart]);

  const batchSlots = useMemo(() => slots.filter((s) => s.batch_id === batchId), [slots, batchId]);

  // Unique courses (course+group+teacher) available in this batch — one entry per distinct class
  const uniqueCourseOptions = useMemo(() => {
    const seen = new Map<string, ApiScheduleSlot>();
    for (const s of batchSlots) {
      if (!s.courses || !s.teachers) continue;
      const key = `${s.courses.code}|${s.group_name ?? ''}|${s.teachers.short_name}`;
      if (!seen.has(key)) seen.set(key, s);
    }
    return Array.from(seen.values()).sort((a, b) =>
      (a.courses!.code + (a.group_name ?? '')).localeCompare(b.courses!.code + (b.group_name ?? ''))
    );
  }, [batchSlots]);

  // Build a lookup: day -> slotIndex -> ApiScheduleSlot[] (0/1 positions)
  const cellMap = useMemo(() => {
    const m: Record<string, Record<number, ApiScheduleSlot[]>> = {};
    for (const s of batchSlots) {
      if (!s.courses || !s.teachers) continue;
      m[s.day] = m[s.day] || {};
      m[s.day][s.slot_index] = m[s.day][s.slot_index] || [];
      m[s.day][s.slot_index].push(s);
    }
    return m;
  }, [batchSlots]);

  const cancelMap = useMemo(() => {
    const m = new Set<string>();
    for (const mod of mods) {
      if (mod.action === 'cancel') m.add(`${mod.source_day}-${mod.source_slot_index}-${mod.source_slot_position}`);
    }
    return m;
  }, [mods]);

  const targetMap = useMemo(() => {
    const m: Record<string, WeeklyModificationRow> = {};
    for (const mod of mods) {
      if (mod.action === 'reschedule' && mod.target_day && mod.target_slot_index !== null) {
        m[`${mod.target_day}-${mod.target_slot_index}-${mod.target_slot_position ?? 0}`] = mod;
      }
    }
    return m;
  }, [mods]);

  const handleCancel = async (position: number) => {
    if (!dialogCell) return;
    setBusy(true);
    try {
      const cellSlots = cellMap[dialogCell.day]?.[dialogCell.slotIndex] || [];
      const src = cellSlots.find((s) => (s.slot_position ?? 0) === position) || cellSlots[0];
      await createWeeklyMod({
        batch_id: batchId,
        week_start: weekStart,
        action: 'cancel',
        source_day: dialogCell.day,
        source_slot_index: dialogCell.slotIndex,
        source_slot_position: position,
        source_slot_id: src?.id || null,
        target_day: null,
        target_slot_index: null,
        target_slot_position: null,
        target_room_id: null,
      });
      toast({ title: 'Class cancelled' });
      await reloadMods();
      setDialogCell(null);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const handleReschedule = async () => {
    if (!dialogCell || !rescheduleSourceId) return;
    const src = batchSlots.find((s) => s.id === rescheduleSourceId);
    if (!src) return;
    setBusy(true);
    try {
      // Auto-pick position: use 0 if free, else 1
      const existing = cellMap[dialogCell.day]?.[dialogCell.slotIndex] || [];
      const occupied0 = existing.some((s) => (s.slot_position ?? 0) === 0);
      const targetPosition = occupied0 ? 1 : 0;
      await createWeeklyMod({
        batch_id: batchId,
        week_start: weekStart,
        action: 'reschedule',
        source_day: src.day,
        source_slot_index: src.slot_index,
        source_slot_position: src.slot_position ?? 0,
        source_slot_id: src.id,
        target_day: dialogCell.day,
        target_slot_index: dialogCell.slotIndex,
        target_slot_position: targetPosition,
        target_room_id: rescheduleRoomId || null,
      });
      toast({ title: 'Class rescheduled' });
      await reloadMods();
      setDialogCell(null);
      setRescheduleSourceId('');
      setRescheduleRoomId('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteWeeklyMod(id);
      await reloadMods();
      toast({ title: 'Removed' });
    } finally { setBusy(false); }
  };

  const currentCellSlots = dialogCell ? cellMap[dialogCell.day]?.[dialogCell.slotIndex] || [] : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Weekly Routine Modifications</h1>
        <p className="text-sm text-muted-foreground">Cancel or reschedule classes for a single week. Auto-clears every Friday.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>Batch</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Week</Label>
          <Select value={weekMode} onValueChange={(v) => setWeekMode(v as 'this' | 'next')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this">This week ({fmt(getWeekStart())})</SelectItem>
              <SelectItem value="next">Next week ({fmt(getNextWeekStart())})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <Card className="p-2 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left">Time</th>
              {DAYS.map((d) => <th key={d} className="p-1 text-left">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((ts) => (
              <tr key={ts.index} className="border-t">
                <td className="p-1 whitespace-nowrap text-muted-foreground">{ts.start}-{ts.end}</td>
                {DAYS.map((day) => {
                  const cellSlots = cellMap[day]?.[ts.index] || [];
                  const target = targetMap[`${day}-${ts.index}-0`] || targetMap[`${day}-${ts.index}-1`];
                  return (
                    <td
                      key={day}
                      className="p-1 border-l align-top cursor-pointer hover:bg-accent/50"
                      onClick={() => !ts.isBreak && setDialogCell({ day, slotIndex: ts.index })}
                    >
                      {ts.isBreak ? (
                        <span className="text-muted-foreground">Break</span>
                      ) : (
                        <div className="space-y-1">
                          {cellSlots.map((s) => {
                            const isCancelled = cancelMap.has(`${day}-${ts.index}-${s.slot_position ?? 0}`);
                            return (
                              <div
                                key={s.id}
                                className={`px-1.5 py-1 rounded border-l-2 ${isCancelled ? 'bg-muted grayscale line-through' : ''}`}
                                style={{
                                  backgroundColor: isCancelled ? undefined : `hsl(${s.courses!.color} / 0.12)`,
                                  borderLeftColor: isCancelled ? undefined : `hsl(${s.courses!.color})`,
                                }}
                              >
                                <span className="font-mono font-semibold inline-flex items-center gap-1">
                                  {s.courses!.code}
                                  {s.group_name && <span className="text-muted-foreground">({s.group_name})</span>}
                                  {isCancelled && <X className="h-3 w-3 text-red-500" strokeWidth={3} />}
                                </span>
                              </div>
                            );
                          })}
                          {target && target.source_slot?.courses && (
                            <div
                              className="px-1.5 py-1 rounded border-l-2"
                              style={{
                                backgroundColor: `hsl(${target.source_slot.courses.color} / 0.18)`,
                                borderLeftColor: `hsl(${target.source_slot.courses.color})`,
                              }}
                            >
                              <span className="font-mono font-semibold inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {target.source_slot.courses.code}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Existing mods list */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Active modifications ({mods.length})</h3>
        {mods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No modifications for this week.</p>
        ) : (
          <ul className="space-y-2">
            {mods.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm border rounded p-2">
                <span className="inline-flex items-center gap-2">
                  {m.action === 'cancel' ? (
                    <><X className="h-4 w-4 text-red-500" /> Cancel {m.source_slot?.courses?.code || '?'} — {m.source_day} slot {m.source_slot_index + 1}</>
                  ) : (
                    <><Clock className="h-4 w-4 text-primary" /> Reschedule {m.source_slot?.courses?.code || '?'} from {m.source_day} #{m.source_slot_index + 1} → {m.target_day} #{(m.target_slot_index ?? 0) + 1}{m.target_room ? ` @ ${m.target_room.name}` : ''}</>
                  )}
                </span>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Cell action dialog */}
      <Dialog open={!!dialogCell} onOpenChange={(o) => !o && setDialogCell(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogCell?.day} — slot #{(dialogCell?.slotIndex ?? 0) + 1}
            </DialogTitle>
          </DialogHeader>

          {currentCellSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Cancel existing class</p>
              {currentCellSlots.map((s) => {
                const pos = s.slot_position ?? 0;
                const alreadyCancelled = cancelMap.has(`${dialogCell!.day}-${dialogCell!.slotIndex}-${pos}`);
                return (
                  <Button
                    key={s.id}
                    variant="destructive"
                    size="sm"
                    className="w-full justify-start"
                    disabled={busy || alreadyCancelled}
                    onClick={() => handleCancel(pos)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel {s.courses?.code} {s.group_name && `(${s.group_name})`} {alreadyCancelled && '— already cancelled'}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Reschedule an existing class into this cell</p>
            <div>
              <Label>Pick a course</Label>
              <Select value={rescheduleSourceId} onValueChange={setRescheduleSourceId}>
                <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                <SelectContent>
                  {uniqueCourseOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.courses?.code}{s.group_name ? ` (${s.group_name})` : ''} — {s.teachers?.short_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room (optional override)</Label>
              <Select value={rescheduleRoomId} onValueChange={setRescheduleRoomId}>
                <SelectTrigger><SelectValue placeholder="Keep original" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCell(null)} disabled={busy}>Close</Button>
            <Button onClick={handleReschedule} disabled={busy || !rescheduleSourceId}>
              <Clock className="h-4 w-4 mr-2" /> Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}