import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  DoorOpen, 
  BookOpen, 
  Calendar,
  CalendarDays,
  CalendarClock,
  LogOut,
  ArrowLeft,
  Settings,
  Menu,
  Sun,
  Moon,
  X,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const allNavItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { path: '/admin/dashboard/batches', label: 'Batches/Routines', icon: Calendar, adminOnly: false },
  { path: '/admin/dashboard/weekly-mods', label: 'Weekly Modifications', icon: CalendarClock, adminOnly: false },
  { path: '/admin/dashboard/teachers', label: 'Teachers', icon: Users, adminOnly: true },
  { path: '/admin/dashboard/rooms', label: 'Rooms', icon: DoorOpen, adminOnly: true },
  { path: '/admin/dashboard/courses', label: 'Courses', icon: BookOpen, adminOnly: true },
  { path: '/admin/dashboard/holidays', label: 'Time & Calendar', icon: CalendarDays, adminOnly: true },
  { path: '/admin/dashboard/admins', label: 'Co-Admins', icon: UserCog, adminOnly: true },
  { path: '/admin/dashboard/settings', label: 'Settings', icon: Settings, adminOnly: false },
];

export default function AdminDashboard() {
  const { isLoggedIn, authLoading, username, logout, isMainAdmin } = useAdmin();
  const navItems = allNavItems.filter((n) => !n.adminOnly || isMainAdmin);
  const roleLabel = isMainAdmin ? 'Administrator' : 'Co-Admin';
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, authLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  if (!isLoggedIn) {
    return null;
  }

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav aria-label="Admin navigation" className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path.endsWith('/batches') && location.pathname.includes('/schedule/'));
        const group = item.label === 'Dashboard' ? 'Workspace' : item.label === 'Teachers' ? 'Academic resources' : item.label === 'Co-Admins' ? 'Administration' : item.label === 'Settings' && !isMainAdmin ? 'Preferences' : '';
        
        return (
          <div key={item.path} className={group ? "admin-nav-group" : ""}>{group && <p className="admin-nav-label">{group}</p>}<Link
            aria-current={isActive ? "page" : undefined}
            to={item.path}
            onClick={() => mobile && setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
              'hover:translate-x-1',
              isActive 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link></div>
        );
      })}
    </nav>
  );

  return (
    <div className="admin-shell min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="h-14 sm:h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Mobile menu trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  aria-label="Open admin menu" className="lg:hidden h-9 w-9 shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <SheetTitle className="font-bold text-lg">Admin Panel</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close admin menu" className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-xs">
                        {username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{username}</p>
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <NavContent mobile />
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Back to home */}
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-accent shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            {/* Title */}
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">
                {navItems.find(n => n.path === location.pathname)?.label || 'Schedule editor'}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                {username}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            
            {/* Logout button */}
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleLogout} 
              aria-label="Log out" className="h-9 gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex max-w-screen-2xl mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r bg-card/30 min-h-[calc(100vh-4rem)]">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{username}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Navigation
              </p>
            </div>
            <NavContent />
          </div>
          
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ETE Routine Management System
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-x-hidden bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
