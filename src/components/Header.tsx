import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, Moon, Sun, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
const links = [['/', 'Student routine'], ['/teachers', 'Teachers'], ['/classrooms', 'Classrooms'], ['/holidays', 'Holidays']];
export function Header() {
 const { theme, toggleTheme } = useTheme();
 const [open, setOpen] = useState(false);
 const navigation = links.map(([to,label]) => <NavLink key={to} to={to} end onClick={()=>setOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive?'bg-primary/10 text-primary':'text-muted-foreground hover:bg-muted'}`}>{label}</NavLink>);
 return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xl">
  <div className="container flex h-20 items-center justify-between gap-3 px-4 sm:px-6">
   <Link to="/" className="flex items-center gap-3 min-w-0"><img src="/Cuet_logo.png" alt="CUET" className="h-11 w-11 object-contain"/><div><strong className="block tracking-tight">ETE <span className="text-primary">Campus</span></strong><span className="text-xs text-muted-foreground">Your academic day, simplified.</span></div></Link>
   <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">{navigation}</nav>
   <div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label={`Switch to ${theme==='light'?'dark':'light'} mode`} onClick={toggleTheme}>{theme==='light'?<Moon className="h-5 w-5"/>:<Sun className="h-5 w-5"/>}</Button><Link to="/admin" className="hidden sm:inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"><GraduationCap className="h-4 w-4"/>Admin</Link>
    <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>ETE Campus</SheetTitle></SheetHeader><nav aria-label="Mobile navigation" className="mt-6 flex flex-col gap-2">{navigation}<Link to="/admin" onClick={()=>setOpen(false)} className="rounded-xl border p-4">Admin access</Link></nav></SheetContent></Sheet>
   </div>
  </div>
 </header>;
}
