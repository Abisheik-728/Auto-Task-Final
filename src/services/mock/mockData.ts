// Demo data for testing without a backend


export const MOCK_USER = {
  id: "demo-user-001",
  email: "demo@backlog.app",
  fullName: "Demo Student",
  roles: ["student"],
};

export const MOCK_PROFILE = {
  id: "profile-001",
  userId: "demo-user-001",
  displayName: "Demo Student",
  avatarUrl: null,
  bio: "A demo account for testing BackLog features.",
};

export const MOCK_TASKS = [
  {
    id: "task-001",
    userId: "demo-user-001",
    title: "Complete Math Assignment",
    description: "Chapter 5 exercises 1-20",
    priority: "High" as const,
    status: "pending" as const,
    deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    category: "Math",
    tags: ["homework", "math"],
    completed: false,
    completedAt: null,
    parentTaskId: null,
    position: 0,
    reminderEnabled: true,
    notes: null,
    studentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-002",
    userId: "demo-user-001",
    title: "Read Physics Chapter 8",
    description: "Electromagnetic waves",
    priority: "Medium" as const,
    status: "in_progress" as const,
    deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    category: "Physics",
    tags: ["reading"],
    completed: false,
    completedAt: null,
    parentTaskId: null,
    position: 1,
    reminderEnabled: false,
    notes: "Focus on wave equations",
    studentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-003",
    userId: "demo-user-001",
    title: "Submit Lab Report",
    description: "Chemistry lab report on titration",
    priority: "High" as const,
    status: "completed" as const,
    deadline: new Date(Date.now() - 86400000).toISOString(),
    category: "Chemistry",
    tags: ["lab", "report"],
    completed: true,
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    parentTaskId: null,
    position: 2,
    reminderEnabled: false,
    notes: null,
    studentId: null,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_ASSIGNMENTS = [
  {
    id: "assign-001",
    title: "Linear Algebra Problem Set",
    description: "Solve problems from chapter 3",
    subject: "Mathematics",
    section: "Section A",
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: "pending",
    attachments: [],
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_RESOURCES = [
  {
    id: "res-001",
    title: "Calculus Lecture Notes",
    subject: "Mathematics",
    fileUrl: null,
    fileType: "PDF" as const,
    fileSize: 2048000,
    folder: "Math",
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "notif-001",
    title: "Assignment Due Soon",
    message: "Linear Algebra Problem Set is due in 3 days",
    type: "DEADLINE" as const,
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif-002",
    title: "New Announcement",
    message: "Class cancelled on Friday",
    type: "ANNOUNCEMENT" as const,
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_TIMETABLE = [
  {
    id: "tt-001",
    title: "Calculus II",
    entryType: "class",
    subject: "Mathematics",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:30",
    location: "Room 201",
    color: "#3b82f6",
  },
  {
    id: "tt-002",
    title: "Physics Lab",
    entryType: "lab",
    subject: "Physics",
    dayOfWeek: 3,
    startTime: "14:00",
    endTime: "16:00",
    location: "Science Building",
    color: "#10b981",
  },
];

export const MOCK_NOTES = [
  {
    id: "note-001",
    content: "Remember to review chapter 5 before the exam!",
    color: "#fbbf24",
    pinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "note-002",
    content: "Office hours: Tuesday 2-4 PM",
    color: "#f472b6",
    pinned: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_STUDY_SESSIONS = [
  {
    id: "ss-001",
    subject: "Mathematics",
    durationMinutes: 45,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    sessionType: "pomodoro",
  },
];

export const MOCK_PRODUCTIVITY = {
  totalTasks: 12,
  completedTasks: 8,
  pendingTasks: 4,
  studyHours: 24.5,
  weeklyCompletions: [
    { day: "Mon", completed: 2 },
    { day: "Tue", completed: 1 },
    { day: "Wed", completed: 3 },
    { day: "Thu", completed: 0 },
    { day: "Fri", completed: 2 },
    { day: "Sat", completed: 0 },
    { day: "Sun", completed: 0 },
  ],
  priorityDistribution: [
    { name: "High", value: 3 },
    { name: "Medium", value: 5 },
    { name: "Low", value: 4 },
  ],
  completionRate: 66.7,
};

export const MOCK_STUDY_HOURS = {
  totalHours: 24.5,
  weeklyHours: [
    { day: "Mon", hours: 4 },
    { day: "Tue", hours: 3.5 },
    { day: "Wed", hours: 5 },
    { day: "Thu", hours: 2 },
    { day: "Fri", hours: 4.5 },
    { day: "Sat", hours: 3 },
    { day: "Sun", hours: 2.5 },
  ],
  subjectBreakdown: [
    { subject: "Mathematics", hours: 8 },
    { subject: "Physics", hours: 6.5 },
    { subject: "Chemistry", hours: 5 },
    { subject: "English", hours: 5 },
  ],
};

export const MOCK_TASK_COMPLETION = {
  daily: [
    { date: "2026-03-30", completed: 2, total: 3 },
    { date: "2026-03-31", completed: 1, total: 2 },
    { date: "2026-04-01", completed: 3, total: 4 },
    { date: "2026-04-02", completed: 2, total: 3 },
    { date: "2026-04-03", completed: 0, total: 1 },
    { date: "2026-04-04", completed: 1, total: 2 },
    { date: "2026-04-05", completed: 0, total: 2 },
  ],
  weekly: [
    { week: "W13", completed: 8, total: 12 },
    { week: "W14", completed: 6, total: 10 },
  ],
  overallRate: 66.7,
};
