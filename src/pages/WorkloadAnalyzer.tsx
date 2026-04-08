import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, TrendingUp, Info, Loader2 } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";

const barColors: Record<string, string> = {
  Low: "hsl(142, 72%, 42%)",
  Medium: "hsl(38, 92%, 55%)",
  High: "hsl(0, 72%, 55%)",
};

const getLevel = (count: number) => (count >= 4 ? "High" : count >= 3 ? "Medium" : "Low");

const WorkloadAnalyzer = () => {
  const { tasks, loading } = useTasks();

  const weeklyData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const count = tasks.filter(
        (t) => !t.completed && t.deadline && isSameDay(new Date(t.deadline), date)
      ).length;
      return { day: format(date, "EEE"), tasks: count, level: getLevel(count) };
    });
  }, [tasks]);

  const insights = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed);
    const withDeadline = pending.filter((t) => t.deadline);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const thisWeek = withDeadline.filter((t) => {
      const d = new Date(t.deadline!);
      return d >= weekStart && d <= weekEnd;
    });

    const busiestDay = weeklyData.reduce((a, b) => (b.tasks > a.tasks ? b : a), weeklyData[0]);
    const freeDays = weeklyData.filter((d) => d.tasks === 0).map((d) => d.day);

    const result = [];
    if (thisWeek.length > 0) {
      result.push({ icon: AlertTriangle, text: `You have ${thisWeek.length} deadline${thisWeek.length > 1 ? "s" : ""} this week. Start early to avoid missing submissions.`, type: "warning" });
    }
    if (busiestDay.tasks > 0) {
      result.push({ icon: TrendingUp, text: `${busiestDay.day} is your busiest day with ${busiestDay.tasks} task${busiestDay.tasks > 1 ? "s" : ""}. Plan ahead!`, type: "info" });
    }
    if (freeDays.length > 0) {
      result.push({ icon: Info, text: `Consider spreading your workload — ${freeDays.join(", ")} ${freeDays.length === 1 ? "is" : "are"} open.`, type: "tip" });
    }
    if (result.length === 0) {
      result.push({ icon: Info, text: "No upcoming deadlines this week. Great time to get ahead!", type: "tip" });
    }
    return result;
  }, [tasks, weeklyData]);

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">AI Workload Analyzer</h1>
          <p className="mt-1 text-muted-foreground">Visualize your weekly academic workload</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Low Workload", color: "bg-priority-low", count: "0–2 tasks" },
            { label: "Medium Workload", color: "bg-priority-medium", count: "3 tasks" },
            { label: "High Workload", color: "bg-priority-high", count: "4+ tasks" },
          ].map((item) => (
            <Card key={item.label} className="glass-card p-4 flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full ${item.color}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.count}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Weekly Task Distribution</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 13 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 13 }} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(215, 20%, 90%)", borderRadius: "0.5rem", fontSize: 13 }} />
                  <Bar dataKey="tasks" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={index} fill={barColors[entry.level]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold text-foreground">AI Insights</h2>
          {insights.map((insight, i) => (
            <Card key={i} className="glass-card p-4 flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <insight.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{insight.text}</p>
            </Card>
          ))}
        </div>
      </div>
      </PageTransition>
    </AppLayout>
  );
};

export default WorkloadAnalyzer;
