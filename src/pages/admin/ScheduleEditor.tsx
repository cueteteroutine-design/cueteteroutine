import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getBatches, getCourses, getTeachers, getRooms, getScheduleSlots, upsertSlot, deleteScheduleSlot, Batch, Course, Teacher, Room, ScheduleSlot } from '@/lib/adminApi';
import { ArrowLeft, Save, X, Clock, CalendarDays, BookOpen, User, Building, Plus, Trash2, Loader2, Copy, ClipboardPaste } from 'lucide-react';
import { DAYS } from '@/types/schedule';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SlotFormData {
  course_id: string;
  teacher_id: string;
  room_id: string;
  group_name: string;
}

const emptyForm: SlotFormData = { course_id: '', teacher_id: '', room_id: '', group_name: '' };

export default function ScheduleEditor() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingSlot, setEditingSlot] = useState<{ day: string; slotIndex: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'slot0' | 'slot1'>('slot0');
  const [slotForm0, setSlotForm0] = useState<SlotFormData>(emptyForm);
  const [slotForm1, setSlotForm1] = useState<SlotFormData>(emptyForm);
  const [hasDualSlot, setHasDualSlot] = useState(false);
  
  // Copy-paste state
  const [copiedSlot, setCopiedSlot] = useState<{ slot0: SlotFormData; slot1: SlotFormData | null } | null>(null);
  const { timeSlots: TIME_SLOTS } = useTimeSlots();

  useEffect(() => {
    async function loadData() {
      if (!batchId) return;
      try {
        const [batchesData, coursesData, teachersData, roomsData, slotsData] = await Promise.all([
          getBatches(),
          getCourses(),
          getTeachers(),
          getRooms(),
          getScheduleSlots(batchId),
        ]);
        const foundBatch = batchesData.find(b => b.id === batchId);
        setBatch(foundBatch || null);
        setCourses(coursesData);
        setTeachers(teachersData);
        setRooms(roomsData);
        setSlots(slotsData);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [batchId]);

  const getFilteredCourses = (selectedCourseId?: string) => {
    if (!batch) return courses;
    return courses.filter(c => 
      c.id === selectedCourseId ||
      (c.level === null || c.level === batch.level) && 
      (c.term === null || c.term === batch.term)
    );
  };

  const getSlotsData = (day: string, slotIndex: number) => {
    return slots.filter(s => s.day === day && s.slot_index === slotIndex)
      .sort((a, b) => (a.slot_position || 0) - (b.slot_position || 0));
  };

  const handleCellClick = (day: string, slotIndex: number) => {
    const cellSlots = getSlotsData(day, slotIndex);
    const slot0 = cellSlots.find(s => (s.slot_position || 0) === 0);
    const slot1 = cellSlots.find(s => s.slot_position === 1);
    
    setEditingSlot({ day, slotIndex });
    setSlotForm0({
      course_id: slot0?.course_id || '',
      teacher_id: slot0?.teacher_id || '',
      room_id: slot0?.room_id || '',
      group_name: slot0?.group_name || '',
    });
    setSlotForm1({
      course_id: slot1?.course_id || '',
      teacher_id: slot1?.teacher_id || '',
      room_id: slot1?.room_id || '',
      group_name: slot1?.group_name || '',
    });
    setHasDualSlot(!!slot1?.course_id);
    setActiveTab('slot0');
  };

  const handleSaveSlot = async (position: 0 | 1) => {
    if (!editingSlot || !batchId) return;
    setSaving(true);
    const form = position === 0 ? slotForm0 : slotForm1;
    try {
      await upsertSlot({
        batch_id: batchId,
        day: editingSlot.day,
        slot_index: editingSlot.slotIndex,
        slot_position: position,
        course_id: form.course_id || null,
        teacher_id: form.teacher_id || null,
        room_id: form.room_id || null,
        group_name: form.group_name || null,
      });
      const updatedSlots = await getScheduleSlots(batchId);
      setSlots(updatedSlots);
      toast({ title: 'Saved', description: `Slot ${position === 0 ? '1' : '2'} updated` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save slot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearSlot = async (position: 0 | 1) => {
    if (!editingSlot || !batchId) return;
    const cellSlots = getSlotsData(editingSlot.day, editingSlot.slotIndex);
    const slot = cellSlots.find(s => (s.slot_position || 0) === position);
    
    setSaving(true);
    try {
      if (slot?.id) {
        await deleteScheduleSlot(slot.id);
      }
      const updatedSlots = await getScheduleSlots(batchId);
      setSlots(updatedSlots);
      
      if (position === 0) {
        setSlotForm0(emptyForm);
      } else {
        setSlotForm1(emptyForm);
        setHasDualSlot(false);
        setActiveTab('slot0');
      }
      toast({ title: 'Cleared', description: `Slot ${position === 0 ? '1' : '2'} cleared` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear slot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSecondSlot = () => {
    setHasDualSlot(true);
    setSlotForm1(emptyForm);
    setActiveTab('slot1');
  };

  // Copy current slot data
  const handleCopySlot = () => {
    const slot1Data = hasDualSlot && slotForm1.course_id ? slotForm1 : null;
    setCopiedSlot({
      slot0: { ...slotForm0 },
      slot1: slot1Data ? { ...slot1Data } : null,
    });
    toast({ title: 'Copied', description: 'Slot data copied to clipboard' });
  };

  // Paste to current editing slot
  const handlePasteSlot = () => {
    if (!copiedSlot) return;
    setSlotForm0({ ...copiedSlot.slot0 });
    if (copiedSlot.slot1) {
      setSlotForm1({ ...copiedSlot.slot1 });
      setHasDualSlot(true);
    }
    toast({ title: 'Pasted', description: 'Slot data pasted from clipboard' });
  };

  // Quick paste to a cell (saves immediately)
  const handleQuickPaste = async (day: string, slotIndex: number) => {
    if (!copiedSlot || !batchId) return;
    setSaving(true);
    try {
      // Save slot 0
      await upsertSlot({
        batch_id: batchId,
        day,
        slot_index: slotIndex,
        slot_position: 0,
        course_id: copiedSlot.slot0.course_id || null,
        teacher_id: copiedSlot.slot0.teacher_id || null,
        room_id: copiedSlot.slot0.room_id || null,
        group_name: copiedSlot.slot0.group_name || null,
      });
      
      // Save slot 1 if exists
      if (copiedSlot.slot1) {
        await upsertSlot({
          batch_id: batchId,
          day,
          slot_index: slotIndex,
          slot_position: 1,
          course_id: copiedSlot.slot1.course_id || null,
          teacher_id: copiedSlot.slot1.teacher_id || null,
          room_id: copiedSlot.slot1.room_id || null,
          group_name: copiedSlot.slot1.group_name || null,
        });
      }
      
      const updatedSlots = await getScheduleSlots(batchId);
      setSlots(updatedSlots);
      toast({ title: 'Pasted', description: `Slot pasted to ${day}, slot ${slotIndex + 1}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to paste slot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderSlotForm = (form: SlotFormData, setForm: React.Dispatch<React.SetStateAction<SlotFormData>>, position: 0 | 1) => {
    const coursesForForm = getFilteredCourses(form.course_id);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Course
            </label>
            <Select 
              value={form.course_id} 
              onValueChange={(v) => setForm(p => ({ ...p, course_id: v }))}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-popover z-50">
                {coursesForForm.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: `hsl(${c.color})` }} 
                      />
                      <span className="truncate">{c.code} - {c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Teacher
            </label>
            <Select 
              value={form.teacher_id} 
              onValueChange={(v) => setForm(p => ({ ...p, teacher_id: v }))}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-popover z-50">
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    <span className="truncate">{t.short_name} - {t.full_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              Room
            </label>
            <Select 
              value={form.room_id} 
              onValueChange={(v) => setForm(p => ({ ...p, room_id: v }))}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-popover z-50">
                {rooms.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    <span className="truncate">
                      {r.name}{r.building ? ` (${r.building})` : ''}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Group
            </label>
            <Select 
              value={form.group_name || 'none'} 
              onValueChange={(v) => setForm(p => ({ ...p, group_name: v === 'none' ? '' : v }))}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none" className="text-xs">No Group</SelectItem>
                <SelectItem value="G1" className="text-xs">G1</SelectItem>
                <SelectItem value="G2" className="text-xs">G2</SelectItem>
                <SelectItem value="G1/G2" className="text-xs">G1/G2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => handleSaveSlot(position)} 
            disabled={saving} 
            size="sm"
            className="h-8 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleClearSlot(position)} 
            disabled={saving}
            size="sm"
            className="h-8 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading schedule data...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Batch not found
      </div>
    );
  }

  const activeSlots = TIME_SLOTS.filter(s => !s.isBreak);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/admin/dashboard/batches')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span className="text-sm">Back</span>
        </Button>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold">Edit Schedule: {batch.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Level {batch.level}, Term {batch.term} • Click on a cell to edit
            {copiedSlot && ' • Right-click on cell to quick paste'}
          </p>
        </div>
        
        {/* Clipboard indicator */}
        {copiedSlot && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
            <ClipboardPaste className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">
              {courses.find(c => c.id === copiedSlot.slot0.course_id)?.code || 'Slot'} copied
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopiedSlot(null)}
              className="h-5 w-5 p-0 hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {editingSlot && (
        <div className="surface-card rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {editingSlot.day}, {TIME_SLOTS.find(s => s.index === editingSlot.slotIndex)?.start}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Slot {editingSlot.slotIndex + 1}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Copy button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySlot}
                disabled={saving || !slotForm0.course_id}
                className="h-8 text-xs"
                title="Copy this slot"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy
              </Button>
              
              {/* Paste button */}
              {copiedSlot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteSlot}
                  disabled={saving}
                  className="h-8 text-xs"
                  title="Paste copied slot data"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
                  Paste
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingSlot(null)}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'slot0' | 'slot1')}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList className="h-9 bg-muted/50">
                <TabsTrigger value="slot0" className="text-xs h-7 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Class 1 {slotForm0.course_id && '✓'}
                </TabsTrigger>
                {hasDualSlot && (
                  <TabsTrigger value="slot1" className="text-xs h-7 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Class 2 {slotForm1.course_id && '✓'}
                  </TabsTrigger>
                )}
              </TabsList>
              {!hasDualSlot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSecondSlot}
                  className="h-8 text-xs"
                  disabled={saving}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add 2nd Class
                </Button>
              )}
            </div>
            
            <TabsContent value="slot0" className="mt-0">
              {renderSlotForm(slotForm0, setSlotForm0, 0)}
            </TabsContent>
            
            {hasDualSlot && (
              <TabsContent value="slot1" className="mt-0">
                {renderSlotForm(slotForm1, setSlotForm1, 1)}
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* Schedule Table - Time Horizontal, Days Vertical */}
      <div className="overflow-x-auto pb-4 -mx-3 sm:-mx-4 md:mx-0">
        <table className="border-separate border-spacing-1 sm:border-spacing-1.5">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[70px] sm:min-w-[85px] p-1.5 sm:p-2 text-left bg-card rounded-lg border border-border/50">
                <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Day / Time</span>
              </th>
              {activeSlots.map(timeSlot => (
                <th key={timeSlot.index} className="min-w-[100px] sm:min-w-[120px] md:min-w-[140px] p-1.5 sm:p-2 text-left rounded-lg bg-primary/5">
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] sm:text-[10px] md:text-xs font-semibold">{timeSlot.start}</span>
                    <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground">{timeSlot.end}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => {
              const formattedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
              return (
                <tr key={day}>
                  <td className="sticky left-0 z-10 min-w-[70px] sm:min-w-[85px] p-1.5 sm:p-2 rounded-lg bg-card border border-border/50 text-left align-middle">
                    <span className="text-[10px] sm:text-xs font-semibold">
                      <span className="md:hidden">{formattedDay.slice(0, 3)}</span>
                      <span className="hidden md:inline">{formattedDay}</span>
                    </span>
                  </td>
                  {activeSlots.map(timeSlot => {
                    const cellSlots = getSlotsData(day, timeSlot.index);
                    const slot0 = cellSlots.find(s => (s.slot_position || 0) === 0);
                    const slot1 = cellSlots.find(s => s.slot_position === 1);
                    const isEditing = editingSlot?.day === day && editingSlot?.slotIndex === timeSlot.index;
                    const isDual = !!slot1?.course_id || (isEditing && hasDualSlot);
                    
                    const getCourseForDisplay = (slotPosition: 0 | 1) => {
                      if (isEditing) {
                        const formData = slotPosition === 0 ? slotForm0 : slotForm1;
                        if (formData.course_id) {
                          return courses.find(c => c.id === formData.course_id);
                        }
                      }
                      const slot = slotPosition === 0 ? slot0 : slot1;
                      return slot?.courses;
                    };
                    
                    const getTeacherForDisplay = (slotPosition: 0 | 1) => {
                      if (isEditing) {
                        const formData = slotPosition === 0 ? slotForm0 : slotForm1;
                        if (formData.teacher_id) {
                          return teachers.find(t => t.id === formData.teacher_id);
                        }
                      }
                      const slot = slotPosition === 0 ? slot0 : slot1;
                      return slot?.teachers;
                    };
                    
                    const getRoomForDisplay = (slotPosition: 0 | 1) => {
                      if (isEditing) {
                        const formData = slotPosition === 0 ? slotForm0 : slotForm1;
                        if (formData.room_id) {
                          return rooms.find(r => r.id === formData.room_id);
                        }
                      }
                      const slot = slotPosition === 0 ? slot0 : slot1;
                      return slot?.rooms;
                    };
                    
                    const getGroupForDisplay = (slotPosition: 0 | 1) => {
                      if (isEditing) {
                        const formData = slotPosition === 0 ? slotForm0 : slotForm1;
                        return formData.group_name;
                      }
                      const slot = slotPosition === 0 ? slot0 : slot1;
                      return slot?.group_name;
                    };
                    
                    return (
                      <td
                        key={timeSlot.index}
                        className="p-0 align-middle min-w-[100px] sm:min-w-[120px] md:min-w-[140px]"
                        onClick={() => handleCellClick(day, timeSlot.index)}
                        onContextMenu={(e) => {
                          if (copiedSlot) {
                            e.preventDefault();
                            handleQuickPaste(day, timeSlot.index);
                          }
                        }}
                      >
                        <div className={`rounded-lg overflow-hidden cursor-pointer transition-all border-l-[3px] sm:border-l-4 h-full flex items-center ${
                          isEditing ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-primary/50'
                        }`} style={{
                          borderLeftColor: isDual 
                            ? (getCourseForDisplay(0)?.color ? `hsl(${getCourseForDisplay(0)?.color})` : 'hsl(var(--muted))')
                            : (slot0?.courses?.color ? `hsl(${slot0.courses.color})` : 'hsl(var(--muted))')
                        }}>
                          {isDual ? (
                            <div className="flex flex-col gap-px bg-border/30 w-full">
                              {[0, 1].map((pos) => {
                                const course = getCourseForDisplay(pos as 0 | 1);
                                const teacher = getTeacherForDisplay(pos as 0 | 1);
                                const room = getRoomForDisplay(pos as 0 | 1);
                                const group = getGroupForDisplay(pos as 0 | 1);
                                
                                return (
                                  <div
                                    key={pos}
                                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2 ${
                                      course ? '' : 'bg-muted/30'
                                    }`}
                                    style={{ 
                                      backgroundColor: course ? `hsl(${course.color} / 0.12)` : undefined,
                                    }}
                                  >
                                    {course ? (
                                      <div className="flex flex-col items-center text-center">
                                        <span 
                                          className="font-mono text-[10px] sm:text-xs font-semibold leading-tight"
                                          style={{ color: `hsl(${course.color})` }}
                                        >
                                          {course.code}
                                        </span>
                                        {group && (
                                          <span className="text-[9px] sm:text-[10px] text-muted-foreground">({group})</span>
                                        )}
                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                                          {teacher?.short_name}
                                        </span>
                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                                          {room?.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/50 text-[10px] sm:text-xs py-2">
                                        {isEditing ? `Class ${pos + 1}` : '-'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : slot0?.courses ? (
                            <div
                              className="p-1.5 sm:p-2 flex flex-col items-center justify-center text-center w-full"
                              style={{ backgroundColor: `hsl(${slot0.courses.color} / 0.12)` }}
                            >
                              <span 
                                className="font-mono text-[10px] sm:text-xs font-semibold leading-tight"
                                style={{ color: `hsl(${slot0.courses.color})` }}
                              >
                                {slot0.courses.code}
                              </span>
                              {slot0.group_name && (
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground">({slot0.group_name})</span>
                              )}
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{slot0.teachers?.short_name}</span>
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">{slot0.rooms?.name}</span>
                              <span
                                className="inline-flex w-fit mt-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-medium"
                                style={{
                                  backgroundColor: `hsl(${slot0.courses.color} / 0.2)`,
                                  color: `hsl(${slot0.courses.color})`,
                                }}
                              >
                                {slot0.courses.type === 'theory' ? 'Theory' : 'Sessional'}
                              </span>
                            </div>
                          ) : (
                            <div className="p-1.5 sm:p-2 bg-muted/20 flex items-center justify-center min-h-[50px] w-full" style={{ borderLeftColor: 'hsl(var(--muted))' }}>
                              <span className="text-[10px] sm:text-xs text-muted-foreground/50">+ Add</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div className="surface-card rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Instructions</h4>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <span>Click on any cell to edit or add a class</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <span>Use "Add 2nd Class" to split a slot for two groups (G1/G2)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <span>Save each class separately using the tabs</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
