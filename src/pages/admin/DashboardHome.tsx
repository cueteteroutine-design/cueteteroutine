import { useAdmin } from '@/contexts/AdminContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBatches, getTeachers, getRooms, getCourses } from '@/lib/adminApi';
import { Users, DoorOpen, BookOpen, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardHome() {
  const { isMainAdmin } = useAdmin();
  const [stats, setStats] = useState({
    batches: 0,
    teachers: 0,
    rooms: 0,
    courses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [batches, teachers, rooms, courses] = await Promise.all([
          getBatches(),
          getTeachers(),
          getRooms(),
          getCourses(),
        ]);
        setStats({
          batches: batches.length,
          teachers: teachers.length,
          rooms: rooms.length,
          courses: courses.length,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { 
      label: 'Batches', 
      value: stats.batches, 
      icon: Calendar, 
      color: 'text-primary', 
      bgColor: 'bg-primary/10',
      link: '/admin/dashboard/batches'
    },
    { 
      label: 'Teachers', 
      value: stats.teachers, 
      icon: Users, 
      color: 'text-accent', 
      bgColor: 'bg-accent/10',
      link: '/admin/dashboard/teachers'
    },
    { 
      label: 'Rooms', 
      value: stats.rooms, 
      icon: DoorOpen, 
      color: 'text-orange-500', 
      bgColor: 'bg-orange-500/10',
      link: '/admin/dashboard/rooms'
    },
    { 
      label: 'Courses', 
      value: stats.courses, 
      icon: BookOpen, 
      color: 'text-purple-500', 
      bgColor: 'bg-purple-500/10',
      link: '/admin/dashboard/courses'
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Campus workspace
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Keep routines up to date and help students plan their day.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.filter(stat => isMainAdmin || stat.link.endsWith('/batches')).map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <Link to={stat.link} className="block">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <div className="text-2xl sm:text-3xl md:text-4xl font-bold">
                        {loading ? (
                          <span className="inline-block h-8 sm:h-10 w-12 sm:w-16 bg-muted animate-pulse rounded"></span>
                        ) : (
                          stat.value
                        )}
                      </div>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-4"><h3 className="text-lg font-semibold">What would you like to do?</h3><div className="grid gap-4 sm:grid-cols-2">
        {[
          { to: 'batches', title: 'Edit a class routine', text: 'Manage batches, semester dates, and weekly classes.', icon: Calendar },
          { to: 'weekly-mods', title: 'Update this week', text: 'Reschedule or cancel a class for the current week.', icon: BookOpen },
          ...(isMainAdmin ? [{ to: 'holidays', title: 'Manage the calendar', text: 'Set holidays, weekends, and class time slots.', icon: Calendar }, { to: 'settings', title: 'Personalize the display', text: 'Choose an animated style in light or dark.', icon: DoorOpen }] : [])
        ].map(({to,title,text,icon:Icon})=><Link key={to} to={`/admin/dashboard/${to}`} className="group rounded-2xl border bg-card p-6 transition hover:border-primary/50 hover:shadow-md"><Icon className="h-6 w-6 text-primary mb-5"/><h4 className="font-semibold">{title} <span className="float-right text-primary">↗</span></h4><p className="mt-2 text-sm text-muted-foreground">{text}</p></Link>)}
      </div></section>
      <div className="rounded-2xl bg-primary/5 border border-primary/15 p-5 flex flex-wrap gap-4 items-center justify-between"><div><h3 className="font-semibold">Check the student experience</h3><p className="text-sm text-muted-foreground mt-1">Preview the routine or open the department display.</p></div><div className="flex gap-4 text-sm font-medium text-primary"><Link to="/">Student routine ↗</Link><Link to="/display">Live display ↗</Link></div></div>
    </div>
  );
}
