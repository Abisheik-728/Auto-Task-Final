import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Coffee, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsService, StudySession } from "@/services/analyticsService";

const MODES = {
  focus: { label: "Focus", duration: 25 * 60, color: "text-primary" },
  shortBreak: { label: "Short Break", duration: 5 * 60, color: "text-priority-low" },
  longBreak: { label: "Long Break", duration: 15 * 60, color: "text-priority-medium" },
};

type Mode = keyof typeof MODES;

const PomodoroTimer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [subject, setSubject] = useState("");
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    analyticsService.getStudySessions(5).then(setRecentSessions).catch(() => {});
  }, [user, sessions]);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timeLeft]);

  const handleComplete = async () => {
    setRunning(false);
    if (mode === "focus") {
      setSessions((s) => s + 1);
      if (user) {
        await analyticsService.createStudySession({
          durationMinutes: 25,
          sessionType: "pomodoro",
          subject: subject || null,
        });
      }
      toast({ title: "Focus session complete! 🎉", description: "Time for a break." });
      const nextMode = (sessions + 1) % 4 === 0 ? "longBreak" : "shortBreak";
      setMode(nextMode);
      setTimeLeft(MODES[nextMode].duration);
    } else {
      toast({ title: "Break's over!", description: "Ready to focus again?" });
      setMode("focus");
      setTimeLeft(MODES.focus.duration);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setTimeLeft(MODES[m].duration);
    setRunning(false);
  };

  const reset = () => {
    setTimeLeft(MODES[mode].duration);
    setRunning(false);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / MODES[mode].duration;

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-8 max-w-lg mx-auto text-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pomodoro Timer</h1>
          <p className="mt-1 text-muted-foreground">Stay focused with timed study sessions</p>
        </div>

        <div className="flex justify-center gap-2">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => switchMode(m)}>
              {m === "focus" ? "Focus" : m === "shortBreak" ? "Short Break" : "Long Break"}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-xs mx-auto">
          <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What are you studying?"
            className="text-center text-sm"
            disabled={running}
          />
        </div>

        <Card className="glass-card p-10">
          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                strokeDasharray={`${progress * 283} 283`} strokeLinecap="round"
                className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-display font-bold ${MODES[mode].color}`}>
                {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
              </span>
              <span className="text-sm text-muted-foreground mt-2">{MODES[mode].label}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={() => setRunning(!running)} className="gap-2 w-32">
              {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
            </Button>
            <Button size="lg" variant="outline" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Coffee className="w-4 h-4" />
          <span className="text-sm">{sessions} sessions completed today</span>
        </div>

        {recentSessions.length > 0 && (
          <Card className="glass-card p-4 text-left">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.subject || "General"}</span>
                  <span className="text-muted-foreground text-xs">{s.durationMinutes}min · {new Date(s.startedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      </PageTransition>
    </AppLayout>
  );
};

export default PomodoroTimer;
