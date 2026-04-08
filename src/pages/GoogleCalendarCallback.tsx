// ============================================================
// src/pages/GoogleCalendarCallback.tsx
// Google redirects to /calendar-callback after OAuth consent.
// This page reads ?success=true&userId=... (or ?error=...)
// and stores the connection state in localStorage.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const GoogleCalendarCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const success = params.get("success");
    const error   = params.get("error");
    const userId  = params.get("userId");

    if (success === "true") {
      // Persist connection state — both keys for compat
      if (userId) {
        localStorage.setItem("gcal_user_id", userId);
        localStorage.setItem("google_user_id", userId);
      }
      localStorage.setItem("gcal_connected", "true");
      localStorage.setItem("google_connected", "true");
      setStatus("success");

      // Auto-redirect to dashboard after 2 seconds
      const timer = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(timer);
    } else {
      setErrorMessage(
        error === "token_exchange_failed"
          ? "Token exchange with Google failed. Check your OAuth credentials."
          : error === "no_code"
          ? "No authorization code received. Please try again."
          : error || "An unknown error occurred."
      );
      setStatus("error");
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-10 rounded-2xl text-center max-w-sm w-full space-y-5 shadow-lg">

        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-foreground font-medium">Connecting Google Calendar…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
            <h2 className="text-xl font-bold text-foreground">Google Account Connected!</h2>
            <p className="text-muted-foreground text-sm">
              Calendar sync and Gmail task extraction are now active.
            </p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
            <Button
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-destructive" />
            <h2 className="text-xl font-bold text-foreground">Connection Failed</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
              <Button
                className="flex-1"
                onClick={() => window.history.back()}
              >
                Try Again
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
