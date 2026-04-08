import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  CheckCircle2,
  Bell,
  Trash2,
  Clock,
  Zap,
  AlertTriangle,
  CalendarCheck,
  Loader2,
} from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { format } from "date-fns";
import { calculateDynamicPriority } from "@/utils/priorityEngine";
import { googleService } from "@/services/googleService";
import { useToast } from "@/hooks/use-toast";

const priorityStyles: Record<string, { badge: string; border: string; dot: string }> = {
  Critical: { badge: "priority-critical", border: "border-l-[hsl(var(--priority-critical))]", dot: "bg-[hsl(var(--priority-critical))]" },
  Expired: { badge: "priority-expired", border: "border-l-[hsl(var(--priority-expired))]", dot: "bg-[hsl(var(--priority-expired))]" },
  High: { badge: "priority-high", border: "border-l-[hsl(var(--priority-high))]", dot: "bg-[hsl(var(--priority-high))]" },
  Medium: { badge: "priority-medium", border: "border-l-[hsl(var(--priority-medium))]", dot: "bg-[hsl(var(--priority-medium))]" },
  Low: { badge: "priority-low", border: "border-l-[hsl(var(--priority-low))]", dot: "bg-[hsl(var(--priority-low))]" },
};

const priorityIcons: Record<string, typeof AlertTriangle> = {
  Critical: Zap,
  Expired: Clock,
  High: AlertTriangle,
  Medium: AlertTriangle,
  Low: CheckCircle2,
};

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

const TaskCard = ({ task, onToggle, onDelete, onUpdate }: TaskCardProps) => {
  const dynamicPriority = calculateDynamicPriority(task.deadline);
  const displayPriority = task.completed ? task.priority : dynamicPriority;
  const ps = priorityStyles[displayPriority] || priorityStyles.Medium;
  const PIcon = priorityIcons[displayPriority] || AlertTriangle;
  const { toast } = useToast();

  const [calSynced, setCalSynced] = useState(false);
  const [calSyncing, setCalSyncing] = useState(false);

  const handleCalendarToggle = async () => {
    if (!task.deadline) {
      toast({
        title: "No deadline set",
        description: "Add a deadline to this task before syncing to Google Calendar.",
        variant: "destructive",
      });
      return;
    }

    setCalSyncing(true);
    try {
      if (calSynced) {
        // UNSYNC — delete from Google Calendar
        await googleService.unsyncTask(task.id);
        setCalSynced(false);
        toast({ title: "Removed from Calendar", description: `"${task.title}" event deleted.` });
      } else {
        // SYNC — create in Google Calendar
        const result = await googleService.syncTask(task.id, task.title, task.deadline);
        setCalSynced(true);
        toast({
          title: "Synced to Google Calendar! 📅",
          description: result.eventLink ? (
            <a
              href={result.eventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              Open in Google Calendar →
            </a>
          ) : (
            `"${task.title}" added to your calendar.`
          ),
        });
      }
    } catch (err: any) {
      const isAuthError = err.message?.includes("NOT_CONNECTED") || err.message?.includes("re-authenticate");
      toast({
        title: isAuthError ? "Not Connected" : "Sync Failed",
        description: isAuthError
          ? "Please connect Google Calendar first from the Dashboard."
          : err.message,
        variant: "destructive",
      });
    } finally {
      setCalSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
    >
      <Card
        className={`glass-card p-4 border-l-4 ${ps.border} flex items-center gap-4 transition-all duration-200 hover:shadow-md ${task.completed ? "opacity-60" : ""}`}
      >
        {/* Complete toggle */}
        <button onClick={() => onToggle(task.id)} className="shrink-0">
          <CheckCircle2
            className={`w-5 h-5 transition-colors ${task.completed ? "text-[hsl(var(--priority-low))] fill-[hsl(var(--priority-low))]/20" : "text-muted-foreground"}`}
          />
        </button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-foreground ${task.completed ? "line-through" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            {task.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(task.deadline), "MMM d, yyyy")}
              </span>
            )}
            {task.category && <Badge variant="outline" className="text-xs">{task.category}</Badge>}
            {task.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>

        {/* Priority badge */}
        <Badge
          variant="secondary"
          className={`${ps.badge} text-xs font-semibold hidden sm:inline-flex gap-1`}
        >
          <PIcon className="w-3 h-3" />
          {displayPriority}
        </Badge>

        {/* Calendar sync toggle */}
        <div className="flex items-center gap-2 shrink-0" title={calSynced ? "Synced to Google Calendar – click to remove" : "Sync to Google Calendar"}>
          {calSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <CalendarCheck className={`w-4 h-4 transition-colors ${calSynced ? "text-blue-500" : "text-muted-foreground/40"}`} />
          )}
          <Switch
            checked={calSynced}
            onCheckedChange={handleCalendarToggle}
            disabled={calSyncing || task.completed}
            aria-label="Sync to Google Calendar"
          />
        </div>

        {/* Reminder toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Bell className={`w-4 h-4 ${task.reminderEnabled ? "text-primary" : "text-muted-foreground/40"}`} />
          <Switch
            checked={task.reminderEnabled}
            onCheckedChange={() => onUpdate(task.id, { reminderEnabled: !task.reminderEnabled })}
          />
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </Card>
    </motion.div>
  );
};

export { priorityStyles };
export default TaskCard;
