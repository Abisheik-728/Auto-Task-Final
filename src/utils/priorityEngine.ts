import { differenceInDays, isPast, isToday, startOfDay } from "date-fns";

export type DynamicPriority = "Critical" | "Expired" | "High" | "Medium" | "Low";

export const WORK_TYPES = [
  "Assignment",
  "Exam",
  "Project Review",
  "Event",
  "Hackathon",
  "Seminar",
  "Internship",
  "Placement",
  "Meeting",
  "Deadline Reminder",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export function calculateDynamicPriority(deadline: string | null): DynamicPriority {
  if (!deadline) return "Medium";

  const now = startOfDay(new Date());
  const due = startOfDay(new Date(deadline));

  if (isPast(due) && !isToday(due)) return "Expired";

  const daysLeft = differenceInDays(due, now);

  if (daysLeft === 0) return "Critical";
  if (daysLeft <= 2) return "High";
  if (daysLeft <= 7) return "Medium";
  return "Low";
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "Critical": return "priority-critical";
    case "Expired": return "priority-expired";
    case "High": return "priority-high";
    case "Medium": return "priority-medium";
    case "Low": return "priority-low";
    default: return "priority-medium";
  }
}

export function getPriorityOrder(priority: string): number {
  const order: Record<string, number> = { Expired: 0, Critical: 1, High: 2, Medium: 3, Low: 4 };
  return order[priority] ?? 3;
}
