import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminProvider } from "@/contexts/AdminContext";
import Index from "./pages/Index";
import Display from "./pages/Display";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardHome from "./pages/admin/DashboardHome";
import TeachersPage from "./pages/admin/TeachersPage";
import RoomsPage from "./pages/admin/RoomsPage";
import CoursesPage from "./pages/admin/CoursesPage";
import BatchesPage from "./pages/admin/BatchesPage";
import ScheduleEditor from "./pages/admin/ScheduleEditor";
import SettingsPage from "./pages/admin/SettingsPage";
import HolidaysPage from "./pages/admin/HolidaysPage";
import WeeklyModsPage from "./pages/admin/WeeklyModsPage";
import CoAdminsPage from "./pages/admin/CoAdminsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AdminProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/teachers" element={<Index view="teachers" />} />
              <Route path="/classrooms" element={<Index view="classrooms" />} />
              <Route path="/holidays" element={<Index view="holidays" />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
