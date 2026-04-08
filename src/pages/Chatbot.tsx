import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { taskService } from "@/services/taskService";
import { taskExtractionService, ExtractedTaskData } from "@/services/taskExtractionService";
import { calculateDynamicPriority } from "@/utils/priorityEngine";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tasks?: (ExtractedTaskData & { priority: string; saved?: boolean })[];
  timestamp: Date;
}

const SUGGESTIONS = [
  "Submit AIML Assignment 3 before April 10",
  "DBMS record submission tomorrow",
  "Hackathon registration closes April 25",
  "Physics lab report due next Monday",
  "Team meeting for project review on Friday at 3 PM",
];

const Chatbot = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your BackLog assistant 🤖 Just type or paste any academic message, and I'll extract tasks automatically. Try something like:\n\n\"Submit AIML Assignment 3 before April 10. Lab records due by April 18.\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  let msgCounter = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || processing) return;

    const userMsg: ChatMessage = {
      id: `msg-${msgCounter.current++}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setProcessing(true);

    try {
      const extracted = await taskExtractionService.extractFromText(text);
      const tasksWithPriority = extracted.map((t) => ({
        ...t,
        priority: calculateDynamicPriority(t.deadline),
        saved: false,
      }));

      const assistantMsg: ChatMessage = {
        id: `msg-${msgCounter.current++}`,
        role: "assistant",
        content: extracted.length > 0
          ? `I found ${extracted.length} task${extracted.length > 1 ? "s" : ""} in your message. Review and save them below:`
          : "I couldn't detect any specific tasks or deadlines in that message. Try including a clear task name and date, like \"Submit report by April 15.\"",
        tasks: tasksWithPriority.length > 0 ? tasksWithPriority : undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${msgCounter.current++}`,
          role: "assistant",
          content: `Sorry, something went wrong: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    }
    setProcessing(false);
  };

  const saveTask = async (msgId: string, taskIndex: number) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.tasks?.[taskIndex]) return;
    const t = msg.tasks[taskIndex];

    try {
      await taskService.create({
        title: t.title,
        description: t.notes || null,
        priority: t.priority as any,
        deadline: t.deadline || null,
        category: t.workType,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, tasks: m.tasks?.map((task, i) => (i === taskIndex ? { ...task, saved: true } : task)) }
            : m
        )
      );
      toast({ title: "Task saved!", description: `"${t.title}" added to dashboard.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const priorityColors: Record<string, string> = {
    Critical: "bg-[hsl(var(--priority-critical))]/10 text-[hsl(var(--priority-critical))] border-[hsl(var(--priority-critical))]/30",
    High: "bg-[hsl(var(--priority-high))]/10 text-[hsl(var(--priority-high))] border-[hsl(var(--priority-high))]/30",
    Medium: "bg-[hsl(var(--priority-medium))]/10 text-[hsl(var(--priority-medium))] border-[hsl(var(--priority-medium))]/30",
    Low: "bg-[hsl(var(--priority-low))]/10 text-[hsl(var(--priority-low))] border-[hsl(var(--priority-low))]/30",
    Expired: "bg-muted text-muted-foreground border-border",
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
          <div className="mb-4">
            <h1 className="text-3xl font-display font-bold text-foreground">AI Assistant</h1>
            <p className="mt-1 text-muted-foreground">Chat to create tasks from natural language</p>
          </div>

          {/* Chat area */}
          <Card className="glass-card flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-3 ${msg.role === "user" ? "order-first" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      {msg.content}
                    </div>
                    {msg.tasks && msg.tasks.length > 0 && (
                      <div className="space-y-2">
                        {msg.tasks.map((task, i) => (
                          <Card key={i} className="p-3 border border-border space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{task.title}</p>
                              <Badge variant="outline" className={`text-xs ${priorityColors[task.priority] || ""}`}>
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">{task.workType}</Badge>
                              {task.deadline && (
                                <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={task.saved ? "secondary" : "default"}
                              className="w-full gap-2"
                              disabled={task.saved}
                              onClick={() => saveTask(msg.id, i)}
                            >
                              {task.saved ? (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
                              ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Save to Dashboard</>
                              )}
                            </Button>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-accent-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {processing && (
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Try these:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message like 'Submit DBMS record tomorrow'..."
                  className="flex-1"
                  disabled={processing}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || processing}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Chatbot;
