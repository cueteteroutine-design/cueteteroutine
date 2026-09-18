import { dataFetch } from '@/lib/jsonData';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, X, Clock } from 'lucide-react';
import { Batch } from '@/types/schedule';
const generateRoomSchedulePDF = async (...args: Parameters<typeof import('@/utils/roomSchedulePdf')['generateRoomSchedulePDF']>) => (await import('@/utils/roomSchedulePdf')).generateRoomSchedulePDF(...args);
import { useTimeSlots } from '@/hooks/useTimeSlots';

const cn = (...c: (string | boolean | undefined)[]) =>
  c.filter(Boolean).join(' ');

interface Room {
  id: string;
  name: string;
  building?: string;
  capacity?: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_COL_WIDTH = 80;

const ADMIN_API_URL =
  '/api/admin';

export function RoomScheduleModal({
  open,
  onOpenChange,
  batches,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  batches: Batch[];
}) {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadError,setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { timeSlots: ALL_TIME_SLOTS } = useTimeSlots();
  const TIME_SLOTS = ALL_TIME_SLOTS.filter((s) => !s.isBreak);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) fetchRooms().catch(() => setLoadError('Unable to load the directory. Please refresh.'));
  }, [open]);

  const fetchRooms = async () => {
    const res = await dataFetch(`${ADMIN_API_URL}/rooms`);
    if (!res.ok) throw new Error('Directory unavailable');
    const data = await res.json();
    setRooms(
      data.map((r: any) => ({
        id: r.id,
        name: r.name,
        building: r.building || undefined,
        capacity: r.capacity || undefined,
      }))
    );
  };

  const buildSchedule = () => {
    if (!selectedRoom) return {};
    const s: Record<string, Record<number, any[]>> = {};
    DAYS.forEach((d) => (s[d] = {}));

    batches.forEach((b) =>
      DAYS.forEach((d) => {
        const ds = b.schedule[d];
        if (!ds) return;
        Object.entries(ds).forEach(([i, v]: any) => {
          // Handle both single slots and dual slots (arrays)
          const slots = Array.isArray(v) ? v : [v];
          slots.forEach((slot: any) => {
            if (slot && slot.room === selectedRoom) {
              const idx = Number(i);
              if (!s[d][idx]) s[d][idx] = [];
              s[d][idx].push({ ...slot, batch: b.name });
            }
          });
        });
      })
    );
    return s;
  };

  // Filter rooms based on search query
  const filteredRooms = searchQuery
    ? rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.building && r.building.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : rooms; // Show all rooms when search is empty

  const schedule = buildSchedule();
  const room = rooms.find((r) => r.name === selectedRoom);

  const handleSelectRoom = (roomName: string) => {
    setSelectedRoom(roomName);
    const selected = rooms.find((r) => r.name === roomName);
    if (selected) {
      setSearchQuery(selected.building ? `${selected.name} – ${selected.building}` : selected.name);
    }
    setShowDropdown(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedRoom('');
    setShowDropdown(false);
  };

  if (!open) return null;
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-5 min-w-0">
        <div>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg font-semibold">Room Schedule</h2>
            <div className="flex items-center gap-2">
              {room && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => generateRoomSchedulePDF(room.name, room.building, batches)}
                  className="text-xs px-3 py-1 h-auto"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs px-3 py-1 h-auto"
              >
                Back to routines
              </Button>
            </div>
          </div>
        </div>

        {loadError && <p role="alert" className="text-destructive">{loadError}</p>}
        {/* Room search with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search room by name or building..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-9 pr-16"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-950 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dropdown - shows all rooms when empty, filtered when typing */}
          {showDropdown && filteredRooms.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredRooms.map((r) => (
                <button type="button"
                  key={r.id}
                  onClick={() => handleSelectRoom(r.name)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer"
                >
                  <p className="font-medium text-sm">{r.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {r.building && <span>{r.building}</span>}
                    {r.capacity && (
                      <>
                        {r.building && <span>•</span>}
                        <span>Capacity: {r.capacity}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && filteredRooms.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">No rooms found</p>
            </div>
          )}
        </div>

        {room && (
          <div className="mt-3 p-3 border rounded bg-gray-50 dark:bg-muted/20">
            <p className="font-medium">Room {room.name}</p>
            {room.building && (
              <p className="text-sm text-gray-600 dark:text-muted-foreground">
                {room.building}
              </p>
            )}
            {room.capacity && (
              <p className="text-xs text-gray-600 dark:text-muted-foreground">
                Capacity: {room.capacity} students
              </p>
            )}
          </div>
        )}

        {/* ================= SCHEDULE ================= */}
        <div className="mt-4 border rounded-lg overflow-hidden bg-white dark:bg-transparent">
          {/* Scroll container */}
          <div
            className="
              relative
              overflow-auto
              h-[60vh]
              md:h-[calc(100vh-260px)]
              pb-6
            "
          >
            {/* Grid wrapper */}
            <div className="w-full min-w-full sm:min-w-max md:min-w-full">
              {/* ===== HEADER ===== */}
              <div
                className="sticky top-0 z-30 border-b grid bg-gray-50 dark:backdrop-blur dark:bg-background/80"
                style={{
                  gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAYS.length}, minmax(160px, 1fr))`,
                }}
              >
                <div className="flex items-center justify-center text-xs font-medium border-r p-2">
                  Time
                </div>

                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold border-r py-2 p-2 bg-gray-50 dark:backdrop-blur dark:bg-background/80"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* ===== GRID BODY ===== */}
              <div className="grid auto-rows-min">
                {TIME_SLOTS.map((slot, index) => (
                  <div
                    key={slot.index}
                    className="grid"
                    style={{
                      gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAYS.length}, minmax(160px, 1fr))`,
                    }}
                  >
                    {/* Time cell */}
                    <div
                      className={cn(
                        `sticky left-0 z-20
                        flex items-center justify-center
                        text-sm font-mono
                        border-r border-b
                        bg-gray-50 dark:backdrop-blur dark:bg-background/80
                        p-2`,
                        index === TIME_SLOTS.length - 1 && 'md:pb-8 sm:pb-6'
                      )}
                    >
                      {slot.start}
                    </div>

                    {/* Day cells */}
                    {DAYS.map((day) => {
                      const cells = schedule[day]?.[slot.index] as any[] | undefined;
                      const hasCells = cells && cells.length > 0;
                      const isDual = cells && cells.length > 1;
                      return (
                        <div
                          key={day}
                          className={cn(
                            "border-r border-b text-xs",
                            hasCells 
                              ? "p-0" 
                              : "bg-gray-50 dark:bg-muted/10"
                          )}
                        >
                          {hasCells && (
                            <div className={cn(
                              "h-full w-full",
                              isDual ? "grid grid-cols-2" : "flex"
                            )}>
                              {cells.map((cell, cellIdx) => {
                                const isCancelled = cell.modification === 'cancelled';
                                const isRescheduled = cell.modification === 'rescheduled';
                                return (
                                <div
                                  key={cellIdx}
                                  className={cn(
                                    "flex-1 p-1.5 border-l-2 flex flex-col justify-center",
                                    isCancelled && "opacity-60"
                                  )}
                                  style={{
                                    backgroundColor: isCancelled ? undefined : `hsl(${cell.color} / ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.15 : 0.1})`,
                                    borderLeftColor: isCancelled ? undefined : `hsl(${cell.color})`,
                                  }}
                                >
                                  <p
                                    className={cn(
                                      "font-mono font-semibold text-[11px] leading-tight inline-flex items-center gap-1",
                                      isCancelled && "line-through"
                                    )}
                                    style={{ color: isCancelled ? undefined : `hsl(${cell.color})` }}
                                  >
                                    {isRescheduled && <Clock className="h-3 w-3" />}
                                    {cell.courseCode}
                                    {isCancelled && <X className="h-3 w-3 text-red-500" strokeWidth={3} />}
                                  </p>

                                  {cell.groupName && (
                                    <p className="text-[10px] font-medium text-gray-800 dark:text-foreground leading-tight mt-0.5">
                                      {cell.groupName}
                                    </p>
                                  )}

                                  <p className="text-[10px] text-gray-600 dark:text-muted-foreground font-medium leading-tight mt-0.5">
                                    {cell.batch}
                                  </p>

                                  <p className="text-[10px] text-gray-600 dark:text-muted-foreground leading-tight">
                                    {cell.teacherShortName}
                                  </p>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                
                {/* ===== EXTRA PADDING ROW FOR TABLET AND LARGER ===== */}
                <div className="hidden sm:block">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAYS.length}, minmax(160px, 1fr))`,
                    }}
                  >
                    <div className="border-r p-2 bg-gray-50 dark:backdrop-blur dark:bg-background/80" />
                    
                    {DAYS.map((day) => (
                      <div key={day} className="border-r p-2 bg-gray-50 dark:bg-muted/20" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}
