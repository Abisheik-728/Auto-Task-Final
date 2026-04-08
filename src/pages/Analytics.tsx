import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedCard from "@/components/AnimatedCard";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CheckCircle2, Clock, TrendingUp, Target } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsService } from "@/services/analyticsService";

const COLORS = ["hsl(142, 72%, 42%)", "hsl(38, 92%, 55%)", "hsl(0, 72%, 55%)"];

const Analytics = () => {
  const { tasks } = useTasks();
  const { user } = useAuth();
  const [studyHours, setStudyHours] = useState(0);

  useEffect(() => {
    if (!user) return;
    analyticsService.getStudySessions().then((sessions) => {
      const total = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
      setStudyHours(Math.round(total / 60));
    }).catch(() => {});
  }, [user]);

  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const priorityData = [
    { name: "High", value: tasks.filter((t) => t.priority === "High").length },
    { name: "Medium", value: tasks.filter((t) => t.priority === "Medium").length },
    { name: "Low", value: tasks.filter((t) => t.priority === "Low").length },
  ];

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const cd = new Date(t.completedAt);
      return cd.toDateString() === d.toDateString();
    }).length;
    return { day: dayStr, completed: count };
  });

  const stats = [
    { label: "Total Tasks", value: tasks.length, icon: Target, color: "text-primary" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-priority-low" },
    { label: "Pending", value: pending, icon: Clock, color: "text-priority-medium" },
    { label: "Study Hours", value: studyHours, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Track your academic productivity</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <AnimatedCard key={s.label} className="glass-card p-4" delay={i * 0.08}>
              <div className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Completion Rate</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                    strokeDasharray={`${completionRate * 2.51} 251`} strokeLinecap="round"
                    transform="rotate(-90 50 50)" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-foreground">{completionRate}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Tasks by Priority</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Weekly Completions</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Analytics;
