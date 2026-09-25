import { SemesterInfo } from '@/types/schedule';
import { computeSemesterInfo } from '@/utils/semesterUtils';
import { computeClassDays, HolidayLike } from '@/utils/classDaysUtils';
import {
  BatteryCharging,
  BookOpen,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Clock,
  Coffee,
  GraduationCap,
  Play,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

interface DisplaySemesterCardProps {
  batchName: string;
  semesterInfo: SemesterInfo;
  totalBatches: number;
  holidays?: HolidayLike[];
}

export const DisplaySemesterCard = ({ batchName, semesterInfo, totalBatches, holidays = [] }: DisplaySemesterCardProps) => {
  const { level, term, totalWeeks } = semesterInfo;
  const computed = computeSemesterInfo(semesterInfo);
  const {
    completedClassDays,
    totalClassDays,
    currentWeek,
    estimatedEndDate,
    isSemesterComplete,
  } = computeClassDays(semesterInfo, holidays);
  const status = isSemesterComplete
    ? 'semester_final'
    : computed.status === 'semester_final'
      ? 'running'
      : computed.status;
  // Day counter shows the class day currently running today:
  // completed days + today's in-progress day (capped at the total).
  const displayDay = status === 'initiating'
    ? 0
    : Math.min(completedClassDays + 1, totalClassDays);
  const startDate = semesterInfo.startDate ? parseISO(semesterInfo.startDate) : null;
  const startDateLabel = startDate ? format(startDate, 'EEE, dd MMM yyyy') : '—';
  const endDateLabel = estimatedEndDate ? format(estimatedEndDate, 'EEE, dd MMM yyyy') : '—';
  const startDateDesktopLabel = startDate ? format(startDate, 'EEEE, dd MMM yyyy') : '—';
  const endDateDesktopLabel = estimatedEndDate ? format(estimatedEndDate, 'EEEE, dd MMM yyyy') : '—';
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [weekDisplay, setWeekDisplay] = useState(currentWeek);

  // Animate progress bar and week counter
  useEffect(() => {
    const targetPercentage = Math.min((completedClassDays / totalClassDays) * 100, 100);
    const duration = 1500; // 1.5 seconds
    const steps = 60; // 60 fps
    const stepTime = duration / steps;
    const increment = targetPercentage / steps;
    
    let currentStep = 0;
    let currentProgress = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      currentProgress = Math.min(increment * currentStep, targetPercentage);
      setProgressPercentage(currentProgress);
      
      if (currentStep === steps) {
        clearInterval(timer);
        // Trigger pulse animation when progress completes
        setPulseAnimation(true);
        setTimeout(() => setPulseAnimation(false), 1000);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [completedClassDays, totalClassDays]);

  // Animate week counter
  useEffect(() => {
    if (weekDisplay === currentWeek) return;
    
    const diff = currentWeek - weekDisplay;
    const steps = Math.abs(diff) * 10; // 10 steps per week
    const increment = diff / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      setWeekDisplay(prev => {
        const newValue = prev + increment;
        return diff > 0 ? Math.min(newValue, currentWeek) : Math.max(newValue, currentWeek);
      });
      
      if (currentStep === steps) {
        clearInterval(timer);
        setWeekDisplay(currentWeek);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [currentWeek]);

  const getStatusConfig = () => {
    switch (status) {
      case 'initiating':
        return {
          label: 'Initiating',
          icon: BookOpen,
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20',
          textColor: 'text-blue-700 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
          progressColor: 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300',
          iconColor: 'text-blue-600 dark:text-blue-400',
          pulseColor: 'shadow-blue-400/30',
          animatedIcon: <Zap className="h-3 w-3 animate-pulse" />,
        };
      case 'running':
        return {
          label: 'Running',
          icon: Play,
          bgColor: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20',
          textColor: 'text-emerald-700 dark:text-emerald-400',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
          progressColor: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          pulseColor: 'shadow-emerald-400/30',
          animatedIcon: <TrendingUp className="h-3 w-3 animate-pulse" />,
        };
      case 'mid_break':
        return {
          label: 'Mid Break',
          icon: Coffee,
          bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20',
          textColor: 'text-amber-700 dark:text-amber-400',
          borderColor: 'border-amber-200 dark:border-amber-800',
          iconBgColor: 'bg-amber-100 dark:bg-amber-900/50',
          progressColor: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300',
          iconColor: 'text-amber-600 dark:text-amber-400',
          pulseColor: 'shadow-amber-400/30',
          animatedIcon: <Coffee className="h-3 w-3 animate-pulse" />,
        };
      case 'semester_final':
        return {
          label: 'Semester Final',
          icon: GraduationCap,
          bgColor: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
          textColor: 'text-red-700 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-800',
          iconBgColor: 'bg-red-100 dark:bg-red-900/50',
          progressColor: 'bg-gradient-to-r from-red-500 via-red-400 to-red-300',
          iconColor: 'text-red-600 dark:text-red-400',
          pulseColor: 'shadow-red-400/30',
          animatedIcon: <GraduationCap className="h-3.5 w-3.5" />,
        };
      default:
        return {
          label: 'Unknown',
          icon: BookOpen,
          bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/20',
          textColor: 'text-gray-700 dark:text-gray-400',
          borderColor: 'border-gray-200 dark:border-gray-800',
          iconBgColor: 'bg-gray-100 dark:bg-gray-900/50',
          progressColor: 'bg-gradient-to-r from-gray-500 via-gray-400 to-gray-300',
          iconColor: 'text-gray-600 dark:text-gray-400',
          pulseColor: 'shadow-gray-400/30',
          animatedIcon: <BookOpen className="h-3 w-3" />,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Card stretches to fill the slot allocated by the parent flex container.
  const getCardHeight = () => 'h-full min-h-0';

  // Dynamic font sizes based on number of batches
  const getFontSizes = () => {
    if (totalBatches <= 3) return {
      batchName: 'text-base sm:text-lg md:text-xl',
      levelTerm: 'text-sm sm:text-base md:text-lg',
      weekNumber: 'text-xl sm:text-2xl md:text-3xl',
      weekLabel: 'text-xs sm:text-sm',
      progressPercent: 'text-base sm:text-lg',
      progressLabel: 'text-xs sm:text-sm',
      statusLabel: 'text-sm sm:text-base',
      weekOfLabel: 'text-sm sm:text-base md:text-lg',
    };
    if (totalBatches <= 5) return {
      batchName: 'text-sm sm:text-base md:text-lg',
      levelTerm: 'text-sm sm:text-base',
      weekNumber: 'text-lg sm:text-xl md:text-2xl',
      weekLabel: 'text-xs',
      progressPercent: 'text-sm sm:text-base',
      progressLabel: 'text-xs',
      statusLabel: 'text-xs sm:text-sm',
      weekOfLabel: 'text-sm sm:text-base',
    };
    return {
      batchName: 'text-xs sm:text-sm md:text-base',
      levelTerm: 'text-xs sm:text-sm',
      weekNumber: 'text-base sm:text-lg md:text-xl',
      weekLabel: 'text-[10px] sm:text-xs',
      progressPercent: 'text-xs sm:text-sm',
      progressLabel: 'text-[10px] sm:text-xs',
      statusLabel: 'text-xs',
      weekOfLabel: 'text-xs sm:text-sm',
    };
  };

  const fontSizes = getFontSizes();

  // Dynamic spacing based on number of batches
  const getSpacing = () => {
    if (totalBatches <= 3) return {
      padding: 'px-4 sm:px-6 md:px-8',
      gap: 'gap-4 sm:gap-5 md:gap-6',
      iconSize: 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7',
      statusWidth: 'w-32 sm:w-36 md:w-40',
      batchWidth: 'w-48 sm:w-56 md:w-64 lg:w-72',
      weekWidth: 'w-28 sm:w-32 md:w-36',
      progressBarHeight: 'h-2',
      iconPadding: 'p-2.5 sm:p-3 md:p-3.5',
    };
    if (totalBatches <= 5) return {
      padding: 'px-3 sm:px-4 md:px-6',
      gap: 'gap-3 sm:gap-4 md:gap-5',
      iconSize: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
      statusWidth: 'w-28 sm:w-32 md:w-36',
      batchWidth: 'w-40 sm:w-48 md:w-56 lg:w-64',
      weekWidth: 'w-24 sm:w-28 md:w-32',
      progressBarHeight: 'h-1.5 sm:h-2',
      iconPadding: 'p-2 sm:p-2.5 md:p-3',
    };
    return {
      padding: 'px-2 sm:px-3 md:px-4',
      gap: 'gap-2 sm:gap-3 md:gap-4',
      iconSize: 'h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5',
      statusWidth: 'w-24 sm:w-28 md:w-32',
      batchWidth: 'w-36 sm:w-40 md:w-48 lg:w-56',
      weekWidth: 'w-20 sm:w-24 md:w-28',
      progressBarHeight: 'h-1.5',
      iconPadding: 'p-1.5 sm:p-2 md:p-2.5',
    };
  };

  const spacing = getSpacing();

  return (
    <div className={cn(
      "display-semester-card w-full flex items-center relative overflow-hidden",
      statusConfig.bgColor,
      "border rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
      statusConfig.borderColor,
      getCardHeight(),
      spacing.padding,
      "py-2 sm:py-3"
    )}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full opacity-10 bg-gradient-to-r from-white to-transparent"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full opacity-10 bg-gradient-to-l from-white to-transparent"></div>
      </div>

      {/* MOBILE VIEW (hidden on desktop) */}
      <div className="sm:hidden w-full flex flex-col">
        {/* Top Row: Batch + Level/Term + Week in one line */}
        <div className="flex items-center justify-between mb-2 z-10">
          {/* Batch Info - Shifted left */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-bold text-gray-900 dark:text-gray-100 truncate",
              fontSizes.batchName,
              "text-left"
            )}>
              {batchName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className={cn(
                "text-gray-600 dark:text-gray-400",
                fontSizes.levelTerm,
                "text-left"
              )}>
                L{level} T{term}
              </p>
              {/* Week counter on same line */}
              <div className="flex items-center gap-1">
                <Clock className={cn(
                  "text-gray-500 dark:text-gray-400",
                  "h-3 w-3"
                )} />
                <span className={cn(
                  "text-gray-500 dark:text-gray-400 font-medium",
                  fontSizes.weekLabel
                )}>
                  Week
                </span>
                <span className={cn(
                  "font-bold text-gray-900 dark:text-gray-100 tabular-nums ml-0.5",
                  fontSizes.weekNumber
                )}>
                  {Math.round(weekDisplay)}
                </span>
                <span className={cn(
            "text-gray-500 dark:text-gray-400",
            fontSizes.weekLabel
          )}>
            of {totalWeeks}
          </span>
              </div>
            </div>
            <p className={cn("text-gray-500 dark:text-gray-400 mt-0.5", fontSizes.weekLabel)}>
              {displayDay}/{totalClassDays} class days
            </p>
          </div>

          {/* Status Badge - Mobile (smaller) */}
          <div className={cn(
            "flex items-center justify-center gap-1.5",
            "rounded-full border backdrop-blur-sm",
            statusConfig.textColor,
            statusConfig.borderColor,
            "shadow-sm",
            pulseAnimation && `animate-pulse ${statusConfig.pulseColor}`,
            "py-1 px-2.5 ml-2",
            "flex-shrink-0"
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span className={cn(
              "font-medium whitespace-nowrap",
              fontSizes.statusLabel
            )}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Compact semester timeline */}
        <div className="mb-2 z-10 flex items-stretch gap-2.5 px-0.5">
          <div className="relative flex w-4 flex-shrink-0 flex-col items-center py-1">
            <span className="h-2 w-2 rounded-full border-2 border-blue-400 bg-blue-400/20" />
            <span className="my-0.5 w-px flex-1 bg-gradient-to-b from-blue-400/60 to-emerald-400/60" />
            <span className="h-2 w-2 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                Starts
              </span>
              <span className="truncate text-xs font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                {startDateLabel}
              </span>
            </div>
            <div className="h-px bg-black/5 dark:bg-white/10" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                Last class
              </span>
              <span className="truncate text-xs font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                {endDateLabel}
              </span>
            </div>
            {!semesterInfo.midBreakStart && !semesterInfo.midBreakEnd && (
              <div className="flex items-center justify-end gap-3">
                <span className="text-[9px] leading-tight text-amber-600 dark:text-amber-400">
                  Without mid-break
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar Section */}
        <div className="w-[92%] max-w-md mx-auto z-10">
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "text-gray-500 dark:text-gray-400 font-medium",
              fontSizes.progressLabel
            )}>
              Progress
            </span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "font-bold text-gray-900 dark:text-gray-100 tabular-nums",
                fontSizes.progressPercent
              )}>
                {Math.round(progressPercentage)}%
              </span>
              {status === 'running' && (
                <BatteryCharging className={cn(
                  "text-emerald-500",
                  "h-3.5 w-3.5"
                )} />
              )}
            </div>
          </div>
          <div className={cn(
            "relative bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
            spacing.progressBarHeight,
            "w-full"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-700",
              statusConfig.progressColor,
              pulseAnimation && "animate-pulse"
            )}
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
            <div className="absolute inset-0 flex justify-between px-0.5">
              {Array.from({ length: Math.min(totalWeeks, 5) + 1 }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-0.5 h-full",
                    i <= currentWeek ? "bg-white/50" : "bg-gray-300/30 dark:bg-gray-600/30"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className={cn("text-gray-400", fontSizes.progressLabel)}>
              W1
            </span>
            <span className={cn("text-gray-400", fontSizes.progressLabel)}>
              W{totalWeeks}
            </span>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (hidden on mobile) */}
      <div className="hidden sm:flex w-full items-center">
        {/* Batch Name & Semester Info */}
        <div className={cn(
          "flex items-center z-10",
          spacing.gap,
          spacing.batchWidth,
          "flex-shrink-0"
        )}>
          <div className={cn(
            "rounded-xl border relative flex-shrink-0",
            statusConfig.iconBgColor,
            statusConfig.borderColor,
            spacing.iconPadding,
            pulseAnimation && "animate-pulse"
          )}>
            <StatusIcon className={cn(spacing.iconSize, statusConfig.iconColor)} />
            {status === 'running' && (
              <div className="absolute -top-1 -right-1">
                <div className="relative">
                  <div className="absolute animate-ping h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-400 opacity-75"></div>
                  <div className="relative h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-1 flex-1">
            <p className={cn(
              "font-bold text-gray-900 dark:text-gray-100 truncate",
              fontSizes.batchName
            )}>
              {batchName}
            </p>
            <p className={cn(
              "text-gray-600 dark:text-gray-400",
              fontSizes.levelTerm
            )}>
              Level {level}, Term {term}
            </p>
          </div>
        </div>

        {/* Semester dates: positioned between batch details and week counter */}
        <div className="hidden md:flex z-10 w-56 lg:w-72 flex-shrink-0 flex-col justify-center gap-2 border-l border-black/10 dark:border-white/10 pl-4 lg:pl-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-lg border border-blue-200/70 bg-blue-100/70 p-2 dark:border-blue-900/70 dark:bg-blue-900/30">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Semester starts
              </p>
              <p className="truncate text-sm lg:text-base font-semibold leading-tight text-gray-900 dark:text-gray-100">
                {startDateDesktopLabel}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-100/70 p-2 dark:border-emerald-900/70 dark:bg-emerald-900/30">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Last class
              </p>
              <p className="truncate text-sm lg:text-base font-semibold leading-tight text-gray-900 dark:text-gray-100">
                {endDateDesktopLabel}
              </p>
              {!semesterInfo.midBreakStart && !semesterInfo.midBreakEnd && (
                <p className="text-[10px] leading-tight text-amber-600 dark:text-amber-400">
                  Without mid-break
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className={cn(
          "flex-1 flex flex-row items-center justify-center",
          spacing.gap,
          "px-2 sm:px-3 md:px-4 z-10"
        )}>
          {/* Week Counter */}
          <div className={cn(
            "flex flex-col items-center",
            spacing.weekWidth
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Clock className={cn(
                "text-gray-500 dark:text-gray-400 flex-shrink-0",
                spacing.iconSize.replace('h-', 'h-3.5 ').replace('sm:h-', 'sm:h-4 ').replace('md:h-', 'md:h-4 ')
              )} />
              <span className={cn(
                "text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap",
                fontSizes.weekLabel
              )}>
                Week
              </span>
            </div>
            <div className="relative flex flex-col items-center">
              <div className={cn(
                "font-bold text-gray-900 dark:text-gray-100 tabular-nums text-center",
                fontSizes.weekNumber
              )}>
                {Math.round(weekDisplay)}
              </div>
              <div className={cn(
                "text-gray-500 dark:text-gray-400 text-center",
                fontSizes.weekLabel
              )}>
                of {totalWeeks}
              </div>
              {status === 'running' && (
                <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 animate-bounce">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Day Counter */}
          <div className={cn(
            "flex flex-col items-center",
            spacing.weekWidth
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Calendar className={cn(
                "text-gray-500 dark:text-gray-400 flex-shrink-0",
                spacing.iconSize.replace('h-', 'h-3.5 ').replace('sm:h-', 'sm:h-4 ').replace('md:h-', 'md:h-4 ')
              )} />
              <span className={cn(
                "text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap",
                fontSizes.weekLabel
              )}>
                Day
              </span>
            </div>
            <div className="relative flex flex-col items-center">
              <div className={cn(
                "font-bold text-gray-900 dark:text-gray-100 tabular-nums text-center",
                fontSizes.weekNumber
              )}>
                {displayDay}
              </div>
              <div className={cn(
                "text-gray-500 dark:text-gray-400 text-center",
                fontSizes.weekLabel
              )}>
                of {totalClassDays}
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full max-w-sm flex-none">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className={cn(
                "text-gray-500 dark:text-gray-400 font-medium",
                fontSizes.progressLabel
              )}>
                Progress
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={cn(
                  "font-bold text-gray-900 dark:text-gray-100 tabular-nums text-center",
                  fontSizes.progressPercent
                )}>
                  {Math.round(progressPercentage)}%
                </span>
                {status === 'running' && (
                  <BatteryCharging className={cn(
                    "text-emerald-500 flex-shrink-0",
                    spacing.iconSize.replace('h-', 'h-3.5 ').replace('sm:h-', 'sm:h-4 ').replace('md:h-', 'md:h-4 ')
                  )} />
                )}
              </div>
            </div>
            <div className={cn(
              "relative bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
              spacing.progressBarHeight
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full transition-all duration-700",
                statusConfig.progressColor,
                pulseAnimation && "animate-pulse"
              )}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
              <div className="absolute inset-0 flex justify-between px-1">
                {Array.from({ length: totalWeeks + 1 }).map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-0.5 h-full",
                      i <= currentWeek ? "bg-white/50" : "bg-gray-300/30 dark:bg-gray-600/30"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-0.5 sm:mt-1">
              <span className={cn("text-gray-400", fontSizes.progressLabel)}>
                Week 1
              </span>
              <span className={cn("text-gray-400", fontSizes.progressLabel)}>
                Week {totalWeeks}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn(
          "flex items-center justify-center",
          spacing.gap,
          "rounded-full border backdrop-blur-sm",
          statusConfig.textColor,
          statusConfig.borderColor,
          "shadow-lg transition-all duration-300 hover:scale-105",
          pulseAnimation && `animate-pulse ${statusConfig.pulseColor}`,
          spacing.statusWidth,
          "py-1.5 sm:py-2 px-3 sm:px-4",
          "flex-shrink-0"
        )}>
          <div className="relative flex items-center justify-center">
            {statusConfig.animatedIcon}
          </div>
          <span className={cn(
            "font-semibold whitespace-nowrap text-center flex-1",
            fontSizes.statusLabel
          )}>
            {statusConfig.label}
          </span>
        </div>
      </div>

    </div>
  );
};
