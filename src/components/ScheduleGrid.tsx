import { useState } from 'react';
import { BatchSchedule, DAYS, CellSlots } from '@/types/schedule';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { ScheduleCell } from './ScheduleCell';
import { cn } from '@/lib/utils';

interface ScheduleGridProps {
  schedule: BatchSchedule;
}

export function ScheduleGrid({ schedule }: ScheduleGridProps) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [expandedDualPosition, setExpandedDualPosition] = useState<{ cellId: string; position: number } | null>(null);
  const { timeSlots } = useTimeSlots();

  const handleCellClick = (cellId: string) => {
    setExpandedCell(prev => prev === cellId ? null : cellId);
    setExpandedDualPosition(null); // Clear dual position when single slot clicked
  };

  const handleDualPositionClick = (cellId: string, position: number) => {
    setExpandedDualPosition(prev => 
      prev?.cellId === cellId && prev?.position === position ? null : { cellId, position }
    );
    setExpandedCell(null); // Clear single expanded when dual position clicked
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-3 sm:-mx-4 md:mx-0 scrollbar-hide">
      <table className="w-full border-separate border-spacing-1 sm:border-spacing-1.5 md:border-spacing-2 min-w-[800px] sm:min-w-[880px] md:min-w-[900px] lg:min-w-[950px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[56px] sm:w-[72px] md:w-[92px] p-1.5 sm:p-2 text-center bg-card rounded-lg border border-border/50">
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Time</span>
            </th>
            {DAYS.map((day) => (
              <th
                key={day}
                className="p-1.5 sm:p-2 text-center rounded-lg bg-primary/5 min-w-[135px] sm:min-w-[145px] md:min-w-[150px]"
              >
                <span className="text-[10px] sm:text-xs md:text-sm font-semibold">
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot) => (
            <tr key={timeSlot.index} className={cn(timeSlot.isBreak && 'opacity-75')}>
              <td className="sticky left-0 z-10 w-[56px] sm:w-[72px] md:w-[92px] p-1 sm:p-1.5 md:p-2 rounded-lg bg-card border border-border/50 text-center align-middle">
                <div className="flex flex-col items-center justify-center">
                  <span className="font-mono text-[9px] sm:text-[10px] md:text-xs font-medium">{timeSlot.start}</span>
                  <span className="text-muted-foreground text-[7px] sm:text-[8px] md:text-[10px] hidden sm:block">to</span>
                  <span className="text-muted-foreground text-[7px] sm:hidden">-</span>
                  <span className="font-mono text-[9px] sm:text-[10px] md:text-xs font-medium">{timeSlot.end}</span>
                </div>
              </td>
              {DAYS.map((day) => {
                const cellId = `${day}-${timeSlot.index}`;
                const cellSlots: CellSlots = schedule[day]?.[timeSlot.index] || null;
                return (
                  <td key={cellId} className="align-middle min-w-[135px] sm:min-w-[145px] md:min-w-[150px]">
                    <ScheduleCell
                      cellSlots={cellSlots}
                      isBreak={timeSlot.isBreak}
                      isExpanded={expandedCell === cellId}
                      expandedPosition={expandedDualPosition?.cellId === cellId ? expandedDualPosition.position : null}
                      onToggle={() => handleCellClick(cellId)}
                      onTogglePosition={(position) => handleDualPositionClick(cellId, position)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
