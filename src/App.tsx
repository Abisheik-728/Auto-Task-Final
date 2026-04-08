import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TaskGenerator from "./pages/TaskGenerator";
import Dashboard from "./pages/Dashboard";
import WorkloadAnalyzer from "./pages/WorkloadAnalyzer";
import Reminders from "./pages/Reminders";
import Timetable from "./pages/Timetable";
import StudyMaterials from "./pages/StudyMaterials";
import Analytics from "./pages/Analytics";
import PomodoroTimer from "./pages/PomodoroTimer";
import Profile from "./pages/Profile";
import StickyNotes from "./pages/StickyNotes";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Chatbot from "./pages/Chatbot";
import NotFound from "./pages/NotFound";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import WhatsAppConnect from "./pages/WhatsAppConnect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/generator" element={<ProtectedRoute><TaskGenerator /></ProtectedRoute>} />
              <Route path="/workload" element={<ProtectedRoute><WorkloadAnalyzer /></ProtectedRoute>} />
              <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
              <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
              <Route path="/materials" element={<ProtectedRoute><StudyMaterials /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/pomodoro" element={<ProtectedRoute><PomodoroTimer /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><StickyNotes /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/faculty" element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />
              <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
              <Route path="/calendar-callback" element={<GoogleCalendarCallback />} />
              <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppConnect /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
