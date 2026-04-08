import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar as CalendarIcon, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { addDays, isBefore, isAfter, format } from "date-fns";

interface ReminderSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  daysBefore: number;
}

const Reminders = () => {
  const { tasks, loading } = useTasks();
  const [settings, setSettings] = useState<ReminderSetting[]>([
    { id: "3day", label: "3 days before deadline", description: "Get notified 3 days before any deadline", enabled: true, daysBefore: 3 },
    { id: "1day", label: "1 day before deadline", description: "Get a reminder the day before", enabled: true, daysBefore: 1 },
    { id: "same", label: "Same day reminder", description: "Final reminder on the day of the deadline", enabled: false, daysBefore: 0 },
  ]);

  const toggle = (id: string) =>
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const enabledSettings = settings.filter((s) => s.enabled);
    const pendingWithDeadline = tasks.filter((t) => !t.completed && t.deadline);

    const reminders: { task: string; date: string; type: string; sortDate: Date }[] = [];

    for (const task of pendingWithDeadline) {
      const deadline = new Date(task.deadline!);
      for (const setting of enabledSettings) {
        const reminderDate = addDays(deadline, -setting.daysBefore);
        if (isAfter(reminderDate, addDays(now, -1)) && isBefore(reminderDate, addDays(now, 14))) {
          reminders.push({
            task: task.title,
            date: format(reminderDate, "MMMM d, yyyy"),
            type: setting.daysBefore === 0 ? "Same day" : `${setting.daysBefore} day${setting.daysBefore > 1 ? "s" : ""} before`,
            sortDate: reminderDate,
          });
        }
      }
    }

    return reminders.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
  }, [tasks, settings]);

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reminders & Calendar</h1>
          <p className="mt-1 text-muted-foreground">Configure deadline reminders and calendar integration</p>
        </div>

        <Card className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Reminder Settings</h2>
          </div>
          <div className="space-y-4">
            {settings.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <Switch checked={s.enabled} onCheckedChange={() => toggle(s.id)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Calendar Integration</h2>
          </div>
          <p className="text-sm text-muted-foreground">Sync your deadlines with Google Calendar to get native notifications on all your devices.</p>
          <Button className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Connect Google Calendar
          </Button>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold text-foreground">Upcoming Reminders</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : upcomingReminders.length === 0 ? (
            <Card className="glass-card p-6 text-center">
              <p className="text-sm text-muted-foreground italic">No upcoming reminders. Add tasks with deadlines to see reminders here.</p>
            </Card>
          ) : (
            upcomingReminders.map((r, i) => (
              <Card key={i} className="glass-card p-4 flex items-center justify-between animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.task}</p>
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{r.type}</Badge>
              </Card>
            ))
          )}
        </div>
      </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Reminders;
