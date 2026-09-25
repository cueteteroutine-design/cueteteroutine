import { SemesterInfo } from '@/types/schedule';
import { computeSemesterInfo } from '@/utils/semesterUtils';
import { computeClassDays, HolidayLike } from '@/utils/classDaysUtils';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Clock,
  Coffee,
  GraduationCap,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface SemesterInfoCardProps {
  semesterInfo: SemesterInfo;
  holidays?: HolidayLike[];
}

export const SemesterInfoCard = ({ semesterInfo, holidays = [] }: SemesterInfoCardProps) => {
  const { level, term, totalWeeks } = semesterInfo;
  const computed = computeSemesterInfo(semesterInfo);
  const {
    completedClassDays,
    totalClassDays,
    currentWeek,
    estimatedEndDate,
    isSemesterComplete,
  } = computeClassDays(semesterInfo, holidays);
  // Final starts only after the final scheduled class date has passed.
  const status = isSemesterComplete
    ? 'semester_final'
    : computed.status === 'semester_final'
      ? 'running'
      : computed.status;
  const progressPercentage = Math.min((completedClassDays / totalClassDays) * 100, 100);
  const startDate = semesterInfo.startDate ? parseISO(semesterInfo.startDate) : null;

  const getStatusConfig = () => {
    switch (status) {
      case 'initiating':
        return {
          label: 'Classes Initiating',
          icon: BookOpen,
          className: 'bg-muted text-muted-foreground border-muted-foreground/20',
          progressColor: 'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20',
          badgeColor: 'text-muted-foreground',
        };
      case 'running':
        return {
          label: 'Semester Active',
          icon: Play,
          className:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
          progressColor: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          badgeColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'mid_break':
        return {
          label: 'Mid Semester Break',
          icon: Coffee,
          className:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
          progressColor: 'bg-gradient-to-r from-amber-500 to-amber-400',
          badgeColor: 'text-amber-600 dark:text-amber-400',
        };
      case 'semester_final':
        return {
          label: 'Semester Final',
          icon: GraduationCap,
          className:
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
          progressColor: 'bg-gradient-to-r from-red-500 to-red-400',
          badgeColor: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          label: 'Unknown',
          icon: BookOpen,
          className: 'bg-muted text-muted-foreground border-muted-foreground/20',
          progressColor: 'bg-muted',
          badgeColor: 'text-muted-foreground',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow
      p-3 sm:p-4 md:p-5 lg:p-6 mb-4 sm:mb-5 lg:mb-6">

      <div className="flex flex-col gap-4 md:gap-5">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* Semester Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                Semester
              </p>
              <p className="text-base sm:text-lg md:text-xl font-bold">
                Level {level}
                <span className="text-muted-foreground font-normal mx-1">•</span>
                Term {term}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              `
              flex items-center justify-center gap-2
              w-full sm:w-fit
              px-3 py-2
              rounded-full border
              text-xs sm:text-sm font-medium
              `,
              statusConfig.className
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
        {/* ================= END HEADER ================= */}


        {/* ================= PROGRESS ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-medium">
                  Week <span className="font-bold">{currentWeek}</span> of {totalWeeks}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completedClassDays} of {totalClassDays} class days completed ({Math.round(progressPercentage)}%)
                </p>
              </div>
            </div>

            <div className={cn(
              'text-xs sm:text-sm font-semibold px-2 py-1 rounded',
              statusConfig.badgeColor
            )}>
              {completedClassDays}/{totalClassDays}
            </div>
          </div>

          <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-700',
                statusConfig.progressColor
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* ================= STATUS MESSAGE ================= */}
        {status === 'initiating' && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center border-t pt-3">
            Semester is about to begin. Classes will start soon.
          </p>
        )}

        {status === 'mid_break' && (
          <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 text-center border-t pt-3">
            Classes will resume after the break. Week count is paused.
          </p>
        )}

        {status === 'semester_final' && (
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 text-center border-t pt-3">
            All scheduled class days are complete. The semester final period has started.
          </p>
        )}

        {/* ================= DATES ================= */}
        {(startDate || estimatedEndDate) && (
          <div className="border-t pt-3">
            <p className="mb-2 text-[10px] sm:text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Academic timeline
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-blue-200/70 bg-blue-50/70 p-2.5 dark:border-blue-900/70 dark:bg-blue-950/20">
                <div className="rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/50">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-blue-700/70 dark:text-blue-300/70">
                    Starts
                  </p>
                  <p className="truncate text-xs sm:text-sm font-semibold">
                    {startDate ? format(startDate, 'EEE, dd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-2.5 dark:border-emerald-900/70 dark:bg-emerald-950/20">
                <div className="rounded-md bg-emerald-100 p-1.5 dark:bg-emerald-900/50">
                  <CalendarCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
                    Last class
                  </p>
                  <p className="truncate text-xs sm:text-sm font-semibold">
                    {estimatedEndDate ? format(estimatedEndDate, 'EEE, dd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
