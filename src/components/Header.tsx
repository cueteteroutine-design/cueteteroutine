import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun, CalendarDays, GraduationCap, DoorOpen, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { HolidayCalendarModal } from './HolidayCalendarModal';
export function Header(_props: {onTeacherSchedule?: () => void; onRoomSchedule?: () => void}) {
  const {theme,toggleTheme} = useTheme();
  const [calendarOpen,setCalendarOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
    <div className="container flex h-16 items-center justify-between gap-3 px-4">
      <Link to="/" className="flex items-center gap-3 min-w-0">
        <img src="/Cuet_logo.png" alt="CUET" width="36" height="44" className="h-11 w-9 object-contain" />
        <span className="font-bold tracking-tight">CUET ETE<span className="block text-xs font-normal text-muted-foreground">Academic routine & calendar</span></span>
      </Link>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Open holiday calendar" onClick={() => setCalendarOpen(true)}><CalendarDays className="h-5 w-5" /></Button>
        <Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={toggleTheme}>{theme === 'light' ? <Moon className="h-5 w-5"/> : <Sun className="h-5 w-5"/>}</Button>
        <Button asChild variant="outline" size="sm"><Link to="/admin"><LogIn className="mr-2 h-4 w-4"/>Admin</Link></Button>
      </div>
    </div>
    <nav aria-label="Schedule views" className="container grid grid-cols-3 gap-1 px-3 pb-2 sm:flex sm:gap-2">
      {[{to:'/',label:'Batch routines',icon:CalendarDays},{to:'/teachers',label:'Teachers',icon:GraduationCap},{to:'/rooms',label:'Rooms',icon:DoorOpen}].map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end className={({isActive}) => `flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="h-4 w-4 shrink-0"/>{label}</NavLink>)}
    </nav>
    <HolidayCalendarModal open={calendarOpen} onOpenChange={setCalendarOpen}/>
  </header>;
}
