// ============================================================
// src/components/GoogleCalendarConnect.tsx
// Drop this anywhere to show the Connect / Disconnect button.
// Props:
//   onConnected?  – called after successful OAuth
//   onDisconnected? – called after disconnect
//   showCreateDemo? – show a demo "Create Event" button when connected
// ============================================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Link2,
  Link2Off,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { googleCalendarService } from "@/services/googleCalendarService";

interface Props {
  onConnected?: () => void;
  onDisconnected?: () => void;
  /** If true, shows a small demo button to test event creation */
  showCreateDemo?: boolean;
}

const GoogleCalendarConnect = ({
  onConnected,
  onDisconnected,
  showCreateDemo = false,
}: Props) => {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await googleCalendarService.isConnected();
        setConnected(status);
      } catch {
        /* backend may not be running yet — stay disconnected */
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await googleCalendarService.startOAuth();
      // Page redirects to Google — no code runs after this
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await googleCalendarService.disconnect();
      setConnected(false);
      onDisconnected?.();
      toast({ title: "Disconnected", description: "Google Calendar unlinked." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemo = async () => {
    setCreating(true);
    try {
      const result = await googleCalendarService.createEvent(
        "Test Task from BackLog",
        new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
      );
      toast({
        title: "Event created! 🎉",
        description: (
          <a
            href={result.eventLink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1"
          >
            Open in Google Calendar <ExternalLink className="w-3 h-3" />
          </a>
        ),
      });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (checking) {
    return (
      <Button variant="outline" disabled size="sm" className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking…
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {connected ? (
        <>
          <Badge
            variant="secondary"
            className="gap-1.5 text-green-600 border-green-500/30 bg-green-500/10 px-3 py-1"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Google Calendar Connected
          </Badge>

          {showCreateDemo && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleCreateDemo}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarDays className="w-4 h-4" />
              )}
              Create Test Event
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2Off className="w-4 h-4" />
            )}
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={handleConnect}
          disabled={loading}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          id="connect-google-calendar-btn"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          Connect Google Calendar
        </Button>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;
