import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, DoorOpen, BookOpen, ArrowUpRight, CalendarClock, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { loadData } from '@/lib/jsonData';
import { useJsonResource } from '@/hooks/useJsonResource';
import { Batch } from '@/lib/adminApi';
export default function DashboardHome() {
  const {username,isMainAdmin,assignedBatchIds} = useAdmin();
  const {data:batches,loading,error} = useJsonResource<Batch[]>('/batches',[]);
  const [counts,setCounts] = useState({teachers:0,rooms:0,courses:0});
  const [storage,setStorage] = useState('Checking…');
  useEffect(() => {
    loadData().then(({tables:t}) => setCounts({teachers:t.teachers.length,rooms:t.rooms.length,courses:t.courses.length})).catch(() => {});
    fetch('/api/admin/health').then(r => r.json()).then(r => setStorage(r.storage === 'github' ? 'GitHub connected' : r.storage === 'local' ? 'Local JSON files' : 'Read-only · setup required')).catch(() => setStorage('Connection unavailable'));
  },[]);
  const visible = batches.filter(b => isMainAdmin || assignedBatchIds.includes(b.id));
  const exportData = async () => {
    const data = await loadData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data.tables,null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'ete-calendar.json'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-7">
    <section className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300 mb-3">CUET · Electronics & Telecommunication Engineering</p><h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {username}.</h2><p className="text-sm text-slate-300 mt-3 max-w-lg">Keep every batch on the same page. Manage routines, update this week’s classes, and keep the calendar current.</p></div>
      <Button asChild className="shrink-0 bg-white text-slate-900 hover:bg-slate-100"><Link to="/admin/dashboard/batches">Manage routines <ArrowUpRight className="ml-2 h-4 w-4"/></Link></Button>
    </section>
    {error && <div role="alert" className="rounded-xl border border-destructive p-4 text-destructive">{error}<Button variant="outline" onClick={() => window.location.reload()} className="ml-3">Retry</Button></div>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {[{label:'Active batches',value:visible.filter(b => b.is_active).length,icon:Calendar,path:'/admin/dashboard/batches'}, {label:'Teachers',value:counts.teachers,icon:Users,path:isMainAdmin ? '/admin/dashboard/teachers' : '/teachers'}, {label:'Rooms & labs',value:counts.rooms,icon:DoorOpen,path:isMainAdmin ? '/admin/dashboard/rooms' : '/rooms'}, {label:'Courses',value:counts.courses,icon:BookOpen,path:isMainAdmin ? '/admin/dashboard/courses' : '/'}].map(item => <Link key={item.label} to={item.path} className="rounded-2xl border bg-card p-4 sm:p-5 hover:border-primary/50 transition-colors"><div className="flex justify-between gap-2 text-muted-foreground"><p className="text-xs sm:text-sm">{item.label}</p><item.icon className="h-4 w-4 shrink-0"/></div><p className="text-3xl font-semibold mt-4 tabular-nums">{loading ? '—' : item.value}</p></Link>)}
    </div>
    <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">
      <section className="rounded-2xl border bg-card overflow-hidden"><div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Your batch routines</h3><span className="text-xs text-muted-foreground">{visible.length} batches</span></div>
        {visible.map(b => <Link key={b.id} to={`/admin/dashboard/schedule/${b.id}`} className="flex items-center justify-between gap-3 p-5 border-b last:border-0 hover:bg-muted/50"><div className="min-w-0"><p className="font-semibold truncate">{b.name}</p><p className="text-xs text-muted-foreground mt-1">Level {b.level} · Term {b.term} · {b.total_weeks} weeks</p></div><div className="flex items-center gap-3"><span className={`text-xs rounded-full px-2 py-1 ${b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{b.is_active ? 'Active' : 'Archived'}</span><ArrowUpRight className="h-4 w-4"/></div></Link>)}
        {!loading && !visible.length && <p className="p-5 text-sm text-muted-foreground">No batches assigned yet.</p>}
      </section>
      <section className="space-y-4"><div className="rounded-2xl border bg-card p-5"><CalendarClock className="h-5 w-5 text-primary mb-3"/><h3 className="font-semibold">A change for this week?</h3><p className="text-sm text-muted-foreground my-3">Cancel or move a class without changing the regular routine.</p><Button asChild variant="outline" className="w-full"><Link to="/admin/dashboard/weekly-mods">Manage weekly changes</Link></Button></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-sm font-medium flex gap-2 items-center"><RefreshCw className="h-4 w-4 text-primary"/>{storage}</p><p className="text-xs text-muted-foreground mt-2 mb-4">Visitors check for updates every minute while the page is open.</p><Button variant="outline" className="w-full" onClick={exportData}><Download className="mr-2 h-4 w-4"/>Export calendar JSON</Button></div>
      </section>
    </div>
  </div>;
}
