import { BatchSchedule, ScheduleSlot } from '@/types/schedule';
import { isDualSlot, isSingleSlot } from '@/utils/scheduleHelpers';

interface Course {
  code: string;
  name: string;
  color: string;
}

interface LegendProps {
  schedule?: BatchSchedule;
}

export function Legend({ schedule }: LegendProps) {
  // Extract unique courses from the current batch's schedule
  const uniqueCourses: Course[] = [];
  const seenCodes = new Set<string>();

  const addCourse = (slot: ScheduleSlot) => {
    if (slot.courseCode && !seenCodes.has(slot.courseCode)) {
      seenCodes.add(slot.courseCode);
      uniqueCourses.push({
        code: slot.courseCode,
        name: slot.courseName,
        color: slot.color
      });
    }
  };

  if (schedule) {
    Object.values(schedule).forEach(daySlots => {
      Object.values(daySlots).forEach(cellSlot => {
        if (!cellSlot) return;
        
        // Handle dual slots (array of 2 slots)
        if (isDualSlot(cellSlot)) {
          addCourse(cellSlot[0]);
          addCourse(cellSlot[1]);
        } 
        // Handle single slot
        else if (isSingleSlot(cellSlot)) {
          addCourse(cellSlot);
        }
      });
    });
  }

  // Sort by course code
  uniqueCourses.sort((a, b) => a.code.localeCompare(b.code));

  if (uniqueCourses.length === 0) {
    return null;
  }

  return (
    <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <span className="text-[11px] sm:text-xs md:text-sm font-medium text-foreground">Course Colors</span>
        <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">(tap class for details)</span>
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
        {uniqueCourses.map((course) => (
          <div
            key={course.code}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] md:text-xs"
            style={{
              backgroundColor: `hsl(${course.color} / 0.15)`,
            }}
            title={course.name}
          >
            <div
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: `hsl(${course.color})` }}
            />
            <span 
              className="font-mono font-medium truncate max-w-[60px] sm:max-w-none"
              style={{ color: `hsl(${course.color})` }}
            >
              {course.code}
            </span>
          </div>
        ))}
        
        {/* Break indicator */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] md:text-xs bg-[hsl(45_85%_45%/0.15)]">
          <div 
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: 'hsl(45 85% 45%)' }}
          />
          <span className="font-medium text-muted-foreground">Break</span>
        </div>
      </div>
    </div>
  );
}