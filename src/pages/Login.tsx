import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Mail, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const getRoleRedirect = (roles: string[]) => {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("faculty")) return "/faculty";
  return "/dashboard";
};

const Login = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading, roles } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(getRoleRedirect(roles), { replace: true });
    }
  }, [isAuthenticated, loading, navigate, roles]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate(getRoleRedirect(roles));
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        <div className="relative z-10 text-primary-foreground px-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold">BackLog</h1>
          </div>
          <h2 className="text-4xl font-display font-bold leading-tight mb-4">AI-Powered Academic Task Intelligence</h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">Convert messy academic messages into organized, prioritized tasks automatically using AI.</p>
          <div className="mt-10 space-y-4">
            {["Smart task extraction from any message", "Automatic deadline detection", "AI-powered priority scoring"].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/90">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-primary-foreground/5" />
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary-foreground/5" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">BackLog</h1>
          </div>

          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to manage your academic tasks</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="student@university.edu" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button className="text-primary font-medium hover:underline" onClick={() => navigate("/signup")}>Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
