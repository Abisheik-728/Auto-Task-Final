import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, ArrowLeft } from "lucide-react";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.resetPassword(email);
      setSent(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">BackLog</h1>
        </div>

        {sent ? (
          <div className="space-y-4">
            <h2 className="text-3xl font-display font-bold text-foreground">Check your email</h2>
            <p className="text-muted-foreground">We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>.</p>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">Forgot password?</h2>
              <p className="mt-2 text-muted-foreground">Enter your email and we'll send you a reset link</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="student@university.edu" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={submitting}>
                {submitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
