import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { PageMeta } from '@/components/PageMeta';
import Index from "./pages/Index";
const Display = lazy(() => import('./pages/Display'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'));
const RoomsPage = lazy(() => import('./pages/admin/RoomsPage'));
const CoursesPage = lazy(() => import('./pages/admin/CoursesPage'));
const BatchesPage = lazy(() => import('./pages/admin/BatchesPage'));
const ScheduleEditor = lazy(() => import('./pages/admin/ScheduleEditor'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const HolidaysPage = lazy(() => import('./pages/admin/HolidaysPage'));
const WeeklyModsPage = lazy(() => import('./pages/admin/WeeklyModsPage'));
const CoAdminsPage = lazy(() => import('./pages/admin/CoAdminsPage'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AdminProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageMeta/>
            <Suspense fallback={<p className="p-8 text-muted-foreground">Loading page…</p>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/teachers" element={<Index view="teachers" />} />
              <Route path="/rooms" element={<Index view="rooms" />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/display" element={<Display />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />}>
                <Route index element={<DashboardHome />} />
                <Route path="teachers" element={<TeachersPage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="batches" element={<BatchesPage />} />
                <Route path="schedule/:batchId" element={<ScheduleEditor />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="holidays" element={<HolidaysPage />} />
              <Route path="weekly-mods" element={<WeeklyModsPage />} />
              <Route path="admins" element={<CoAdminsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
