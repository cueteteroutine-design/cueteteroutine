import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, Users, DoorOpen, BookOpen, Calendar, CalendarDays, CalendarClock, LogOut, ArrowUpRight, Settings, Menu, Sun, Moon, UserCog } from 'lucide-react';
const items = [
  {path:'',label:'Overview',icon:LayoutDashboard,group:'Workspace'},
  {path:'/batches',label:'Batches & routines',icon:Calendar,group:'Workspace'},
  {path:'/weekly-mods',label:'Weekly changes',icon:CalendarClock,group:'Workspace'},
  {path:'/teachers',label:'Teachers',icon:Users,group:'Directory',admin:true},
  {path:'/rooms',label:'Rooms & labs',icon:DoorOpen,group:'Directory',admin:true},
  {path:'/courses',label:'Courses',icon:BookOpen,group:'Directory',admin:true},
  {path:'/holidays',label:'Calendar & time slots',icon:CalendarDays,group:'Administration',admin:true},
  {path:'/admins',label:'Co-admin access',icon:UserCog,group:'Administration',admin:true},
  {path:'/settings',label:'Account settings',icon:Settings,group:'Administration'},
];
export default function AdminDashboard() {
  const {isLoggedIn,authLoading,username,logout,isMainAdmin} = useAdmin();
  const {theme,toggleTheme} = useTheme();
  const {pathname} = useLocation();
  const [open,setOpen] = useState(false);
  useEffect(() => setOpen(false),[pathname]);
  if (authLoading) return <p className="p-8">Checking your session…</p>;
  if (!isLoggedIn) return <Navigate to="/admin" replace/>;
  const active = items.find(item => pathname === '/admin/dashboard' + item.path);
  if (active?.admin && !isMainAdmin) return <Navigate to="/admin/dashboard" replace/>;
  const navigation = <nav aria-label="Admin navigation" className="space-y-6 py-5">
    {['Workspace','Directory','Administration'].map(group => {
      const links = items.filter(item => item.group === group && (!item.admin || isMainAdmin));
      if (!links.length) return null;
      return <div key={group}><p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group}</p><div className="space-y-1">{links.map(item => {
        const selected = active === item || (item.path === '/batches' && pathname.includes('/schedule/'));
        return <Link key={item.path} to={'/admin/dashboard' + item.path} aria-current={selected ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><item.icon className="h-4 w-4 shrink-0"/>{item.label}</Link>;
      })}</div></div>;
    })}
  </nav>;
  return <div className="admin-shell min-h-screen bg-background lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="hidden lg:flex sticky top-0 h-screen flex-col border-r bg-card p-4">
      <Link to="/" className="flex items-center gap-3 px-3 py-4"><img src="/Cuet_logo.png" alt="CUET" className="w-9 h-11 object-contain"/><span className="font-bold">ETE Workspace<span className="block text-xs text-muted-foreground font-normal">Routine administration</span></span></Link>
      <div className="flex-1 overflow-y-auto">{navigation}</div>
      <div className="border-t pt-4 px-3"><p className="text-sm font-semibold truncate">{username}</p><p className="text-xs text-muted-foreground mt-1">{isMainAdmin ? 'Administrator' : 'Batch co-admin'}</p></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 sm:px-7">
        <div className="flex items-center gap-3 min-w-0">
          <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Open admin navigation"><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent side="left" className="w-72 overflow-y-auto"><SheetHeader><SheetTitle>ETE Workspace</SheetTitle></SheetHeader>{navigation}</SheetContent></Sheet>
          <h1 className="text-sm sm:text-base font-semibold truncate">{active?.label || 'Schedule editor'}</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/"><span className="hidden sm:inline mr-1">View website</span><ArrowUpRight className="h-4 w-4"/><span className="sr-only sm:hidden">View website</span></Link></Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle color theme">{theme === 'light' ? <Moon className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}</Button>
          <Button variant="outline" size="sm" onClick={logout} aria-label="Sign out"><LogOut className="h-4 w-4"/><span className="hidden sm:inline ml-2">Sign out</span></Button>
        </div>
      </header>
      <main id="main-content" className="min-w-0 p-4 sm:p-7 lg:p-9 max-w-[1440px] mx-auto"><Outlet/></main>
    </div>
  </div>;
}
