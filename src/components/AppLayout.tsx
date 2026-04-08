import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Brain, Sparkles, LayoutDashboard, BarChart3, Bell, LogOut, CalendarDays, FolderOpen, Timer, TrendingUp, User, Search, StickyNote, Shield, MessageSquare, GraduationCap, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import QuickAddTask from "@/components/QuickAddTask";
import NotificationBell from "@/components/NotificationBell";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const studentNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/generator", label: "AI Generator", icon: Sparkles },
  { to: "/chatbot", label: "AI Assistant", icon: MessageSquare },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/materials", label: "Materials", icon: FolderOpen },
  { to: "/notes", label: "Sticky Notes", icon: StickyNote },
  { to: "/workload", label: "Workload", icon: BarChart3 },
  { to: "/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
];

const facultyNavItems = [
  { to: "/faculty", label: "Faculty Dashboard", icon: GraduationCap },
  { to: "/materials", label: "Materials", icon: FolderOpen },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: TrendingUp },
];

const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/generator", label: "AI", icon: Sparkles },
  { to: "/chatbot", label: "Chat", icon: MessageSquare },
  { to: "/timetable", label: "Schedule", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const isFaculty = roles.includes("faculty");
  const navItems = isFaculty ? facultyNavItems : studentNavItems;
  const initials = (profile?.displayName || "U").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">BackLog</span>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9 bg-muted/50 border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          {roles.includes("admin") && (
            <NavLink
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </NavLink>
          )}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
          <NavLink
            to="/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{profile?.displayName || "Profile"}</span>
          </NavLink>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        <nav className="flex justify-around py-2">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                location.pathname === item.to ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>

      <QuickAddTask />
    </div>
  );
};

export default AppLayout;
