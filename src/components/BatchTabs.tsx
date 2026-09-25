import { Batch } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { GraduationCap } from 'lucide-react';

interface BatchTabsProps {
  batches: Batch[];
  activeBatch: string;
  onBatchChange: (batchId: string) => void;
}

export function BatchTabs({ batches, activeBatch, onBatchChange }: BatchTabsProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="container px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-3 sm:py-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          {batches.map((batch) => {
            const isActive = activeBatch === batch.id;
            return (
              <button
                key={batch.id}
                onClick={() => onBatchChange(batch.id)}
                className={cn(
                  'group relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl whitespace-nowrap flex-shrink-0 transition-all duration-300 font-medium text-xs sm:text-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:shadow-sm border border-border/50'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-colors',
                  isActive 
                    ? 'bg-primary-foreground/20' 
                    : 'bg-primary/10 group-hover:bg-primary/15'
                )}>
                  <GraduationCap className={cn(
                    'h-3.5 w-3.5 sm:h-4 sm:w-4',
                    isActive ? 'text-primary-foreground' : 'text-primary'
                  )} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="leading-tight">{batch.name}</span>
                  <span className={cn(
                    'text-[9px] sm:text-[10px] leading-tight',
                    isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    L{batch.semesterInfo.level} • T{batch.semesterInfo.term}
                  </span>
                </div>
                {isActive && (
                  <span className="absolute -bottom-[13px] sm:-bottom-[17px] left-1/2 -translate-x-1/2 w-8 sm:w-12 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
