import { useState, useEffect, useCallback } from "react";
import { taskService, Task } from "@/services/taskService";
import { useAuth } from "@/contexts/AuthContext";

export type { Task } from "@/services/taskService";

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await taskService.getAll();
      setTasks(data);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task: Partial<Task>) => {
    if (!user) return;
    try {
      const data = await taskService.create(task);
      setTasks((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await taskService.update(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await taskService.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    await updateTask(id, {
      completed,
      status: completed ? "completed" : "pending",
      completedAt: completed ? new Date().toISOString() : null,
    });
  };

  return { tasks, loading, addTask, updateTask, deleteTask, toggleComplete, refetch: fetchTasks };
};
