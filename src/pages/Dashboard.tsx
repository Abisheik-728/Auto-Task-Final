import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedCard from "@/components/AnimatedCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Bell, Filter, Clock, Target, Zap, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { isToday, isBefore, addDays, format } from "date-fns";
import TaskCard, { priorityStyles } from "@/components/TaskCard";
import { calculateDynamicPriority } from "@/utils/priorityEngine";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";

const priorityOrder = ["Critical", "Expired", "High", "Medium", "Low"] as const;

const Dashboard = () => {
  const { profile } = useAuth();
  const { tasks, loading, toggleComplete, updateTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();

  // Dynamic priority categorization
  const criticalTasks = tasks.filter((t) => !t.completed && calculateDynamicPriority(t.deadline) === "Critical");
  const expiredTasks = tasks.filter((t) => !t.completed && calculateDynamicPriority(t.deadline) === "Expired");
  const todayTasks = tasks.filter((t) => !t.completed && t.deadline && isToday(new Date(t.deadline)));
  const upcomingTasks = tasks.filter((t) => !t.completed && t.deadline && !isToday(new Date(t.deadline)) && isBefore(new Date(t.deadline), addDays(now, 7)) && !isBefore(new Date(t.deadline), now));

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed" && !t.completed) return false;
    if (filter === "pending" && t.completed) return false;
    if (filter !== "all" && filter !== "completed" && filter !== "pending") {
      const dp = calculateDynamicPriority(t.deadline);
      if (dp !== filter && t.priority !== filter) return false;
    }
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const pa = priorityOrder.indexOf(calculateDynamicPriority(a.deadline) as any);
      const pb = priorityOrder.indexOf(calculateDynamicPriority(b.deadline) as any);
      return pa - pb;
    }
    if (sortBy === "deadline") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    pending: tasks.filter((t) => !t.completed).length,
    critical: criticalTasks.length + expiredTasks.length,
  };

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const destPriority = result.destination.droppableId;
    const taskId = result.draggableId;
    if (result.source.droppableId !== destPriority) {
      updateTask(taskId, { priority: destPriority as any });
    }
  };

  // Group tasks by dynamic priority for the kanban view
  const grouped = (["High", "Medium", "Low"] as const).map((p) => ({
    priority: p,
    tasks: sortedTasks.filter((t) => {
      const dp = t.completed ? t.priority : calculateDynamicPriority(t.deadline);
      return dp === p;
    }),
  }));

  // Upcoming deadlines for mini calendar
  const upcomingDeadlines = tasks
    .filter((t) => !t.completed && t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {greeting()}, {profile?.displayName?.split(" ")[0] || "Student"} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">Here's your academic overview</p>
            <div className="mt-4">
              <GoogleCalendarConnect showCreateDemo={false} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Tasks", value: stats.total, icon: Target, color: "text-primary" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-[hsl(var(--priority-low))]" },
              { label: "Pending", value: stats.pending, icon: Clock, color: "text-[hsl(var(--priority-medium))]" },
              { label: "Critical", value: stats.critical, icon: Zap, color: "text-[hsl(var(--priority-critical))]" },
            ].map((s, i) => (
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

          {/* Priority Alerts */}
          {(criticalTasks.length > 0 || expiredTasks.length > 0) && (
            <div className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-[hsl(var(--priority-critical))] flex items-center gap-2">
                <Zap className="w-5 h-5" /> Priority Alerts
              </h2>
              {expiredTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onUpdate={updateTask} />
              ))}
              {criticalTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onUpdate={updateTask} />
              ))}
            </div>
          )}

          {/* Today's Tasks */}
          {todayTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">📌 Due Today</h2>
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onUpdate={updateTask} />
              ))}
            </div>
          )}

          {/* Upcoming Deadlines Mini Calendar */}
          {upcomingDeadlines.length > 0 && (
            <Card className="glass-card p-5">
              <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-primary" /> Upcoming Deadlines
              </h2>
              <div className="space-y-2">
                {upcomingDeadlines.map((task) => {
                  const dp = calculateDynamicPriority(task.deadline);
                  const ps = priorityStyles[dp] || priorityStyles.Medium;
                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ps.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      </div>
                      <Badge variant="secondary" className={`${ps.badge} text-xs shrink-0`}>{dp}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(task.deadline!), "MMM d")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Filter tasks..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
                <SelectItem value="Low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">By Priority</SelectItem>
                <SelectItem value="deadline">By Deadline</SelectItem>
                <SelectItem value="created">By Created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task Groups */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              {grouped.map(({ priority, tasks: groupTasks }) => (
                <Droppable key={priority} droppableId={priority}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${(priorityStyles[priority] || priorityStyles.Medium).dot}`} />
                        <h2 className="text-lg font-display font-semibold text-foreground">{priority} Priority</h2>
                        <span className="text-sm text-muted-foreground">({groupTasks.length})</span>
                      </div>
                      <div className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-accent/50 p-2" : ""}`}>
                        {groupTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`transition-shadow ${snapshot.isDragging ? "shadow-xl" : ""}`}
                              >
                                <TaskCard task={task} onToggle={toggleComplete} onDelete={deleteTask} onUpdate={updateTask} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {groupTasks.length === 0 && (
                          <p className="text-sm text-muted-foreground italic pl-5">No tasks — drag here to set priority</p>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </DragDropContext>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Dashboard;
