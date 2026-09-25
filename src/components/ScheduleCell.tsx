import { CellSlots, ScheduleSlot } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { ChevronDown, MapPin, User, BookOpen, X, Clock } from 'lucide-react';
import { isDualSlot, isSingleSlot } from '@/utils/scheduleHelpers';

interface ScheduleCellProps {
  cellSlots: CellSlots;
  isBreak?: boolean;
  isExpanded?: boolean;
  expandedPosition?: number | null;
  onToggle?: () => void;
  onTogglePosition?: (position: number) => void;
}

// Collapsed dual slot preview (compact)
function DualSlotCollapsed({ slot, onToggle }: { slot: ScheduleSlot; onToggle?: () => void }) {
  const courseColor = slot.color;
  const cancelled = slot.modification === 'cancelled';
  const rescheduled = slot.modification === 'rescheduled';
  
  return (
    <div
      className={cn(
        "h-full p-1.5 sm:p-2 border-l-[3px] sm:border-l-4 min-h-[40px] sm:min-h-[50px] md:min-h-[60px] flex flex-col cursor-pointer",
        cancelled && "grayscale opacity-70"
      )}
      style={{
        backgroundColor: cancelled ? 'transparent' : `hsl(${courseColor} / 0.12)`,
        borderLeftColor: cancelled ? 'hsl(var(--border))' : `hsl(${courseColor})`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
    >
      <div className="flex items-start justify-between gap-0.5">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-mono text-[9px] sm:text-[10px] md:text-sm font-semibold truncate leading-tight flex items-center gap-1",
              cancelled && "line-through text-muted-foreground"
            )}
            style={{ color: cancelled ? undefined : `hsl(${courseColor})` }}
          >
            {rescheduled && <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />}
            <span className="truncate">{slot.courseCode}</span>
            {cancelled && <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500 shrink-0" strokeWidth={3} />}
          </p>
          {slot.groupName && (
            <span className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground font-medium">{slot.groupName}</span>
          )}
          <p className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground truncate leading-tight">
            {slot.teacherShortName}
          </p>
        </div>
        <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

// Expanded dual slot (full width with all details)
function DualSlotExpanded({ slot, onToggle }: { slot: ScheduleSlot; onToggle?: () => void }) {
  const courseColor = slot.color;
  const cancelled = slot.modification === 'cancelled';
  const rescheduled = slot.modification === 'rescheduled';
  
  return (
    <div
      className={cn(
        "p-2 sm:p-3 border-l-[3px] sm:border-l-4 cursor-pointer",
        cancelled && "grayscale opacity-70"
      )}
      style={{
        backgroundColor: cancelled ? 'transparent' : `hsl(${courseColor} / 0.12)`,
        borderLeftColor: cancelled ? 'hsl(var(--border))' : `hsl(${courseColor})`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-mono text-[10px] sm:text-xs md:text-sm font-semibold leading-tight inline-flex items-center gap-1",
              cancelled && "line-through text-muted-foreground"
            )}
            style={{ color: cancelled ? undefined : `hsl(${courseColor})` }}
          >
            {rescheduled && <Clock className="h-3 w-3 shrink-0" />}
            <span>{slot.courseCode}</span>
            {cancelled && <X className="h-3 w-3 text-red-500 shrink-0" strokeWidth={3} />}
            {slot.groupName && (
              <span className="ml-1 text-muted-foreground font-normal">({slot.groupName})</span>
            )}
          </p>
        </div>
        <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0 rotate-180" />
      </div>
      
      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 animate-slide-up">
        <div className="flex items-start gap-1.5 text-[9px] sm:text-[10px] md:text-xs">
          <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="leading-tight">
            {slot.courseName}
            {slot.credit && <span className="ml-1 text-muted-foreground">({slot.credit} cr)</span>}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-[9px] sm:text-[10px] md:text-xs">
          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="leading-tight">{slot.teacherFullName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs">
          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
          <span>{slot.room}</span>
        </div>
        <div className="flex items-center">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-medium"
            style={{
              backgroundColor: `hsl(${courseColor} / 0.2)`,
              color: `hsl(${courseColor})`,
            }}
          >
            {slot.type === 'theory' ? 'Theory' : 'Sessional'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Full single slot display
function SingleSlotFull({ slot, isExpanded, onToggle }: { slot: ScheduleSlot; isExpanded?: boolean; onToggle?: () => void }) {
  const courseColor = slot.color;
  const cancelled = slot.modification === 'cancelled';
  const rescheduled = slot.modification === 'rescheduled';

  return (
    <div
      className={cn(
        "schedule-cell rounded-lg p-1.5 sm:p-2 md:p-3 cursor-pointer border-l-[3px] sm:border-l-4 min-h-[40px] sm:min-h-[50px] md:min-h-[60px]",
        cancelled && "grayscale opacity-70"
      )}
      style={{
        backgroundColor: cancelled ? 'transparent' : `hsl(${courseColor} / 0.12)`,
        borderLeftColor: cancelled ? 'hsl(var(--border))' : `hsl(${courseColor})`,
      }}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-0.5 sm:gap-1 md:gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-mono text-[9px] sm:text-[10px] md:text-sm font-semibold truncate leading-tight flex items-center gap-1",
              cancelled && "line-through text-muted-foreground"
            )}
            style={{ color: cancelled ? undefined : `hsl(${courseColor})` }}
          >
            {rescheduled && <Clock className="h-3 w-3 shrink-0" />}
            <span className="truncate">{slot.courseCode}</span>
            {cancelled && <X className="h-3 w-3 text-red-500 shrink-0" strokeWidth={3} />}
            {slot.groupName && (
              <span className="ml-0.5 sm:ml-1 text-muted-foreground font-normal">{slot.groupName}</span>
            )}
          </p>
          <p className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground mt-0.5 truncate leading-tight">
            {slot.teacherShortName}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-muted-foreground transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {isExpanded && (
        <div className="mt-1.5 sm:mt-2 md:mt-3 pt-1.5 sm:pt-2 md:pt-3 border-t border-border/50 space-y-1 sm:space-y-1.5 md:space-y-2 animate-slide-up">
          <div className="flex items-start gap-1 sm:gap-1.5 md:gap-2 text-[9px] sm:text-[10px] md:text-xs">
            <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">
              {slot.courseName}
              {slot.credit && <span className="ml-1 text-muted-foreground">({slot.credit} cr)</span>}
            </span>
          </div>
          <div className="flex items-start gap-1 sm:gap-1.5 md:gap-2 text-[9px] sm:text-[10px] md:text-xs">
            <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1 leading-tight">{slot.teacherFullName}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[9px] sm:text-[10px] md:text-xs">
            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
            <span>{slot.room}</span>
          </div>
          <div className="mt-1 sm:mt-1.5 md:mt-2">
            <span
              className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] md:text-xs font-medium"
              style={{
                backgroundColor: `hsl(${courseColor} / 0.2)`,
                color: `hsl(${courseColor})`,
              }}
            >
              {slot.type === 'theory' ? 'Theory' : 'Sessional'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScheduleCell({ cellSlots, isBreak, isExpanded = false, expandedPosition, onToggle, onTogglePosition }: ScheduleCellProps) {
  if (isBreak) {
    return (
      <div className="schedule-break rounded-lg p-1.5 sm:p-2 md:p-3 text-center min-h-[40px] sm:min-h-[50px] md:min-h-[60px] flex items-center justify-center">
        <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Break</span>
      </div>
    );
  }

  if (!cellSlots) {
    return (
      <div className="rounded-lg bg-muted/30 p-1.5 sm:p-2 md:p-3 min-h-[40px] sm:min-h-[50px] md:min-h-[60px]" />
    );
  }

  // Dual slot - switches to vertical layout when one is expanded for better readability
  if (isDualSlot(cellSlots)) {
    const isAnyExpanded = expandedPosition !== null && expandedPosition !== undefined;
    
    // When expanded, use vertical stack layout
    if (isAnyExpanded) {
      return (
        <div className="rounded-lg overflow-hidden min-h-[40px] sm:min-h-[50px] md:min-h-[60px] flex flex-col gap-px bg-border/50">
          {expandedPosition === 0 ? (
            <>
              <DualSlotExpanded slot={cellSlots[0]} onToggle={() => onTogglePosition?.(0)} />
              <DualSlotCollapsed slot={cellSlots[1]} onToggle={() => onTogglePosition?.(1)} />
            </>
          ) : (
            <>
              <DualSlotCollapsed slot={cellSlots[0]} onToggle={() => onTogglePosition?.(0)} />
              <DualSlotExpanded slot={cellSlots[1]} onToggle={() => onTogglePosition?.(1)} />
            </>
          )}
        </div>
      );
    }
    
    // Default: side by side
    return (
      <div className="rounded-lg overflow-hidden min-h-[40px] sm:min-h-[50px] md:min-h-[60px] grid grid-cols-2 gap-px bg-border/50">
        <DualSlotCollapsed slot={cellSlots[0]} onToggle={() => onTogglePosition?.(0)} />
        <DualSlotCollapsed slot={cellSlots[1]} onToggle={() => onTogglePosition?.(1)} />
      </div>
    );
  }

  // Single slot
  if (isSingleSlot(cellSlots)) {
    return <SingleSlotFull slot={cellSlots} isExpanded={isExpanded} onToggle={onToggle} />;
  }

  return null;
}
