import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, CheckCircle2, Calendar, AlertTriangle, Loader2, Plus, Check,
  ImagePlus, FileText, Mail, MessageSquare, Upload, X, Clock, Zap,
  Smartphone, Wifi, WifiOff, RefreshCw, LogOut, AlertCircle, BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { taskService } from "@/services/taskService";
import { taskExtractionService, ExtractedTaskData } from "@/services/taskExtractionService";
import { googleService, GmailTask } from "@/services/googleService";
import { calculateDynamicPriority, getPriorityColor } from "@/utils/priorityEngine";
import { motion, AnimatePresence } from "framer-motion";

interface ExtractedTask extends ExtractedTaskData {
  priority: string;
  saved?: boolean;
}

const priorityConfig: Record<string, { className: string; icon: typeof AlertTriangle }> = {
  Critical: { className: "priority-critical", icon: Zap },
  Expired: { className: "priority-expired", icon: Clock },
  High: { className: "priority-high", icon: AlertTriangle },
  Medium: { className: "priority-medium", icon: AlertTriangle },
  Low: { className: "priority-low", icon: CheckCircle2 },
};

const TaskGenerator = () => {
  const [message, setMessage] = useState("");
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("text");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gmailTasks, setGmailTasks] = useState<GmailTask[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [fetchingGmail, setFetchingGmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // ── WhatsApp Socket state ──────────────────────────────────
  type WaStatus = "disconnected" | "initializing" | "qr" | "authenticated" | "connected";
  const socketRef = useRef<Socket | null>(null);
  const [waStatus, setWaStatus] = useState<WaStatus>("disconnected");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [waSocketReady, setWaSocketReady] = useState(false);
  const [waTasks, setWaTasks] = useState<Array<{ title: string; deadline: string | null; group: string }>>([]);

  // Check connection status when Gmail tab is selected
  useEffect(() => {
    if (activeTab === "gmail") {
      (async () => {
        try {
          const status = await googleService.isConnected();
          setGoogleConnected(status);
          if (status) fetchGmailTasks();
        } catch {
          setGoogleConnected(false);
        }
      })();
    }
  }, [activeTab]);

  // ── WhatsApp socket lifecycle (connect on first visit to tab) ─
  useEffect(() => {
    if (activeTab !== "whatsapp") return;
    if (socketRef.current) return; // already created

    const socket = io(import.meta.env.VITE_WHATSAPP_SERVER_URL || "http://localhost:3004", { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => { setWaSocketReady(true); setWaError(null); });
    socket.on("disconnect", () => setWaSocketReady(false));
    socket.on("connect_error", () =>
      setWaError("Cannot reach WhatsApp bot (port 3004). Run: cd whatsapp-bot && node index.js")
    );
    socket.on("wa:status", ({ status }: { status: WaStatus }) => {
      setWaStatus(status);
      if (status !== "qr") setWaQr(null);
    });
    socket.on("wa:qr", (qr: string) => { setWaQr(qr); setWaStatus("qr"); });
    socket.on("wa:connected", () => { setWaStatus("connected"); setWaQr(null); });
    socket.on("wa:error", ({ message }: { message: string }) => setWaError(message));
    socket.on("wa:task", (t: { title: string; deadline: string | null; group: string }) =>
      setWaTasks(prev => [t, ...prev].slice(0, 15))
    );

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [activeTab]);

  const handleWaConnect = useCallback(() => {
    setWaError(null);
    setWaQr(null);
    socketRef.current?.emit("wa:start");
    setWaStatus("initializing");
  }, []);

  const handleWaDisconnect = useCallback(() => {
    socketRef.current?.emit("wa:disconnect");
    setWaQr(null);
    setWaStatus("disconnected");
  }, []);

  const handleWaReconnect = useCallback(() => {
    setWaQr(null);
    setWaError(null);
    socketRef.current?.emit("wa:start");
    setWaStatus("initializing");
  }, []);

  const fetchGmailTasks = async () => {
    setFetchingGmail(true);
    try {
      const data = await googleService.getGmailTasks();
      setGmailTasks(data);
      if (data.length === 0) {
        toast({ title: "No tasks found", description: "Your last 10 emails don't seem to have academic tasks." });
      } else {
        toast({ title: `${data.length} task(s) found!`, description: "Review and import them below." });
      }
    } catch (err: any) {
      const msg = err.message || "";
      // If backend says we need to re-authenticate (scope missing or token expired)
      if (err.needsReauth || msg.includes("reconnect") || msg.includes("expired") || msg.includes("not connected") || msg.includes("not granted")) {
        // Auto-disconnect the stale session
        await googleService.disconnect().catch(() => {});
        setGoogleConnected(false);
        toast({
          title: "Gmail Permission Required",
          description: "Your previous login didn't include Gmail access. Please click 'Connect Gmail Account' to re-authorize with full permissions.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Gmail Fetch Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setFetchingGmail(false);
    }
  };

  const handleConnectGmail = async () => {
    // Disconnect any stale session first, then start fresh OAuth with all scopes
    await googleService.disconnect().catch(() => {});
    googleService.startAuth();
  };

  const handleImportGmailTask = async (task: GmailTask) => {
    if (!user) return;
    setLoading(true);
    try {
      await taskService.create({
        title: task.title,
        description: `Imported from email: ${task.emailSubject}`,
        priority: calculateDynamicPriority(task.deadline) as any,
        deadline: task.deadline,
        category: "Assignment",
      });
      setGmailTasks(prev => prev.filter(t => t !== task));
      toast({ title: "Task Imported!", description: `"${task.title}" added to your dashboard.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processExtracted = (extracted: ExtractedTaskData[]): ExtractedTask[] => {
    return extracted.map((t) => ({
      ...t,
      priority: calculateDynamicPriority(t.deadline),
      saved: false,
    }));
  };

  const handleTextExtract = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setTasks([]);
    try {
      const extracted = await taskExtractionService.extractFromText(message);
      const processed = processExtracted(extracted);
      setTasks(processed);
      if (processed.length === 0) {
        toast({ title: "No tasks found", description: "Try a message with clearer deadlines or assignments." });
      } else {
        toast({ title: `${processed.length} task(s) extracted`, description: "Review and save them below." });
      }
    } catch (err: any) {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageExtract = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setTasks([]);
    try {
      const extracted = await taskExtractionService.extractFromImage(selectedImage);
      const processed = processExtracted(extracted);
      setTasks(processed);
      toast({ title: `${processed.length} task(s) extracted from image`, description: "Review and save them below." });
    } catch (err: any) {
      toast({ title: "Image extraction failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveTask = async (index: number) => {
    if (!user) return;
    const t = tasks[index];
    setSavingIndex(index);
    try {
      await taskService.create({
        title: t.title,
        description: t.notes || null,
        priority: t.priority as any,
        deadline: t.deadline || null,
        category: t.workType,
      });
      setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, saved: true } : task)));
      toast({ title: "Task saved!", description: `"${t.title}" added to your dashboard.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingIndex(null);
    }
  };

  const saveAll = async () => {
    if (!user) return;
    const unsaved = tasks.filter((t) => !t.saved);
    if (unsaved.length === 0) return;
    setSavingIndex(-1);
    try {
      for (const t of unsaved) {
        await taskService.create({
          title: t.title,
          description: t.notes || null,
          priority: t.priority as any,
          deadline: t.deadline || null,
          category: t.workType,
        });
      }
      setTasks((prev) => prev.map((t) => ({ ...t, saved: true })));
      toast({ title: "All tasks saved!", description: `${unsaved.length} task(s) added to your dashboard.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingIndex(null);
    }
  };

  const pipelineSteps = activeTab === "image"
    ? ["Image Upload", "OCR Processing", "Text Analysis", "Task Extraction", "Priority Scoring", "Display"]
    : ["Text Input", "NLP Analysis", "Entity Detection", "Task Extraction", "Priority Scoring", "Display"];

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">AI Task Generator</h1>
            <p className="mt-1 text-muted-foreground">
              Extract tasks from text, images, or messages automatically
            </p>
          </div>

          <Card className="glass-card p-6 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" /> Text
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImagePlus className="w-4 h-4" /> Image
                </TabsTrigger>
                <TabsTrigger value="gmail" className="gap-2">
                  <Mail className="w-4 h-4" /> Gmail
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-2">
                  <Smartphone className="w-4 h-4" /> WhatsApp
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <Textarea
                  placeholder='Paste academic message here (e.g., "Submit AIML Assignment 3 before April 10. Lab records due by April 18. Hackathon registration closes April 25.")'
                  className="min-h-[140px] resize-none text-base"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button onClick={handleTextExtract} disabled={loading || !message.trim()} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? "Extracting..." : "Extract Tasks"}
                </Button>
              </TabsContent>

              <TabsContent value="image" className="space-y-4 mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Uploaded" className="max-h-60 rounded-lg border border-border object-contain w-full bg-muted" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearImage}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[160px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Upload className="w-10 h-10" />
                    <span className="text-sm font-medium">Click to upload an image</span>
                    <span className="text-xs">Assignment screenshots, event posters, notices</span>
                  </button>
                )}
                <Button onClick={handleImageExtract} disabled={loading || !selectedImage} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? "Processing Image..." : "Extract from Image"}
                </Button>
              </TabsContent>

              <TabsContent value="gmail" className="space-y-4 mt-4">
                {!googleConnected ? (
                  <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed border-border/50">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-primary/40" />
                    <h3 className="text-lg font-semibold mb-2">Extract tasks from Gmail</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                      Connect your academic Gmail account to automatically identify assignments, deadlines, and exam schedules from your inbox.
                    </p>
                    <Button onClick={handleConnectGmail} className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Zap className="w-4 h-4" /> Connect Gmail Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Connected</Badge>
                        <span className="text-xs text-muted-foreground">Scanning all of today's emails</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={fetchGmailTasks} disabled={fetchingGmail}>
                        <Clock className={`w-4 h-4 mr-2 ${fetchingGmail ? "animate-spin" : ""}`} />
                        Refresh Inbox
                      </Button>
                    </div>

                    {fetchingGmail ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-3 text-sm text-muted-foreground">Reading emails & extracting tasks...</span>
                      </div>
                    ) : gmailTasks.length > 0 ? (
                      <div className="flex flex-col gap-3 w-full">
                        {gmailTasks.map((task, i) => (
                          <div
                            key={i}
                            className="w-full rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 border-l-4 border-l-primary/70 hover:shadow-lg hover:border-l-primary transition-all duration-200"
                            style={{ overflow: "hidden" }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              {/* Left: Task info */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p
                                  className="text-sm font-semibold text-foreground leading-snug mb-1.5"
                                  style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {task.deadline && (
                                    <span className="inline-flex items-center gap-1 bg-primary/5 text-primary rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                                      <Calendar className="w-3 h-3 shrink-0" />
                                      {task.deadline}
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center gap-1 whitespace-nowrap"
                                    style={{
                                      maxWidth: "220px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={task.emailSubject}
                                  >
                                    <Mail className="w-3 h-3 shrink-0 opacity-50" />
                                    {task.emailSubject}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Import button */}
                              <div className="shrink-0 self-start sm:self-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleImportGmailTask(task)}
                                  disabled={loading}
                                  className="whitespace-nowrap rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 transition-all duration-200 gap-1.5 h-9 px-4"
                                >
                                  <Plus className="w-4 h-4" />
                                  Import
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-muted/20 rounded-lg">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No academic tasks found in your latest emails.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-4 space-y-6">
                {/* ── Status Header ── */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${waSocketReady ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {waSocketReady ? "Bot Online" : "Bot Offline"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0">
                    STATUS: {waStatus.toUpperCase()}
                  </Badge>
                </div>

                {/* Server offline warning */}
                {!waSocketReady && (
                  <div className="flex flex-col items-center justify-center py-6 bg-red-500/5 border border-red-500/20 rounded-xl gap-3">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-red-500">WhatsApp Engine Unreachable</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please run: <code className="bg-black/20 px-1.5 py-0.5 rounded text-red-400">cd whatsapp-bot && node index.js</code>
                      </p>
                    </div>
                  </div>
                )}

                {waSocketReady && (
                  <div className="space-y-6">
                    {/* ── Error State ── */}
                    {waError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{waError}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setWaError(null); handleWaConnect(); }}
                          className="ml-auto h-7 text-[10px] border border-red-500/30 hover:bg-red-500/20"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {/* ── Disconnected ── */}
                    {waStatus === "disconnected" && (
                      <div className="flex flex-col items-center gap-4 py-8 bg-muted/20 rounded-xl border border-dashed border-border/50">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
                          <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">Sync WhatsApp Messages</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs text-balance">
                            Connect your account to automatically identify tasks from group chats and class messages.
                          </p>
                        </div>
                        <Button
                          onClick={handleWaConnect}
                          className="bg-green-600 hover:bg-green-500 text-white font-medium px-6"
                        >
                          <Smartphone className="w-4 h-4 mr-2" /> Connect WhatsApp
                        </Button>
                      </div>
                    )}

                    {/* ── Initializing / Authenticating ── */}
                    {(waStatus === "initializing" || waStatus === "authenticated") && (
                      <div className="flex flex-col items-center gap-4 py-12">
                        <div className="relative">
                          <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                          <Smartphone className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold capitalize">{waStatus}...</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            This may take up to 30 seconds to spin up the session.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── QR Code ── */}
                    {waStatus === "qr" && (
                      <div className="flex flex-col items-center gap-6 py-4">
                        <div className="text-center space-y-1">
                          <h3 className="font-semibold text-foreground">Link Your Account</h3>
                          <p className="text-xs text-muted-foreground">
                            Open WhatsApp → <span className="font-medium text-foreground">Linked Devices</span> → Link a Device
                          </p>
                        </div>
                        
                        <div className="relative group">
                          <div className="absolute -inset-2 bg-green-500/20 rounded-2xl blur-lg group-hover:bg-green-500/30 transition-all opacity-70" />
                          <div className="relative p-6 bg-white rounded-2xl shadow-xl border-4 border-green-500/60 transition-transform hover:scale-105">
                            {waQr ? (
                              <QRCodeSVG value={waQr} size={200} level="H" includeMargin />
                            ) : (
                              <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 border border-slate-100 rounded">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                              </div>
                            )}
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleWaReconnect} 
                          className="h-8 text-xs gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Refresh QR Code
                        </Button>
                      </div>
                    )}

                    {/* ── Connected ── */}
                    {waStatus === "connected" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-xl overflow-hidden relative">
                          <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/5 rounded-full blur-3xl -mr-12 -mt-12" />
                          
                          <div className="flex items-center gap-3 relative">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shadow-inner">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-green-600 tracking-tight">WHATSAPP ACTIVE</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-medium">Monitoring your chats in real-time</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 relative">
                            <Button variant="outline" size="sm" onClick={handleWaDisconnect} className="h-8 text-[11px] font-bold border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all px-3">
                              <LogOut className="w-3.5 h-3.5 mr-1" /> STOP
                            </Button>
                          </div>
                        </div>

                        {/* Live task feed */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Incoming Stream
                            </p>
                            {waTasks.length > 0 && (
                              <button onClick={() => setWaTasks([])} className="text-[10px] text-muted-foreground hover:text-primary underline">Clear</button>
                            )}
                          </div>
                          
                          {waTasks.length > 0 ? (
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 subtle-scrollbar">
                              <AnimatePresence initial={false}>
                                {waTasks.map((t, i) => (
                                  <motion.div 
                                    key={`${t.title}-${i}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="group flex flex-col gap-1.5 p-3.5 rounded-xl bg-card border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-default"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{t.title}</p>
                                      {t.deadline && (
                                        <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 border-primary/20 text-primary">
                                          {t.deadline}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between items-center mt-1">
                                      <div className="flex items-center gap-1.5 opacity-60">
                                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t.group || "WhatsApp"}</span>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                         // Auto-fill the text tab with this content if they want to edit
                                         setActiveTab("text");
                                         setMessage(t.title);
                                      }}>
                                        <Sparkles className="w-3 h-3 text-primary" />
                                      </Button>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 bg-muted/10 rounded-xl border border-dashed border-border/40">
                              <Wifi className="w-10 h-10 text-muted-foreground/20 mb-3" />
                              <p className="text-xs font-medium text-muted-foreground px-10 text-center">
                                No tasks detected yet. Send a message like "Submit Assignment 1 next Friday" to test!
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Pipeline visualization */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            {pipelineSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full border transition-colors ${tasks.length > 0 ? "bg-accent text-accent-foreground border-primary/20" : loading ? "bg-muted/80 border-border animate-pulse" : "bg-muted border-border"}`}>
                  {step}
                </span>
                {i < pipelineSteps.length - 1 && <span className="text-border">→</span>}
              </div>
            ))}
          </div>

          {/* Extracted Tasks */}
          <AnimatePresence>
            {tasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-semibold text-foreground">Extracted Tasks</h2>
                  {tasks.some((t) => !t.saved) && (
                    <Button onClick={saveAll} disabled={savingIndex !== null} size="sm" className="gap-2">
                      {savingIndex === -1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save All to Dashboard
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tasks.map((t, i) => {
                    const config = priorityConfig[t.priority] || priorityConfig.Medium;
                    const PIcon = config.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Card className="glass-card p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground text-sm leading-snug">{t.title}</h3>
                            <Badge variant="secondary" className={config.className + " text-xs font-semibold px-2 py-0.5 shrink-0"}>
                              <PIcon className="w-3 h-3 mr-1" />
                              {t.priority}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs">{t.workType}</Badge>
                          {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {t.deadline
                              ? new Date(t.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                              : "No deadline"}
                          </div>
                          <Button
                            size="sm"
                            variant={t.saved ? "secondary" : "outline"}
                            className="w-full mt-2 gap-2"
                            disabled={t.saved || savingIndex !== null}
                            onClick={() => saveTask(i)}
                          >
                            {t.saved ? (
                              <><Check className="w-4 h-4" /> Saved</>
                            ) : savingIndex === i ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                              <><Plus className="w-4 h-4" /> Add to Dashboard</>
                            )}
                          </Button>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default TaskGenerator;
