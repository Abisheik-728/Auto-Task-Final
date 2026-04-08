import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Loader2,
  LogOut,
} from "lucide-react";

const WA_SOCKET_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || "http://localhost:3004";

type Status = "disconnected" | "initializing" | "qr" | "authenticated" | "connected";

interface ExtractedTask {
  title: string;
  deadline: string | null;
  group: string;
}

// ── Pretty labels ──────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; pulse: boolean }> = {
  disconnected: { label: "Not Connected",   color: "bg-red-500/15 text-red-400 border-red-500/30",    pulse: false },
  initializing: { label: "Starting…",       color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", pulse: true  },
  qr:           { label: "Scan QR Code",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",   pulse: true  },
  authenticated:{ label: "Authenticating…", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", pulse: true },
  connected:    { label: "Connected ✅",    color: "bg-green-500/15 text-green-400 border-green-500/30",  pulse: false },
};

export default function WhatsAppConnect() {
  const socketRef                   = useRef<Socket | null>(null);
  const [status, setStatus]         = useState<Status>("disconnected");
  const [qrData, setQrData]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [tasks, setTasks]           = useState<ExtractedTask[]>([]);
  const [socketReady, setSocketReady] = useState(false);

  // ── Connect to Socket.io once ────────────────────────────────
  useEffect(() => {
    const socket = io(WA_SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect",    () => { setSocketReady(true); setError(null); });
    socket.on("disconnect", () => setSocketReady(false));
    socket.on("connect_error", () => setError("Cannot reach WhatsApp bot server (port 3002). Make sure it is running."));

    socket.on("wa:status",    ({ status }: { status: Status }) => { setStatus(status); if (status !== "qr") setQrData(null); });
    socket.on("wa:qr",        (qr: string)  => { setQrData(qr); setStatus("qr"); });
    socket.on("wa:connected", ()            => { setStatus("connected"); setQrData(null); });
    socket.on("wa:error",     ({ message }: { message: string }) => setError(message));
    socket.on("wa:task",      (task: ExtractedTask) => setTasks(prev => [task, ...prev].slice(0, 20)));

    return () => { socket.disconnect(); };
  }, []);

  // ── Actions ──────────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    setError(null);
    setQrData(null);
    socketRef.current?.emit("wa:start");
    setStatus("initializing");
  }, []);

  const handleDisconnect = useCallback(() => {
    socketRef.current?.emit("wa:disconnect");
    setQrData(null);
    setStatus("disconnected");
  }, []);

  const handleReconnect = useCallback(() => {
    setQrData(null);
    setError(null);
    socketRef.current?.emit("wa:start");
    setStatus("initializing");
  }, []);

  const cfg = STATUS_CONFIG[status];

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Connect WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Auto-extract academic tasks from your group chats
              </p>
            </div>
          </div>

          {/* Server status banner */}
          {!socketReady && (
            <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Connecting to WhatsApp bot server… Make sure <code className="mx-1 px-1 rounded bg-black/30">node index.js</code> is running in <code className="px-1 rounded bg-black/30">whatsapp-bot/</code>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Main card */}
          <Card className="glass-card p-8">
            {/* Status badge */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-muted-foreground">Connection Status</span>
              <Badge className={`border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                {cfg.pulse && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                {cfg.label}
              </Badge>
            </div>

            {/* ── DISCONNECTED: show connect button ── */}
            {status === "disconnected" && (
              <div className="flex flex-col items-center gap-6 py-10">
                <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
                  <WifiOff className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">WhatsApp is not connected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click below to generate a QR code. Scan it with your phone to link your account.
                  </p>
                </div>
                <Button
                  id="wa-connect-btn"
                  onClick={handleConnect}
                  disabled={!socketReady}
                  className="bg-green-600 hover:bg-green-500 text-white gap-2 px-8 py-5 text-base"
                >
                  <Smartphone className="w-5 h-5" />
                  Connect WhatsApp
                </Button>
              </div>
            )}

            {/* ── INITIALIZING ── */}
            {status === "initializing" && (
              <div className="flex flex-col items-center gap-6 py-10">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-foreground font-medium">Starting WhatsApp client…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This may take up to 30 seconds while Chromium launches.
                  </p>
                </div>
              </div>
            )}

            {/* ── QR CODE ── */}
            {status === "qr" && qrData && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <p className="font-semibold text-foreground text-lg">Scan this QR code</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong>
                  </p>
                </div>

                {/* QR box with glowing border */}
                <div className="relative p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.25)] border-4 border-green-400">
                  <QRCodeSVG
                    value={qrData}
                    size={220}
                    level="M"
                    includeMargin={false}
                  />
                  {/* Animated corner accents */}
                  <span className="absolute top-1 left-1  w-5 h-5 border-t-2 border-l-2 border-green-400 rounded-tl" />
                  <span className="absolute top-1 right-1 w-5 h-5 border-t-2 border-r-2 border-green-400 rounded-tr" />
                  <span className="absolute bottom-1 left-1  w-5 h-5 border-b-2 border-l-2 border-green-400 rounded-bl" />
                  <span className="absolute bottom-1 right-1 w-5 h-5 border-b-2 border-r-2 border-green-400 rounded-br" />
                </div>

                <p className="text-xs text-muted-foreground">
                  QR code expires in ~60 seconds — it will refresh automatically
                </p>

                <Button variant="ghost" size="sm" onClick={handleReconnect} className="gap-1.5 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate QR
                </Button>
              </div>
            )}

            {/* ── AUTHENTICATING ── */}
            {status === "authenticated" && (
              <div className="flex flex-col items-center gap-6 py-10">
                <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                <p className="text-foreground font-medium">Authenticating your account…</p>
              </div>
            )}

            {/* ── CONNECTED ── */}
            {status === "connected" && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-green-400">WhatsApp Connected ✅</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Monitoring all group chats. Academic tasks are extracted automatically.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleReconnect}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-red-400 hover:text-red-300"
                    onClick={handleDisconnect}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Disconnect
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Instructions */}
          <Card className="glass-card p-6">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Wifi className="w-4 h-4 text-primary" /> How It Works
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Click <strong className="text-foreground">Connect WhatsApp</strong> to generate a QR code.</li>
              <li>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.</li>
              <li>Scan the QR code — your account links instantly.</li>
              <li>The bot silently monitors all group chats for academic messages.</li>
              <li>Detected tasks (assignments, deadlines, exams…) are saved to your dashboard automatically.</li>
              <li>Your session is remembered — you won't need to scan again unless you log out.</li>
            </ol>
          </Card>

          {/* Live task feed */}
          {tasks.length > 0 && (
            <Card className="glass-card p-6">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-primary" /> Recently Extracted Tasks
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {tasks.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.group}{t.deadline ? ` · Due ${t.deadline}` : ""}
                      </p>
                    </div>
                    {t.deadline && (
                      <Badge variant="secondary" className="text-xs shrink-0">{t.deadline}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
